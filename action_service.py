import logging
import os
import secrets
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from decision_gate import (
    Decision,
    EvidenceSnapshot,
    PermitError,
    PermitRegistry,
    ProposedAction,
    Verdict,
    evaluate_action,
)
from github_evidence import GitHubEvidenceAdapter


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENCLAW_GATEWAY_URL = os.getenv("OPENCLAW_GATEWAY_URL", "http://localhost:18789")
OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY")
ACTION_APPROVAL_API_KEY = os.getenv("ACTION_APPROVAL_API_KEY")

app = FastAPI(title="Kristina Action Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ActionRequest(BaseModel):
    action: str
    target: str
    agent_id: str
    params: dict[str, Any] = Field(default_factory=dict)
    requires_approval: bool = False


class ActionResponse(BaseModel):
    status: str
    action_id: str
    message: str
    decision_id: str | None = None
    evidence_snapshot_id: str | None = None
    reason_code: str | None = None


class ApprovalRequest(BaseModel):
    approver: str = Field(min_length=1)


@dataclass(frozen=True)
class PendingAction:
    request: ActionRequest
    proposal: ProposedAction
    branch: str
    decision: Decision


audit_log: list[dict[str, Any]] = []
pending_actions: dict[str, PendingAction] = {}
github_evidence_adapter = GitHubEvidenceAdapter()
permit_registry = PermitRegistry()


def log_action(
    request: ActionRequest,
    status: str,
    result: str = "",
    *,
    action_id: str | None = None,
    decision: Decision | None = None,
) -> str:
    action_id = action_id or uuid.uuid4().hex[:8]
    entry = {
        "action_id": action_id,
        "agent_id": request.agent_id,
        "action": request.action,
        "target": request.target,
        "params": request.params,
        "timestamp": time.time(),
        "status": status,
        "result": result,
    }
    if decision is not None:
        entry.update(
            {
                "decision_id": decision.id,
                "evidence_snapshot_id": decision.evidence_snapshot_id,
                "reason_code": decision.reason_code,
            }
        )
    audit_log.append(entry)
    logger.info("AUDIT: %s", entry)
    return action_id


def _empty_snapshot() -> EvidenceSnapshot:
    return EvidenceSnapshot(
        id=uuid.uuid4().hex,
        claims=(),
        collected_at=datetime.now(timezone.utc),
    )


def _build_proposal(request: ActionRequest) -> tuple[ProposedAction, str]:
    repository = request.params.get("repository")
    branch = request.params.get("branch", "main")
    params = dict(request.params)
    params["branch"] = branch
    params["environment"] = request.target
    proposal = ProposedAction(
        action=request.action,
        target=repository if isinstance(repository, str) else "",
        agent_id=request.agent_id,
        params=params,
        requires_approval=request.requires_approval,
    )
    return proposal, branch if isinstance(branch, str) else ""


def _decision_response(action_id: str, decision: Decision) -> ActionResponse:
    return ActionResponse(
        status=decision.verdict.value,
        action_id=action_id,
        message=decision.explanation,
        decision_id=decision.id,
        evidence_snapshot_id=decision.evidence_snapshot_id,
        reason_code=decision.reason_code,
    )


async def _collect_and_evaluate(
    proposal: ProposedAction,
    branch: str,
) -> Decision:
    snapshot = await github_evidence_adapter.collect_deploy_evidence(
        repository_full_name=proposal.target,
        branch=branch,
        commit_sha=str(proposal.params["commit_sha"]),
    )
    return evaluate_action(proposal, snapshot)


def _authenticate_approver(authorization: str | None) -> None:
    if not ACTION_APPROVAL_API_KEY:
        raise HTTPException(status_code=503, detail="Action approval is not configured")
    scheme, _, credential = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not secrets.compare_digest(
        credential,
        ACTION_APPROVAL_API_KEY,
    ):
        raise HTTPException(status_code=401, detail="Invalid approval credentials")


async def execute_action_with_openclaw(action: str, target: str, params: dict[str, Any]) -> str:
    if not OPENCLAW_API_KEY:
        raise RuntimeError("OPENCLAW_API_KEY is not configured")

    tool = "agent.message"
    args: dict[str, Any] = {
        "message": f"Execute the following action: {action} on {target} with parameters {params}.",
        "session_key": f"action-{target}-{int(time.time())}",
    }

    if action == "deploy":
        tool = "agent.deploy"
        args = {"environment": target, "params": params}
    elif action == "browser.navigate":
        tool = "browser.navigate"
        args = {"url": params.get("url")}

    payload = {
        "tool": tool,
        "args": args,
        "sessionKey": f"action-session-{target}",
    }
    headers = {"Authorization": f"Bearer {OPENCLAW_API_KEY}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{OPENCLAW_GATEWAY_URL}/tools/invoke",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()

    data = response.json()
    if "result" in data:
        return str(data["result"])
    if "message" in data:
        return str(data["message"])
    return str(data)


@app.get("/api/actions/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "audit_count": len(audit_log)}


@app.get("/api/actions/audit")
async def get_audit_log(limit: int = 50) -> dict[str, list[dict[str, Any]]]:
    return {"logs": audit_log[-limit:]}


@app.post("/api/actions/execute", response_model=ActionResponse)
async def execute(request: ActionRequest) -> ActionResponse:
    action_id = uuid.uuid4().hex[:8]
    proposal, branch = _build_proposal(request)
    preflight = evaluate_action(proposal, _empty_snapshot())
    if preflight.reason_code != "evidence_missing":
        log_action(
            request,
            preflight.verdict.value,
            preflight.explanation,
            action_id=action_id,
            decision=preflight,
        )
        return _decision_response(action_id, preflight)

    decision = await _collect_and_evaluate(proposal, branch)
    if decision.verdict is not Verdict.PASS:
        log_action(
            request,
            decision.verdict.value,
            decision.explanation,
            action_id=action_id,
            decision=decision,
        )
        return _decision_response(action_id, decision)

    pending_actions[action_id] = PendingAction(
        request=request,
        proposal=proposal,
        branch=branch,
        decision=decision,
    )
    log_action(
        request,
        "pending_approval",
        "Evidence passed; awaiting human approval.",
        action_id=action_id,
        decision=decision,
    )
    return ActionResponse(
        status="pending_approval",
        action_id=action_id,
        message="Evidence passed; awaiting human approval.",
        decision_id=decision.id,
        evidence_snapshot_id=decision.evidence_snapshot_id,
        reason_code=decision.reason_code,
    )


@app.post("/api/actions/{action_id}/approve", response_model=ActionResponse)
async def approve(
    action_id: str,
    approval: ApprovalRequest,
    authorization: str | None = Header(default=None),
) -> ActionResponse:
    _authenticate_approver(authorization)
    pending = pending_actions.get(action_id)
    if pending is None:
        raise HTTPException(status_code=404, detail="Pending action not found")

    decision = await _collect_and_evaluate(pending.proposal, pending.branch)
    if decision.verdict is not Verdict.PASS:
        pending_actions.pop(action_id, None)
        log_action(
            pending.request,
            decision.verdict.value,
            decision.explanation,
            action_id=action_id,
            decision=decision,
        )
        return _decision_response(action_id, decision)

    claimed = pending_actions.pop(action_id, None)
    if claimed is not pending:
        raise HTTPException(status_code=409, detail="Action approval is already in progress")

    try:
        permit = permit_registry.issue(
            decision,
            pending.proposal,
            approved_by=approval.approver,
        )
        permit_registry.consume(permit.token, pending.proposal)
    except PermitError as exc:
        log_action(
            pending.request,
            "blocked",
            str(exc),
            action_id=action_id,
            decision=decision,
        )
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    try:
        result = await execute_action_with_openclaw(
            pending.request.action,
            pending.request.target,
            pending.request.params,
        )
    except RuntimeError as exc:
        log_action(pending.request, "failed", str(exc), action_id=action_id)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        log_action(pending.request, "failed", str(exc), action_id=action_id)
        raise HTTPException(status_code=502, detail="OpenClaw request failed") from exc

    log_action(
        pending.request,
        "executed",
        result,
        action_id=action_id,
        decision=decision,
    )
    return ActionResponse(
        status="executed",
        action_id=action_id,
        message=result,
        decision_id=decision.id,
        evidence_snapshot_id=decision.evidence_snapshot_id,
        reason_code=decision.reason_code,
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

import logging
import os
import time
import uuid
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENCLAW_GATEWAY_URL = os.getenv("OPENCLAW_GATEWAY_URL", "http://localhost:18789")
OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY")

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


audit_log: list[dict[str, Any]] = []


def log_action(request: ActionRequest, status: str, result: str = "") -> str:
    action_id = uuid.uuid4().hex[:8]
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
    audit_log.append(entry)
    logger.info("AUDIT: %s", entry)
    return action_id


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
    if request.requires_approval:
        action_id = log_action(request, "pending_approval")
        return ActionResponse(
            status="pending_approval",
            action_id=action_id,
            message="Awaiting approval",
        )

    try:
        result = await execute_action_with_openclaw(
            request.action,
            request.target,
            request.params,
        )
    except RuntimeError as exc:
        log_action(request, "failed", str(exc))
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        log_action(request, "failed", str(exc))
        raise HTTPException(status_code=502, detail="OpenClaw request failed") from exc

    action_id = log_action(request, "executed", result)
    return ActionResponse(status="executed", action_id=action_id, message=result)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

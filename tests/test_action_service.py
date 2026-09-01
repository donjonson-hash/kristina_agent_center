from datetime import datetime, timezone

from fastapi.testclient import TestClient

import action_service
from decision_gate import EvidenceClaim, EvidenceSnapshot, PermitRegistry


client = TestClient(action_service.app)
NOW = datetime(2026, 8, 31, 22, 0, tzinfo=timezone.utc)
REPOSITORY = "donjonson-hash/kristina_agent_center"
COMMIT_SHA = "b" * 40


class EvidenceAdapterStub:
    def __init__(self, snapshots: list[EvidenceSnapshot]) -> None:
        self.snapshots = snapshots
        self.calls: list[tuple[str, str, str]] = []

    async def collect_deploy_evidence(
        self,
        repository_full_name: str,
        branch: str,
        commit_sha: str,
    ) -> EvidenceSnapshot:
        self.calls.append((repository_full_name, branch, commit_sha))
        return self.snapshots.pop(0)


def claim(claim_id: str, subject: str, predicate: str, value: str) -> EvidenceClaim:
    return EvidenceClaim(
        id=claim_id,
        subject=subject,
        predicate=predicate,
        value=value,
        source="github",
        observed_at=NOW,
    )


def snapshot(head_sha: str = COMMIT_SHA, ci_status: str = "success") -> EvidenceSnapshot:
    return EvidenceSnapshot(
        id=f"snapshot-{head_sha[:4]}-{ci_status}",
        claims=(
            claim("head", REPOSITORY, "repository.head_sha", head_sha),
            claim("ci", f"commit:{COMMIT_SHA}", "ci.status", ci_status),
        ),
        collected_at=NOW,
    )


def deploy_payload(**changes) -> dict:
    payload = {
        "action": "deploy",
        "target": "staging",
        "agent_id": "devops",
        "params": {
            "repository": REPOSITORY,
            "branch": "main",
            "commit_sha": COMMIT_SHA,
        },
        "requires_approval": True,
    }
    payload.update(changes)
    return payload


def setup_function() -> None:
    action_service.audit_log.clear()
    action_service.pending_actions.clear()
    action_service.permit_registry = PermitRegistry()
    action_service.ACTION_APPROVAL_API_KEY = "approval-secret"


def test_health_reports_service_status() -> None:
    response = client.get("/api/actions/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "audit_count": 0}


def test_missing_repository_needs_clarification_without_collecting_evidence(
    monkeypatch,
) -> None:
    adapter = EvidenceAdapterStub([])
    monkeypatch.setattr(action_service, "github_evidence_adapter", adapter)

    response = client.post(
        "/api/actions/execute",
        json=deploy_payload(params={"commit_sha": COMMIT_SHA, "branch": "main"}),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "needs_clarification"
    assert response.json()["reason_code"] == "repository_missing"
    assert adapter.calls == []


def test_deploy_without_approval_is_blocked_before_evidence(monkeypatch) -> None:
    adapter = EvidenceAdapterStub([])
    monkeypatch.setattr(action_service, "github_evidence_adapter", adapter)

    response = client.post(
        "/api/actions/execute",
        json=deploy_payload(requires_approval=False),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "blocked"
    assert response.json()["reason_code"] == "approval_policy_required"
    assert adapter.calls == []


def test_head_mismatch_blocks_action_without_openclaw(monkeypatch) -> None:
    adapter = EvidenceAdapterStub([snapshot(head_sha="a" * 40)])
    executed = False

    async def fail_if_called(*args, **kwargs):
        nonlocal executed
        executed = True

    monkeypatch.setattr(action_service, "github_evidence_adapter", adapter)
    monkeypatch.setattr(action_service, "execute_action_with_openclaw", fail_if_called)

    response = client.post("/api/actions/execute", json=deploy_payload())

    assert response.status_code == 200
    assert response.json()["status"] == "blocked"
    assert response.json()["reason_code"] == "head_sha_mismatch"
    assert executed is False


def test_unavailable_evidence_defers_action_without_openclaw(monkeypatch) -> None:
    unavailable = EvidenceSnapshot(
        id="snapshot-unavailable",
        claims=(),
        collected_at=NOW,
        available=False,
        error="GitHub API returned HTTP 503.",
    )
    adapter = EvidenceAdapterStub([unavailable])

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("unavailable evidence must not reach OpenClaw")

    monkeypatch.setattr(action_service, "github_evidence_adapter", adapter)
    monkeypatch.setattr(action_service, "execute_action_with_openclaw", fail_if_called)

    response = client.post("/api/actions/execute", json=deploy_payload())

    assert response.status_code == 200
    assert response.json()["status"] == "deferred"
    assert response.json()["reason_code"] == "evidence_unavailable"


def test_valid_evidence_waits_for_separate_approval(monkeypatch) -> None:
    adapter = EvidenceAdapterStub([snapshot()])

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("OpenClaw must not run before approval")

    monkeypatch.setattr(action_service, "github_evidence_adapter", adapter)
    monkeypatch.setattr(action_service, "execute_action_with_openclaw", fail_if_called)

    response = client.post("/api/actions/execute", json=deploy_payload())

    assert response.status_code == 200
    assert response.json()["status"] == "pending_approval"
    assert response.json()["action_id"] in action_service.pending_actions
    assert action_service.audit_log[0]["status"] == "pending_approval"


def test_approval_revalidates_changed_evidence_and_blocks_openclaw(monkeypatch) -> None:
    adapter = EvidenceAdapterStub([snapshot(), snapshot(head_sha="a" * 40)])

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("changed evidence must block OpenClaw")

    monkeypatch.setattr(action_service, "github_evidence_adapter", adapter)
    monkeypatch.setattr(action_service, "execute_action_with_openclaw", fail_if_called)
    proposed = client.post("/api/actions/execute", json=deploy_payload()).json()

    response = client.post(
        f"/api/actions/{proposed['action_id']}/approve",
        json={"approver": "don"},
        headers={"Authorization": "Bearer approval-secret"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "blocked"
    assert response.json()["reason_code"] == "head_sha_mismatch"
    assert proposed["action_id"] not in action_service.pending_actions
    assert len(adapter.calls) == 2


def test_approved_current_evidence_executes_once(monkeypatch) -> None:
    adapter = EvidenceAdapterStub([snapshot(), snapshot()])
    calls: list[tuple[str, str, dict]] = []

    async def execute_stub(action: str, target: str, params: dict) -> str:
        calls.append((action, target, params))
        return "deployed"

    monkeypatch.setattr(action_service, "github_evidence_adapter", adapter)
    monkeypatch.setattr(action_service, "execute_action_with_openclaw", execute_stub)
    proposed = client.post("/api/actions/execute", json=deploy_payload()).json()

    response = client.post(
        f"/api/actions/{proposed['action_id']}/approve",
        json={"approver": "don"},
        headers={"Authorization": "Bearer approval-secret"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "executed"
    assert response.json()["message"] == "deployed"
    assert calls == [("deploy", "staging", deploy_payload()["params"])]
    assert proposed["action_id"] not in action_service.pending_actions
    assert [entry["status"] for entry in action_service.audit_log] == [
        "pending_approval",
        "executed",
    ]

    repeated = client.post(
        f"/api/actions/{proposed['action_id']}/approve",
        json={"approver": "don"},
        headers={"Authorization": "Bearer approval-secret"},
    )
    assert repeated.status_code == 404
    assert len(calls) == 1


def test_approval_requires_valid_credentials(monkeypatch) -> None:
    adapter = EvidenceAdapterStub([snapshot()])
    monkeypatch.setattr(action_service, "github_evidence_adapter", adapter)
    proposed = client.post("/api/actions/execute", json=deploy_payload()).json()

    response = client.post(
        f"/api/actions/{proposed['action_id']}/approve",
        json={"approver": "don"},
        headers={"Authorization": "Bearer wrong-secret"},
    )

    assert response.status_code == 401
    assert proposed["action_id"] in action_service.pending_actions
    assert len(adapter.calls) == 1


def test_unsupported_action_is_blocked_without_openclaw(monkeypatch) -> None:
    async def fail_if_called(*args, **kwargs):
        raise AssertionError("unsupported actions must not reach OpenClaw")

    monkeypatch.setattr(action_service, "execute_action_with_openclaw", fail_if_called)

    response = client.post(
        "/api/actions/execute",
        json={
            "action": "browser.navigate",
            "target": "browser",
            "agent_id": "qa",
            "params": {"url": "https://example.com"},
            "requires_approval": True,
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "blocked"
    assert response.json()["reason_code"] == "unsupported_action"

from fastapi.testclient import TestClient

import action_service


client = TestClient(action_service.app)


def setup_function() -> None:
    action_service.audit_log.clear()


def test_health_reports_service_status() -> None:
    response = client.get("/api/actions/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "audit_count": 0}


def test_action_requiring_approval_is_not_executed(monkeypatch) -> None:
    async def fail_if_called(*args, **kwargs):
        raise AssertionError("approval-gated action must not be executed")

    monkeypatch.setattr(action_service, "execute_action_with_openclaw", fail_if_called)

    response = client.post(
        "/api/actions/execute",
        json={
            "action": "deploy",
            "target": "staging",
            "agent_id": "devops",
            "params": {},
            "requires_approval": True,
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "pending_approval"
    assert action_service.audit_log[0]["status"] == "pending_approval"


def test_executed_action_is_recorded(monkeypatch) -> None:
    async def execute_stub(action: str, target: str, params: dict) -> str:
        assert (action, target, params) == ("test", "sandbox", {"dry_run": True})
        return "completed"

    monkeypatch.setattr(action_service, "execute_action_with_openclaw", execute_stub)

    response = client.post(
        "/api/actions/execute",
        json={
            "action": "test",
            "target": "sandbox",
            "agent_id": "qa",
            "params": {"dry_run": True},
            "requires_approval": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "executed"
    assert response.json()["message"] == "completed"
    assert action_service.audit_log[0]["result"] == "completed"

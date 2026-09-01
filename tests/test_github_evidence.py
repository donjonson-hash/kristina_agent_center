import asyncio
from datetime import datetime, timezone

import httpx

from decision_gate import ProposedAction, Verdict, evaluate_action
from github_evidence import GitHubEvidenceAdapter


NOW = datetime(2026, 8, 31, 21, 30, tzinfo=timezone.utc)
REPOSITORY = "donjonson-hash/kristina_agent_center"
COMMIT_SHA = "b" * 40


def action() -> ProposedAction:
    return ProposedAction(
        action="deploy",
        target=REPOSITORY,
        agent_id="kristina",
        params={
            "branch": "main",
            "commit_sha": COMMIT_SHA,
            "environment": "staging",
        },
        requires_approval=True,
    )


def collect(handler, *, token: str | None = None):
    adapter = GitHubEvidenceAdapter(
        token=token,
        transport=httpx.MockTransport(handler),
        now=lambda: NOW,
    )
    return asyncio.run(
        adapter.collect_deploy_evidence(
            repository_full_name=REPOSITORY,
            branch="main",
            commit_sha=COMMIT_SHA,
        )
    )


def github_handler(*, head_sha: str = COMMIT_SHA, runs=None, actions_status: int = 200):
    workflow_runs = runs if runs is not None else [
        {"name": "Test Action Service", "status": "completed", "conclusion": "success"},
        {"name": "Lint Python", "status": "completed", "conclusion": "success"},
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/branches/main"):
            return httpx.Response(200, json={"commit": {"sha": head_sha}})
        if request.url.path.endswith("/actions/runs"):
            assert request.url.params["head_sha"] == COMMIT_SHA
            assert request.url.params["per_page"] == "100"
            return httpx.Response(
                actions_status,
                json={"total_count": len(workflow_runs), "workflow_runs": workflow_runs},
            )
        raise AssertionError(f"Unexpected request: {request.url}")

    return handler


def test_matching_head_and_successful_workflows_pass_gate() -> None:
    evidence = collect(github_handler())

    decision = evaluate_action(action(), evidence)

    assert evidence.available is True
    assert decision.verdict is Verdict.PASS
    assert {claim.predicate for claim in evidence.claims} == {
        "repository.head_sha",
        "ci.status",
    }


def test_workflow_in_progress_defers_action() -> None:
    runs = [
        {"name": "Test Action Service", "status": "completed", "conclusion": "success"},
        {"name": "Lint Python", "status": "in_progress", "conclusion": None},
    ]
    evidence = collect(github_handler(runs=runs))

    decision = evaluate_action(action(), evidence)

    assert decision.verdict is Verdict.DEFERRED
    assert decision.reason_code == "ci_in_progress"


def test_failed_workflow_blocks_action() -> None:
    runs = [
        {"name": "Test Action Service", "status": "completed", "conclusion": "failure"}
    ]
    evidence = collect(github_handler(runs=runs))

    decision = evaluate_action(action(), evidence)

    assert decision.verdict is Verdict.BLOCKED
    assert decision.reason_code == "ci_not_successful"


def test_successful_rerun_replaces_failed_attempt() -> None:
    runs = [
        {
            "id": 10,
            "workflow_id": 1,
            "event": "push",
            "run_attempt": 1,
            "status": "completed",
            "conclusion": "failure",
        },
        {
            "id": 11,
            "workflow_id": 1,
            "event": "push",
            "run_attempt": 2,
            "status": "completed",
            "conclusion": "success",
        },
    ]
    evidence = collect(github_handler(runs=runs))

    decision = evaluate_action(action(), evidence)

    assert decision.verdict is Verdict.PASS


def test_missing_workflow_evidence_needs_clarification() -> None:
    evidence = collect(github_handler(runs=[]))

    decision = evaluate_action(action(), evidence)

    assert decision.verdict is Verdict.NEEDS_CLARIFICATION
    assert decision.reason_code == "ci_evidence_missing"


def test_head_mismatch_blocks_action_even_when_ci_succeeded() -> None:
    evidence = collect(github_handler(head_sha="a" * 40))

    decision = evaluate_action(action(), evidence)

    assert decision.verdict is Verdict.BLOCKED
    assert decision.reason_code == "head_sha_mismatch"


def test_github_error_defers_action_without_leaking_token() -> None:
    token = "secret-token-value"

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == f"Bearer {token}"
        return httpx.Response(503, json={"message": token})

    evidence = collect(handler, token=token)
    decision = evaluate_action(action(), evidence)

    assert evidence.available is False
    assert evidence.error == "GitHub API returned HTTP 503."
    assert token not in evidence.error
    assert decision.verdict is Verdict.DEFERRED

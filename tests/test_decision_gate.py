from datetime import datetime, timedelta, timezone

import pytest

from decision_gate import (
    EvidenceClaim,
    EvidenceSnapshot,
    PermitError,
    PermitRegistry,
    ProposedAction,
    Verdict,
    evaluate_action,
)


NOW = datetime(2026, 8, 31, 20, 0, tzinfo=timezone.utc)
REPOSITORY = "donjonson-hash/kristina_agent_center"
COMMIT_SHA = "b" * 40


def deploy_action(**changes) -> ProposedAction:
    values = {
        "action": "deploy",
        "target": REPOSITORY,
        "agent_id": "kristina",
        "params": {"commit_sha": COMMIT_SHA, "environment": "staging"},
        "requires_approval": True,
    }
    values.update(changes)
    return ProposedAction(**values)


def claim(claim_id: str, subject: str, predicate: str, value: str) -> EvidenceClaim:
    return EvidenceClaim(
        id=claim_id,
        subject=subject,
        predicate=predicate,
        value=value,
        source="github",
        observed_at=NOW,
    )


def snapshot(*claims: EvidenceClaim, available: bool = True, error: str | None = None) -> EvidenceSnapshot:
    return EvidenceSnapshot(
        id="snapshot-1",
        claims=claims,
        collected_at=NOW,
        available=available,
        error=error,
    )


def valid_snapshot() -> EvidenceSnapshot:
    return snapshot(
        claim("head", REPOSITORY, "repository.head_sha", COMMIT_SHA),
        claim("ci", f"commit:{COMMIT_SHA}", "ci.status", "success"),
    )


def test_missing_evidence_needs_clarification() -> None:
    decision = evaluate_action(deploy_action(), snapshot())

    assert decision.verdict is Verdict.NEEDS_CLARIFICATION
    assert decision.reason_code == "evidence_missing"


def test_unavailable_evidence_defers_action() -> None:
    decision = evaluate_action(
        deploy_action(),
        snapshot(available=False, error="GitHub is unavailable"),
    )

    assert decision.verdict is Verdict.DEFERRED
    assert decision.reason_code == "evidence_unavailable"


def test_ci_for_another_commit_blocks_action() -> None:
    other_sha = "a" * 40
    evidence = snapshot(
        claim("head", REPOSITORY, "repository.head_sha", COMMIT_SHA),
        claim("ci-old", f"commit:{other_sha}", "ci.status", "success"),
    )

    decision = evaluate_action(deploy_action(), evidence)

    assert decision.verdict is Verdict.BLOCKED
    assert decision.reason_code == "ci_sha_mismatch"


def test_failed_ci_blocks_action() -> None:
    evidence = snapshot(
        claim("head", REPOSITORY, "repository.head_sha", COMMIT_SHA),
        claim("ci", f"commit:{COMMIT_SHA}", "ci.status", "failure"),
    )

    decision = evaluate_action(deploy_action(), evidence)

    assert decision.verdict is Verdict.BLOCKED
    assert decision.reason_code == "ci_not_successful"


def test_matching_head_and_successful_ci_pass() -> None:
    decision = evaluate_action(deploy_action(), valid_snapshot())

    assert decision.verdict is Verdict.PASS
    assert decision.reason_code == "deploy_evidence_valid"
    assert decision.evidence_refs == ("head", "ci")


def test_contradictory_claims_block_action() -> None:
    evidence = snapshot(
        claim("head-a", REPOSITORY, "repository.head_sha", COMMIT_SHA),
        claim("head-b", REPOSITORY, "repository.head_sha", "a" * 40),
        claim("ci", f"commit:{COMMIT_SHA}", "ci.status", "success"),
    )

    decision = evaluate_action(deploy_action(), evidence)

    assert decision.verdict is Verdict.BLOCKED
    assert decision.reason_code == "evidence_contradiction"
    assert set(decision.evidence_refs) == {"head-a", "head-b"}


def test_blocked_action_cannot_issue_permit() -> None:
    decision = evaluate_action(deploy_action(), snapshot())
    registry = PermitRegistry()

    with pytest.raises(PermitError, match="only a PASS decision"):
        registry.issue(decision, deploy_action(), approved_by="don", now=NOW)


def test_approval_is_required_before_permit() -> None:
    action = deploy_action()
    decision = evaluate_action(action, valid_snapshot())
    registry = PermitRegistry()

    with pytest.raises(PermitError, match="human approval"):
        registry.issue(decision, action, approved_by=None, now=NOW)


def test_changed_action_invalidates_decision() -> None:
    action = deploy_action()
    decision = evaluate_action(action, valid_snapshot())
    changed_action = deploy_action(
        params={"commit_sha": COMMIT_SHA, "environment": "production"}
    )
    registry = PermitRegistry()

    with pytest.raises(PermitError, match="action changed"):
        registry.issue(decision, changed_action, approved_by="don", now=NOW)


def test_execution_permit_is_single_use() -> None:
    action = deploy_action()
    decision = evaluate_action(action, valid_snapshot())
    registry = PermitRegistry()
    permit = registry.issue(decision, action, approved_by="don", now=NOW)

    consumed = registry.consume(permit.token, action, now=NOW + timedelta(seconds=1))

    assert permit.evidence_snapshot_id == "snapshot-1"
    assert consumed.consumed_at == NOW + timedelta(seconds=1)
    with pytest.raises(PermitError, match="already consumed"):
        registry.consume(permit.token, action, now=NOW + timedelta(seconds=2))


def test_expired_permit_cannot_be_consumed() -> None:
    action = deploy_action()
    decision = evaluate_action(action, valid_snapshot())
    registry = PermitRegistry()
    permit = registry.issue(
        decision,
        action,
        approved_by="don",
        now=NOW,
        ttl=timedelta(seconds=5),
    )

    with pytest.raises(PermitError, match="expired"):
        registry.consume(permit.token, action, now=NOW + timedelta(seconds=5))

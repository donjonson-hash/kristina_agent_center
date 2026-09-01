import hashlib
import json
import secrets
import uuid
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Mapping


class Verdict(str, Enum):
    PASS = "pass"
    BLOCKED = "blocked"
    NEEDS_CLARIFICATION = "needs_clarification"
    DEFERRED = "deferred"


class PermitError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProposedAction:
    action: str
    target: str
    agent_id: str
    params: Mapping[str, Any] = field(default_factory=dict)
    requires_approval: bool = False

    def digest(self) -> str:
        payload = {
            "action": self.action,
            "target": self.target,
            "agent_id": self.agent_id,
            "params": self.params,
            "requires_approval": self.requires_approval,
        }
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        return hashlib.sha256(encoded).hexdigest()


@dataclass(frozen=True)
class EvidenceClaim:
    id: str
    subject: str
    predicate: str
    value: Any
    source: str
    observed_at: datetime
    confidence: float = 1.0

    def __post_init__(self) -> None:
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be between 0 and 1")


@dataclass(frozen=True)
class EvidenceSnapshot:
    id: str
    claims: tuple[EvidenceClaim, ...]
    collected_at: datetime
    available: bool = True
    error: str | None = None


@dataclass(frozen=True)
class Decision:
    id: str
    verdict: Verdict
    reason_code: str
    explanation: str
    action_digest: str
    evidence_snapshot_id: str
    evidence_refs: tuple[str, ...]


@dataclass(frozen=True)
class ExecutionPermit:
    token: str
    decision_id: str
    action_digest: str
    evidence_snapshot_id: str
    issued_at: datetime
    expires_at: datetime
    approved_by: str | None
    consumed_at: datetime | None = None


def _canonical_value(value: Any) -> str:
    return json.dumps(value, sort_keys=True, default=str, separators=(",", ":"))


def _find_contradictions(claims: tuple[EvidenceClaim, ...]) -> tuple[str, ...]:
    grouped: dict[tuple[str, str], dict[str, list[str]]] = {}
    for claim in claims:
        key = (claim.subject, claim.predicate)
        value = _canonical_value(claim.value)
        grouped.setdefault(key, {}).setdefault(value, []).append(claim.id)

    contradictory_ids: list[str] = []
    for values in grouped.values():
        if len(values) > 1:
            for claim_ids in values.values():
                contradictory_ids.extend(claim_ids)
    return tuple(contradictory_ids)


def _decision(
    action: ProposedAction,
    snapshot: EvidenceSnapshot,
    verdict: Verdict,
    reason_code: str,
    explanation: str,
    evidence_refs: tuple[str, ...] = (),
) -> Decision:
    return Decision(
        id=uuid.uuid4().hex,
        verdict=verdict,
        reason_code=reason_code,
        explanation=explanation,
        action_digest=action.digest(),
        evidence_snapshot_id=snapshot.id,
        evidence_refs=evidence_refs,
    )


def evaluate_action(action: ProposedAction, snapshot: EvidenceSnapshot) -> Decision:
    if action.action != "deploy":
        return _decision(
            action,
            snapshot,
            Verdict.BLOCKED,
            "unsupported_action",
            f"Action '{action.action}' is outside the MVP policy.",
        )

    repository_parts = action.target.split("/")
    if len(repository_parts) != 2 or not all(part.strip() for part in repository_parts):
        return _decision(
            action,
            snapshot,
            Verdict.NEEDS_CLARIFICATION,
            "repository_missing",
            "A deploy action requires a repository in 'owner/name' format.",
        )

    commit_sha = action.params.get("commit_sha")
    if not isinstance(commit_sha, str) or not commit_sha.strip():
        return _decision(
            action,
            snapshot,
            Verdict.NEEDS_CLARIFICATION,
            "commit_sha_missing",
            "A deploy action requires an explicit commit SHA.",
        )

    branch = action.params.get("branch")
    if not isinstance(branch, str) or not branch.strip():
        return _decision(
            action,
            snapshot,
            Verdict.NEEDS_CLARIFICATION,
            "branch_missing",
            "A deploy action requires an explicit branch.",
        )

    if not action.requires_approval:
        return _decision(
            action,
            snapshot,
            Verdict.BLOCKED,
            "approval_policy_required",
            "Deploy actions require human approval before execution.",
        )

    if not snapshot.available:
        return _decision(
            action,
            snapshot,
            Verdict.DEFERRED,
            "evidence_unavailable",
            snapshot.error or "Evidence collection is unavailable.",
        )

    if not snapshot.claims:
        return _decision(
            action,
            snapshot,
            Verdict.NEEDS_CLARIFICATION,
            "evidence_missing",
            "No evidence was provided for the requested deploy.",
        )

    contradictory_ids = _find_contradictions(snapshot.claims)
    if contradictory_ids:
        return _decision(
            action,
            snapshot,
            Verdict.BLOCKED,
            "evidence_contradiction",
            "Evidence contains contradictory claims.",
            contradictory_ids,
        )

    head_claims = tuple(
        claim
        for claim in snapshot.claims
        if claim.subject == action.target and claim.predicate == "repository.head_sha"
    )
    if not head_claims:
        return _decision(
            action,
            snapshot,
            Verdict.NEEDS_CLARIFICATION,
            "head_evidence_missing",
            "The current repository HEAD is unknown.",
        )

    head_claim = head_claims[0]
    if head_claim.value != commit_sha:
        return _decision(
            action,
            snapshot,
            Verdict.BLOCKED,
            "head_sha_mismatch",
            "The requested commit does not match the current repository HEAD.",
            (head_claim.id,),
        )

    ci_claims = tuple(
        claim
        for claim in snapshot.claims
        if claim.predicate == "ci.status" and claim.subject.startswith("commit:")
    )
    matching_ci = tuple(claim for claim in ci_claims if claim.subject == f"commit:{commit_sha}")

    if not matching_ci and ci_claims:
        return _decision(
            action,
            snapshot,
            Verdict.BLOCKED,
            "ci_sha_mismatch",
            "Available CI evidence belongs to a different commit SHA.",
            tuple(claim.id for claim in ci_claims),
        )

    if not matching_ci:
        return _decision(
            action,
            snapshot,
            Verdict.NEEDS_CLARIFICATION,
            "ci_evidence_missing",
            "No CI evidence exists for the requested commit SHA.",
            (head_claim.id,),
        )

    ci_claim = matching_ci[0]
    if ci_claim.value in ("queued", "in_progress", "pending"):
        return _decision(
            action,
            snapshot,
            Verdict.DEFERRED,
            "ci_in_progress",
            "CI has not completed for the requested commit SHA.",
            (head_claim.id, ci_claim.id),
        )

    if ci_claim.value != "success":
        return _decision(
            action,
            snapshot,
            Verdict.BLOCKED,
            "ci_not_successful",
            "CI did not succeed for the requested commit SHA.",
            (head_claim.id, ci_claim.id),
        )

    return _decision(
        action,
        snapshot,
        Verdict.PASS,
        "deploy_evidence_valid",
        "Repository HEAD and successful CI evidence match the requested commit SHA.",
        (head_claim.id, ci_claim.id),
    )


class PermitRegistry:
    def __init__(self) -> None:
        self._permits: dict[str, ExecutionPermit] = {}

    def issue(
        self,
        decision: Decision,
        action: ProposedAction,
        approved_by: str | None,
        now: datetime | None = None,
        ttl: timedelta = timedelta(minutes=5),
    ) -> ExecutionPermit:
        if decision.verdict is not Verdict.PASS:
            raise PermitError("only a PASS decision can issue an execution permit")
        if decision.action_digest != action.digest():
            raise PermitError("action changed after the decision")
        if action.requires_approval and not approved_by:
            raise PermitError("human approval is required")
        if ttl <= timedelta(0):
            raise ValueError("permit ttl must be positive")

        issued_at = now or datetime.now(timezone.utc)
        permit = ExecutionPermit(
            token=secrets.token_urlsafe(32),
            decision_id=decision.id,
            action_digest=action.digest(),
            evidence_snapshot_id=decision.evidence_snapshot_id,
            issued_at=issued_at,
            expires_at=issued_at + ttl,
            approved_by=approved_by,
        )
        self._permits[permit.token] = permit
        return permit

    def consume(
        self,
        token: str,
        action: ProposedAction,
        now: datetime | None = None,
    ) -> ExecutionPermit:
        permit = self._permits.get(token)
        if permit is None:
            raise PermitError("execution permit is unknown")
        if permit.consumed_at is not None:
            raise PermitError("execution permit was already consumed")
        if permit.action_digest != action.digest():
            raise PermitError("execution permit does not match the action")

        consumed_at = now or datetime.now(timezone.utc)
        if consumed_at >= permit.expires_at:
            raise PermitError("execution permit has expired")

        consumed = replace(permit, consumed_at=consumed_at)
        self._permits[token] = consumed
        return consumed

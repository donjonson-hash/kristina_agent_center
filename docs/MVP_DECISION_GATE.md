# Kristina Decision Gate — MVP Contract

## Goal

The first MVP proves one narrow decision loop: whether Kristina may deploy a specific commit from a GitHub repository.

The gate is a pre-execution safety boundary, not a post-execution observer:

```text
ProposedAction
  → EvidenceSnapshot
  → Decision
  → Human Approval
  → ExecutionPermit
  → External Action
  → Outcome
```

## Safety invariants

1. Missing evidence never becomes permission.
2. Unavailable evidence produces `DEFERRED`, not `PASS`.
3. Contradictory evidence produces `BLOCKED`.
4. CI evidence must belong to the exact requested commit SHA.
5. Only a `PASS` decision may issue an execution permit.
6. Human approval is required when the proposed action requests it.
7. A permit is bound to the complete action digest and exact evidence snapshot.
8. A permit is short-lived and can be consumed only once.
9. Changing action parameters invalidates the previous decision and permit.
10. Post-execution observation records an outcome but cannot retroactively authorize an action.

## MVP verdicts

| Verdict | Meaning |
| --- | --- |
| `PASS` | Evidence supports the proposed action. |
| `BLOCKED` | Evidence proves a policy, state, or consistency violation. |
| `NEEDS_CLARIFICATION` | Required evidence or intent is missing. |
| `DEFERRED` | A required evidence source or check is temporarily incomplete. |

## Initial evidence contract

The first adapter will collect only GitHub evidence:

- current repository HEAD;
- requested commit SHA;
- GitHub Actions status for that exact SHA;
- observation time and source.

Evidence is stored as claims. Claims with the same subject and predicate but different values are contradictions; neither value is silently overwritten.

## Out of scope for the kernel PR

- GitHub API calls;
- SQLite persistence;
- OpenClaw integration;
- UI;
- LLM validation;
- generic enterprise ontology;
- additional action types.

These capabilities are added only after the deterministic kernel and its fail-closed tests are green.

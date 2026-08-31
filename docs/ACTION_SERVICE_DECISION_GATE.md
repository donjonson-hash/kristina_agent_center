# Action Service Decision Gate

This stage connects deploy proposals to GitHub evidence and places the Decision Gate before OpenClaw.

## Execution flow

1. `POST /api/actions/execute` receives a deploy proposal.
2. The service validates the repository, branch, commit SHA, and approval policy.
3. The GitHub Evidence Adapter reads the branch HEAD and workflow runs for the requested commit.
4. The Decision Gate returns `pass`, `blocked`, `needs_clarification`, or `deferred`.
5. A passing proposal is stored as `pending_approval`; OpenClaw is not called.
6. `POST /api/actions/{action_id}/approve` authenticates the approver and collects fresh evidence.
7. Only a new `pass` decision can issue and consume a one-time execution permit immediately before OpenClaw.

Any missing, unavailable, contradictory, stale, or unsuccessful evidence fails closed.

## Request examples

Propose a staging deployment:

```bash
curl -X POST http://localhost:8000/api/actions/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": "deploy",
    "target": "staging",
    "agent_id": "kristina",
    "params": {
      "repository": "donjonson-hash/kristina_agent_center",
      "branch": "main",
      "commit_sha": "<40-character-commit-sha>"
    },
    "requires_approval": true
  }'
```

Approve the returned `action_id`:

```bash
curl -X POST http://localhost:8000/api/actions/<action_id>/approve \
  -H "Authorization: Bearer $ACTION_APPROVAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"approver":"don"}'
```

Set `GITHUB_TOKEN`, `ACTION_APPROVAL_API_KEY`, and `OPENCLAW_API_KEY` before running the service.

## MVP boundary

- Only `deploy` is supported; every other action is blocked.
- Every deploy requires separate authenticated approval.
- Pending actions and permits are held in process memory. A restart safely invalidates them and requires a new proposal.
- `approver` is an audit label. Authentication is provided by the shared approval API key; identity-provider integration is a later stage.
- The audit log is also in memory and is not yet a durable ledger.

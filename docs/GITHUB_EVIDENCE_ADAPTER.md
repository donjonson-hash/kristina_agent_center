# GitHub Evidence Adapter

## Purpose

The adapter turns live GitHub state into an `EvidenceSnapshot` that the Decision Gate can evaluate before a deploy.

For one repository, branch and requested commit SHA it reads:

- the branch's current HEAD;
- GitHub Actions runs associated with the exact requested SHA.

## Produced claims

```text
Repository --repository.head_sha--> Commit SHA
Commit SHA --ci.status--> success | failure | in_progress
```

Every claim includes its GitHub source and observation time. The adapter never returns `PASS`; it only collects evidence. `decision_gate.evaluate_action` owns the verdict.

## Fail-closed behavior

- HTTP or transport error → unavailable snapshot;
- malformed GitHub response → unavailable snapshot;
- more than 100 workflow runs → unavailable snapshot rather than partial evidence;
- no workflow runs → no `ci.status` claim;
- any running workflow → `in_progress`;
- only the latest attempt of each workflow/event pair is evaluated;
- all workflows completed successfully → `success`;
- any other completed conclusion → `failure`.

An unavailable snapshot becomes `DEFERRED`. Missing CI evidence becomes `NEEDS_CLARIFICATION`.

## Authentication

`GITHUB_TOKEN` is optional for public repositories and required when the GitHub API needs authenticated access. Tokens are sent only in the Authorization header and are never included in evidence or error messages.

## Current limits

- GitHub is the only evidence provider;
- no required-workflow policy yet;
- no persistence;
- no webhook ingestion;
- no OpenClaw integration.

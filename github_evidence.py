import os
import uuid
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from decision_gate import EvidenceClaim, EvidenceSnapshot


class GitHubEvidenceError(RuntimeError):
    pass


class GitHubEvidenceAdapter:
    def __init__(
        self,
        token: str | None = None,
        api_url: str = "https://api.github.com",
        timeout: float = 10.0,
        transport: httpx.AsyncBaseTransport | None = None,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self._token = token if token is not None else os.getenv("GITHUB_TOKEN")
        self._api_url = api_url.rstrip("/")
        self._timeout = timeout
        self._transport = transport
        self._now = now or (lambda: datetime.now(timezone.utc))

    async def collect_deploy_evidence(
        self,
        repository_full_name: str,
        branch: str,
        commit_sha: str,
    ) -> EvidenceSnapshot:
        owner, repository = _parse_repository(repository_full_name)
        if not branch.strip():
            raise ValueError("branch must not be empty")
        if not commit_sha.strip():
            raise ValueError("commit_sha must not be empty")

        observed_at = self._now()
        snapshot_id = uuid.uuid4().hex
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "kristina-decision-gate",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"

        repository_path = f"{quote(owner, safe='')}/{quote(repository, safe='')}"
        branch_path = quote(branch, safe="")

        try:
            async with httpx.AsyncClient(
                base_url=self._api_url,
                headers=headers,
                timeout=self._timeout,
                transport=self._transport,
            ) as client:
                branch_response = await client.get(
                    f"/repos/{repository_path}/branches/{branch_path}"
                )
                branch_response.raise_for_status()
                head_sha = _read_head_sha(branch_response.json())

                runs_response = await client.get(
                    f"/repos/{repository_path}/actions/runs",
                    params={"head_sha": commit_sha, "per_page": 100},
                )
                runs_response.raise_for_status()
                runs = _read_workflow_runs(runs_response.json())
        except httpx.HTTPStatusError as exc:
            error = f"GitHub API returned HTTP {exc.response.status_code}."
            return _unavailable_snapshot(snapshot_id, observed_at, error)
        except httpx.RequestError as exc:
            error = f"GitHub API request failed: {exc.__class__.__name__}."
            return _unavailable_snapshot(snapshot_id, observed_at, error)
        except (ValueError, TypeError, GitHubEvidenceError) as exc:
            return _unavailable_snapshot(snapshot_id, observed_at, str(exc))

        claims = [
            EvidenceClaim(
                id=f"github-head-{uuid.uuid4().hex}",
                subject=repository_full_name,
                predicate="repository.head_sha",
                value=head_sha,
                source="github.rest.branches",
                observed_at=observed_at,
            )
        ]

        ci_status = _aggregate_ci_status(runs)
        if ci_status is not None:
            claims.append(
                EvidenceClaim(
                    id=f"github-ci-{uuid.uuid4().hex}",
                    subject=f"commit:{commit_sha}",
                    predicate="ci.status",
                    value=ci_status,
                    source="github.rest.actions",
                    observed_at=observed_at,
                )
            )

        return EvidenceSnapshot(
            id=snapshot_id,
            claims=tuple(claims),
            collected_at=observed_at,
        )


def _parse_repository(repository_full_name: str) -> tuple[str, str]:
    parts = repository_full_name.split("/")
    if len(parts) != 2 or not all(part.strip() for part in parts):
        raise ValueError("repository must use the 'owner/name' format")
    return parts[0], parts[1]


def _read_head_sha(payload: Any) -> str:
    if not isinstance(payload, dict):
        raise GitHubEvidenceError("GitHub branch response is not an object.")
    commit = payload.get("commit")
    if not isinstance(commit, dict):
        raise GitHubEvidenceError("GitHub branch response has no commit object.")
    sha = commit.get("sha")
    if not isinstance(sha, str) or not sha:
        raise GitHubEvidenceError("GitHub branch response has no commit SHA.")
    return sha


def _read_workflow_runs(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise GitHubEvidenceError("GitHub Actions response is not an object.")
    runs = payload.get("workflow_runs")
    total_count = payload.get("total_count")
    if not isinstance(runs, list) or not all(isinstance(run, dict) for run in runs):
        raise GitHubEvidenceError("GitHub Actions response has invalid workflow runs.")
    if not isinstance(total_count, int):
        raise GitHubEvidenceError("GitHub Actions response has no total count.")
    if total_count > len(runs):
        raise GitHubEvidenceError("GitHub Actions evidence is incomplete.")
    return runs


def _aggregate_ci_status(runs: list[dict[str, Any]]) -> str | None:
    if not runs:
        return None

    latest_runs: dict[tuple[Any, Any], tuple[tuple[int, int], dict[str, Any]]] = {}
    for index, run in enumerate(runs):
        key = (run.get("workflow_id", run.get("name", index)), run.get("event"))
        attempt = run.get("run_attempt", 1)
        run_id = run.get("id", index)
        rank = (
            attempt if isinstance(attempt, int) else 0,
            run_id if isinstance(run_id, int) else index,
        )
        current = latest_runs.get(key)
        if current is None or rank > current[0]:
            latest_runs[key] = (rank, run)

    current_runs = [item[1] for item in latest_runs.values()]
    statuses = [run.get("status") for run in current_runs]
    if any(status != "completed" for status in statuses):
        return "in_progress"

    conclusions = [run.get("conclusion") for run in current_runs]
    if all(conclusion == "success" for conclusion in conclusions):
        return "success"
    return "failure"


def _unavailable_snapshot(
    snapshot_id: str,
    observed_at: datetime,
    error: str,
) -> EvidenceSnapshot:
    return EvidenceSnapshot(
        id=snapshot_id,
        claims=(),
        collected_at=observed_at,
        available=False,
        error=error,
    )

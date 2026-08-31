# Kristina Agent Center — Architecture Thesis v0.1

**Status:** Working thesis  
**Version:** 0.1  
**Date:** 2026-08-31

## 1. Thesis

Kristina Agent Center is not primarily an agent orchestrator.

It is a **decision system that maintains a shared model of reality, grounds conclusions in evidence, models relationships between objects and actions, explains why a decision is proposed, estimates likely outcomes before execution, and learns from what actually happened.**

The core loop is:

> **Evidence → Relations → Explanation → Simulation → Decision → Action → Outcome → Learning**

The goal is not to make agents appear intelligent. The goal is to make decisions **traceable, comparable, testable, and improvable**.

## 2. Why this architecture

Most agent systems converge on the same pattern:

> LLM + tools + memory + workflow

This is useful, but it usually leaves several hard problems unresolved: agents see fragments of reality rather than a shared world model; conclusions are difficult to trace back to evidence; generated explanations are often post-hoc narratives; agents act without estimating consequences; the system rarely compares predicted outcomes with actual outcomes; institutional knowledge remains trapped in prompts, logs, and chat history; and a successful or failed decision does not automatically improve future decisions.

Kristina Agent Center should address these gaps.

The system should not ask only:

> “What should the agent do?”

It should also ask:

> “What does the system know?”  
> “Why does it believe this?”  
> “What relationships make this evidence relevant?”  
> “What may happen if we choose action A instead of B?”  
> “How uncertain is that estimate?”  
> “What actually happened?”  
> “What should change in our model after observing the outcome?”

## 3. The world is object-centric

The center should model the world as **objects, relations, events and claims**, not as a bag of prompt text.

Possible first-class objects:

- `Agent`
- `Human`
- `Project`
- `Repository`
- `Task`
- `Requirement`
- `Document`
- `File`
- `Commit`
- `PullRequest`
- `Issue`
- `Decision`
- `Action`
- `Experiment`
- `Resource`
- `Budget`
- `Metric`
- `Risk`
- `Prediction`
- `Outcome`

An object is not merely a database row. It has identity, attributes, provenance, lifecycle and relationships.

Example:

```text
Project: kristina_agent_center
    HAS_REPOSITORY -> Repository
    HAS_GOAL -> Goal
    HAS_TASK -> Task
    PRODUCED_DECISION -> Decision
    CONSUMED_BUDGET -> Resource
    PRODUCED_OUTCOME -> Outcome
```

## 4. Relations are as important as objects

A central design principle is:

> **Meaning lives in relationships.**

A file is useful because it belongs to a repository. A repository matters because it implements a project. A decision matters because it changes objects. An outcome matters because it validates or invalidates a prediction.

Example relation types:

```text
CONTAINS
DEPENDS_ON
IMPLEMENTS
BLOCKS
SUPPORTS
CONTRADICTS
DERIVED_FROM
AFFECTS
CREATED_BY
REVIEWED_BY
TRIGGERED
PREDICTS
RESULTED_IN
VALIDATES
INVALIDATES
```

This makes the system fundamentally different from a conventional agent memory store.

## 5. Evidence before reasoning

Every consequential conclusion should have provenance.

Evidence may come from source code, Git history, tests, CI results, documentation, metrics, user input, API results, logs, database state, previous outcomes, and external research.

The system should internally distinguish at least four epistemic categories:

### FACT
Directly observed or retrieved evidence.

### INFERENCE
A conclusion derived from facts.

### RISK
A plausible negative consequence or uncertainty.

### UNKNOWN
Information required for confidence but currently absent.

An agent may present these naturally to the user, but internally they should remain separate.

Example:

```text
FACT:
requirements.txt pins FastAPI 0.104.

INFERENCE:
The dependency set may be significantly behind the current stack.

RISK:
Security fixes or compatibility improvements may be missing.

UNKNOWN:
Whether the old version is required by another dependency.
```

The architecture should make it difficult for an agent to silently transform `UNKNOWN` into `FACT`.

## 6. Explanation is not chain-of-thought

The center should not depend on storing private free-form model reasoning.

An explanation should instead be a **structured decision trace**:

```text
Decision
  ├── objective
  ├── evidence used
  ├── assumptions
  ├── alternatives considered
  ├── predicted outcomes
  ├── constraints
  ├── confidence
  └── selected action
```

The system should be able to answer which facts influenced the decision, which assumptions were made, which alternatives were rejected, what uncertainty remained, what outcome was expected, and who or what authorized execution.

This is explainability at the **system level**, not merely an LLM generating a persuasive explanation afterward.

## 7. Prediction and simulation are different

The architecture should explicitly separate three capabilities.

### Explain
Why a conclusion or recommendation follows from current evidence.

### Predict
Estimate the probability or expected value of a future outcome.

Example:

```text
P(success | action A, current context) = 0.67
```

### Simulate
Compare multiple possible actions before execution.

```text
Action A
  cost: $100
  expected learning: high
  probability of useful signal: 0.72
  downside: low

Action B
  cost: $1000
  expected learning: medium
  probability of useful signal: 0.61
  downside: high
```

Simulation does not require perfect prediction. Its practical purpose is:

> **reduce the cost of being wrong.**

## 8. Decision objects must be durable

A decision should be stored as a first-class object rather than disappearing inside chat history.

Minimal conceptual schema:

```yaml
decision:
  id:
  objective:
  context_snapshot:
  evidence_refs:
  assumptions:
  alternatives:
  chosen_action:
  expected_outcomes:
  confidence:
  risk_level:
  created_by:
  approved_by:
  created_at:
```

This allows the system to evaluate decisions later instead of merely logging that an agent “said something”.

## 9. Action must be separated from decision

A recommendation is not an action.

The architecture should enforce:

```text
Reasoning Plane
    ↓
Decision
    ↓
Policy / Approval
    ↓
Action Plane
    ↓
External effect
```

This separation enables human approval, permissions, budgets, rollback, dry-run, simulation, auditing, and safe autonomy.

An agent may be highly capable without automatically receiving authority to execute every decision.

## 10. Outcome closes the loop

An executed action must produce an observable outcome.

Example:

```text
Prediction:
Updating onboarding will improve activation by 8–15%.

Action:
Deploy onboarding variant B.

Outcome after 14 days:
Activation +2.1%.
```

The system should link:

```text
Decision
    PREDICTED -> Prediction
Decision
    TRIGGERED -> Action
Action
    RESULTED_IN -> Outcome
Outcome
    VALIDATES / INVALIDATES -> Prediction
```

Without this link there is no real learning loop.

## 11. Learning means calibration, not self-mythology

Learning should not mean “append more text to agent memory”.

The system should update measurable beliefs: reliability of a data source; accuracy of a predictor; success rate of an agent in a task domain; error rate of a rule; confidence calibration; estimated cost of action classes; usefulness of specific evidence; and recurring causal patterns.

Example:

```text
Agent A:
architecture review accuracy: 0.84
schedule estimation accuracy: 0.46

Model B:
conversion prediction:
predicted 0.70–0.80
actual success frequency: 0.52
=> model is overconfident
```

Agents should earn trust through outcomes.

## 12. Agents become views and actors over a shared reality

Agents should not each maintain isolated copies of reality.

Instead:

```text
                 Shared Reality Model
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Developer Agent   Analyst Agent   Finance Agent
        │                │                │
        └──────── Decision / Action Plane ┘
```

Different agents may have different skills, permissions, objectives, context windows, and models; but they should reason over the same governed object graph.

This reduces contradictory memory and duplicated state.

## 13. The ontology is operational

The ontology should not exist only for visualization. It should directly control behavior.

Example:

```text
Repository
  HAS_OPEN_PR -> PullRequest
PullRequest
  MODIFIES -> File
File
  IMPLEMENTS -> Service
Service
  DEPENDS_ON -> Database
```

If an agent proposes changing the `Service`, the center can automatically discover affected files, downstream dependencies, open PR conflicts, owners, tests, recent incidents, and deployment risk.

The graph becomes executable context.

## 14. Event-driven by default

Changes in the world should enter the system as events.

Examples:

```text
CommitCreated
PullRequestOpened
BuildFailed
TaskCompleted
BudgetExceeded
PredictionCreated
ActionApproved
ActionExecuted
MetricChanged
OutcomeObserved
```

Events update objects and relations and may trigger agents.

The desired flow is:

```text
Event
  ↓
World model update
  ↓
Relevant relations discovered
  ↓
Agent or rule evaluates significance
  ↓
Decision
  ↓
Action / No Action
```

`No Action` must remain a valid first-class result.

## 15. Uncertainty is part of the data model

The center must avoid presenting probabilistic knowledge as certainty.

A claim can include:

```yaml
claim:
  value:
  confidence:
  source:
  observed_at:
  expires_at:
  method:
```

Predictions should carry confidence intervals or probability distributions where possible.

A mature system should be able to say:

> “We do not have enough evidence to justify a $1000 experiment. A $100 experiment has better information value per unit of risk.”

That is closer to decision intelligence than generic agent automation.

## 16. Budget is an architectural primitive

Agents consume resources: money, LLM tokens, compute, API quotas, human review time, and calendar time.

Every proposed action can eventually expose:

```text
expected_cost
expected_value
uncertainty
reversibility
information_gain
```

The objective is not always to choose the cheapest action. The objective is to optimize:

> **expected information or value gained relative to cost and downside.**

This makes experiments a natural primitive of the system.

## 17. Experiments should be first-class objects

A valuable early use case for the architecture is experiment planning.

```yaml
experiment:
  hypothesis:
  alternatives:
  success_metric:
  stop_condition:
  budget:
  expected_information_gain:
  predicted_outcomes:
  actual_outcome:
```

The center should help answer:

> What is the smallest reversible experiment that can invalidate this idea?

This directly attacks wasted effort and sunk-cost behavior.

## 18. Trust should be computed, not declared

Trust can attach to sources, models, agents, rules, and predictions.

Trust changes based on historical performance.

Example:

```text
GitHub CI result:
trust = high

README claim:
trust = medium

Agent unsupported statement:
trust = low

Repeatedly calibrated predictor:
trust increases
```

A decision may then weigh evidence by reliability rather than treating all context equally.

## 19. Human control remains explicit

The center should support different autonomy levels.

```text
L0 — observe only
L1 — recommend
L2 — simulate
L3 — request approval
L4 — execute bounded actions
L5 — execute + monitor + rollback within policy
```

Authority should belong to policies and permissions, not personality prompts.

## 20. Minimal conceptual architecture

```text
┌───────────────────────────────────────────────┐
│                External World                 │
│ GitHub / APIs / Humans / Metrics / Services   │
└──────────────────────┬────────────────────────┘
                       │
                    Evidence
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Reality / Ontology Layer         │
│ Objects + Relations + Events + Provenance     │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│             Intelligence Layer                │
│ Retrieval / Rules / ML / LLM / Causal Models │
└──────────────────────┬────────────────────────┘
                       │
             Explanations / Predictions
                       │
                       ▼
┌───────────────────────────────────────────────┐
│             Simulation Layer                  │
│ Alternatives / Cost / Risk / Expected Value   │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Decision Layer                   │
│ Decision objects / Policy / Approval          │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                Action Layer                   │
│ Tools / Agents / Services / Rollback          │
└──────────────────────┬────────────────────────┘
                       │
                    Outcome
                       │
                       ▼
┌───────────────────────────────────────────────┐
│               Learning Layer                  │
│ Calibration / Trust / Performance / Patterns  │
└──────────────────────┴────────────────────────┘
                       │
                       └──────► Reality Model
```

## 21. What v0.1 is not

This thesis does **not** propose cloning Palantir products, building a giant enterprise ontology before an MVP, storing unrestricted model chain-of-thought, giving autonomous agents unlimited execution rights, predicting arbitrary future events, creating another dashboard before the decision loop works, or replacing reliable deterministic services with LLMs.

The architecture borrows the useful principle of an object-centric, relationship-rich operational model, but the system should develop its own identity around **agentic decision intelligence**.

## 22. MVP architecture test

The first MVP should prove one loop end to end:

> **Evidence → Decision → Prediction → Action → Outcome → Calibration**

A strong candidate is software engineering work.

Example:

1. GitHub repository becomes an object.
2. Tool collects real code/test/CI evidence.
3. Kristina or another engineering agent proposes a change.
4. The center records why.
5. It predicts expected impact and risk.
6. A human approves the action.
7. Work is executed.
8. CI, review and deployment become outcomes.
9. The system compares the prediction with reality.
10. Agent and model reliability are updated.

If this loop works, the project has something fundamentally more interesting than another multi-agent dashboard.

## 23. North-star principle

The system should make every important action answerable through five questions:

> **What do we know?**  
> **Why do we believe it?**  
> **What could happen if we act?**  
> **Why did we choose this action?**  
> **What actually happened afterward?**

If Kristina Agent Center can answer these questions reliably, it has the foundation of a new agent architecture.

## 24. Working definition

**Kristina Agent Center is an evidence-grounded, object-centric decision intelligence layer for human and AI agents. It converts observed data into shared context, context into explainable alternatives, alternatives into simulated decisions, decisions into governed actions, and outcomes into calibrated learning.**

Short form:

> **Evidence → Relations → Explanation → Simulation → Decision → Action → Outcome → Learning**
# Architecture

This page describes the multi-agent architecture: how the coordinator orchestrates specialist subagents, how context flows between them, and the rules that keep the pipeline safe and predictable.

---

## System Overview

```
┌────────────────────────────────────────────────────────┐
│  YOU (developer)                                       │
│  - confirms checkpoints                                │
│  - reviews final output                                │
│  - merges PR manually                                  │
└───────────────────────┬────────────────────────────────┘
                        │ yes / no / edit / question
┌───────────────────────▼────────────────────────────────┐
│  coordinator-agent  (Claude Sonnet — main thread)      │
│                                                        │
│  1. Reads CLAUDE.md + docs/                            │
│  2. Decomposes task into phases                        │
│  3. Shows plan → asks confirmation (CHECKPOINT 0)      │
│  4. Delegates phase by phase via Agent(...) tool       │
│  5. After each phase: reads output, runs tsc + tests   │
│  6. Presents checkpoint → waits for your response      │
│  7. Produces final summary + manual QA checklist       │
└──────┬──────────┬──────────┬──────────┬────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
  ┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
  │ design  │ │backend │ │frontend│ │ testing │
  │  agent  │ │ agent  │ │ agent  │ │  agent  │
  │ (haiku) │ │(sonnet)│ │(sonnet)│ │ (haiku) │
  │         │ │        │ │        │ │         │
  │ read-   │ │can     │ │can     │ │tests    │
  │ only    │ │write   │ │write   │ │only     │
  └─────────┘ └────────┘ └────────┘ └─────────┘
```

---

## The Coordinator as Main Thread

The coordinator is the **only agent that has a persistent conversation** with you. Subagents are spawned as isolated child processes via the `Agent(...)` tool — they complete their task and return a result, but they do not have access to the conversation history and cannot communicate with each other.

This means:

- **Subagents start fresh every time.** Each agent call starts with: the agent's own instructions, the project's CLAUDE.md, and only the relevant information the coordinator chooses to forward.
- **The coordinator controls information flow.** It reads each agent's output file and forwards *only the relevant parts* to the next agent. This prevents context bloat and keeps each agent focused.
- **Agents do not know each other exists.** Design agent does not know backend-agent will read its output. Backend agent does not know what frontend-agent is doing in parallel.

---

## Agent Roster

| Agent | Model | File Write Permission | Role |
|-------|-------|-----------------------|------|
| `coordinator-agent` | Claude Sonnet | Thin (output files, settings) | Plans, delegates, integrates, verifies |
| `design-agent` | Claude Haiku | None (read-only) | UI/UX specifications — no code |
| `backend-agent` | Claude Sonnet | Yes (API, actions, lib, prisma) | Server Actions, API routes, Zod schemas, migrations |
| `frontend-agent` | Claude Sonnet | Yes (app/, components/) | React components, pages, forms |
| `testing-agent` | Claude Haiku | Tests only (`tests/`) | Vitest unit/component tests, Playwright specs |

### Why Haiku for design and testing?

- **Design agent** produces only a specification document. It reads files and reasons about UX — it does not write code. Haiku is sufficient and 3-5x cheaper.
- **Testing agent** follows clear, repetitive patterns (describe/it/expect). The patterns are specified in `docs/testing/testing-rules.md`. Haiku handles this well at lower cost.
- **Backend and frontend** require more complex reasoning, state management awareness, and TypeScript precision — Sonnet is worth the cost.

---

## Phase Flow and Checkpoints

A typical feature goes through 4 phases with 4 checkpoints:

```
CHECKPOINT 0: Plan approval
  You: "Add pin-to-top feature for todos"
  Coordinator: shows 4-phase plan + token estimate
  → You: yes

Phase 1: design-agent
  Reads existing components, product requirements
  Produces: UI spec (colors, states, layout, a11y notes)
  Writes: .agents/output/design-YYYY-MM-DD-HHmm.md (via coordinator helper)

CHECKPOINT 1: Design review
  Coordinator summarizes spec
  → You: yes (or "edit: show confirmation dialog instead of immediate delete")

Phase 2: backend-agent
  Reads design spec + api-rules + database-rules
  Produces: Zod schema, Server Action, (optionally) Prisma migration
  Writes: lib/validations/todo.ts, app/actions/todos.ts, .agents/output/backend-*.md

CHECKPOINT 2: Backend review
  Coordinator runs: pnpm tsc --noEmit + pnpm test
  Reports pass/fail + diff summary
  → You: yes

Phase 3: frontend-agent
  Reads design spec + backend output + ui-rules
  Produces: React components, pages, loading/error/empty/success states
  Writes: components/features/todos/*, app/todos/page.tsx

CHECKPOINT 3: Frontend review
  Coordinator runs: pnpm tsc --noEmit + pnpm build
  Reports pass/fail + visual description
  → You: yes

Phase 4: testing-agent
  Reads all changed files + testing-rules
  Produces: unit tests, component tests, (optional) E2E spec
  Writes: tests/**/*.test.ts(x)

CHECKPOINT 4 (Final):
  Coordinator runs: pnpm test (full suite)
  Produces: final summary, files changed, security notes, manual QA checklist
  → You: review + commit + (optionally) open PR
```

---

## Semi-Automatic: Why Checkpoints Matter

The pipeline is deliberately **not fully automatic**. The coordinator must stop after every phase and wait for your response. This is enforced by the coordinator's own instructions — it will never proceed to the next phase with a soft implicit "yes".

Reasons:

1. **Agent self-reports are not trusted.** The coordinator runs `tsc` and `vitest` independently after every phase and reports the real results, not the agent's claimed results.
2. **Assumptions need human review.** Every agent's output file has an Assumptions section. An assumption that is wrong at Phase 2 (backend) will propagate through frontend and testing if not caught.
3. **Scope creep is detectable early.** If backend-agent modified files it was not supposed to touch, you see this at CHECKPOINT 2 before frontend-agent builds on top of it.
4. **Cost control.** If the design is wrong, you can stop after Phase 1 (cost: ~21k tokens) rather than discovering the problem after the full pipeline (cost: ~190k tokens).

---

## Parallelization Rules

Backend and frontend agents CAN run in parallel safely. This is validated by Item 1 in `docs/cost-baseline.md`.

**When parallel is safe:**
- The API contract (Zod schemas, action signatures) is clear from the design spec
- Frontend uses mock data or local state while backend is being built
- Neither agent touches the same file

**When sequential is required:**
- Testing agent must always run AFTER backend and frontend (it tests their output)
- Design agent must always run FIRST (it defines what the other agents build)
- If backend is doing a migration that changes a type the frontend depends on, run backend first

**How to request parallelization:**
```
parallelize backend and frontend
```
The coordinator will spawn both agents simultaneously and wait for both to complete before presenting CHECKPOINT 2.

---

## Agent Output Files

Every subagent writes a structured output file to:
```
.agents/output/<agent-name>-<YYYY-MM-DD-HHmm>.md
```

Standard sections:

| Section | Contents |
|---------|----------|
| **Completed** | Checkboxed list of tasks finished |
| **Files** | Every file created or modified (absolute paths) |
| **Assumptions** | Decisions the agent made without asking |
| **Next steps** | Recommendations for the next agent or coordinator |
| **Questions** | Things requiring a developer decision |

These files are **committed to the repository** alongside the feature code. They serve as the audit trail: you can reconstruct why any piece of code was written by reading the output file for that phase.

---

## How Context Is Forwarded

The coordinator reads an agent's output file and forwards a compressed summary to the next agent. What it typically includes:

- Completed tasks (the checkbox list)
- New files created (names + brief purpose)
- Assumptions the developer should be aware of
- Open questions that must be answered before the next phase

What it does NOT forward:
- Full file contents (the next agent reads files itself)
- Raw test output (too verbose; coordinator summarizes pass/fail counts)
- Previous agent's full prompt (irrelevant to the new agent's task)

---

## Coordinator Verification Protocol

After every agent completes, before presenting the checkpoint, the coordinator:

1. **Reads the output file** — checks Completed, Files, Assumptions, Questions
2. **Spot-checks the actual files** — does not rely solely on the agent's summary
3. **Runs `pnpm tsc --noEmit`** — if any backend or frontend files changed
4. **Runs `pnpm vitest run`** — if any test or source files changed
5. **Checks for scope violations** — did the agent touch files it was not supposed to?
6. **Only then presents the checkpoint**

This is the primary safety mechanism. An agent can produce plausible-looking code that compiles but fails tests (as happened in the impossible-instruction experiment). The test suite catches this; agent self-reports do not.

---

## Error Handling in the Pipeline

See [Error-Recovery](Error-Recovery.md) for the full playbook. The short version:

| Failure mode | Coordinator action |
|-------------|-------------------|
| Test suite fails after agent | Revert broken files, diagnose root cause, escalate to user |
| TypeScript errors after agent | Do not proceed to next phase; fix before CHECKPOINT |
| Agent loops (> 10 min or 2 failed retries) | Stop, escalate to user — do not retry forever |
| Scope creep (agent touched wrong files) | Revert out-of-scope changes, continue |
| Design-agent cannot write files | Coordinator spawns a helper agent to write the output file |

---

## What the Coordinator Never Does

- Never writes production application code (only thin glue: output files, settings tweaks)
- Never merges PRs automatically
- Never pushes to `main`
- Never runs `prisma migrate reset`
- Never advances phases without human confirmation
- Never skips tests to make the suite green
- Never logs passwords, tokens, or full PII

---

## GitHub Actions Integration

In addition to local sessions, the coordinator can be triggered from GitHub:

- **`@claude` comment** in any issue or PR → triggers `coordinator-agent` via `claude.yml`
- **PR opened/updated** → triggers automatic review via `claude-review.yml`

See [CI-CD](CI-CD.md) for full workflow details.

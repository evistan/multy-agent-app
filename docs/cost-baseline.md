# Token Cost Baseline

> **How to use this document**
> Each agent call returns token usage metadata. This file records that data per-phase so the team can budget future sessions.
> At the end of every session, run `/cost` in the VSCode Claude Code panel to get the actual USD figure for the full session. Paste it into the "Session totals" table below.

---

## How we measure

- **Source**: Each subagent result includes `total_tokens`, `tool_uses`, and `duration_ms` in its metadata.
- **USD estimate**: Use the Claude Sonnet pricing page. At time of writing: ~$3/MTok input, ~$15/MTok output. The split is not exposed in metadata, so these are estimates.
- **`/cost` command**: Run it in VSCode at session end for the authoritative USD figure.

---

## Item 1: Parallel Execution Test (2026-05-15)

**Task**: Run backend-agent + frontend-agent simultaneously on a minimal "add todo" skeleton.

| Phase | Agent | Tokens | Tool uses | Duration | Notes |
|-------|-------|--------|-----------|----------|-------|
| Parallel backend | backend-agent | 23,222 | 20 | 2.4 min | Zod schema + Server Action |
| Parallel frontend | frontend-agent | 27,500 | 41 | 4.0 min | Page + TodoForm component |
| Coordinator fix | backend-agent (helper) | 11,501 | 2 | 0.1 min | Add zod to package.json |
| **Item 1 total** | | **62,223** | **63** | **6.5 min** | |

**Observations:**
- Frontend agent used 2× the tool calls of backend for roughly the same token count — reads more files (layout, existing components, CSS rules).
- Small coordinator fixes (editing one JSON field) cost ~11k tokens — mainly context loading overhead.

---

## Item 2: Full 4-Agent Pipeline — "Add a New Todo" (2026-05-15)

**Task**: design → backend → frontend → testing, sequential with checkpoints.

| Phase | Agent | Tokens | Tool uses | Duration | Notes |
|-------|-------|--------|-----------|----------|-------|
| Phase 1: Design | design-agent | 21,249 | 20 | 1.1 min | Spec only — no file writes (read-only agent) |
| Coordinator helper | backend-agent (helper) | 16,481 | 4 | 0.9 min | Write design spec to .agents/output/ |
| Phase 2: Backend | backend-agent | 23,730 | 16 | 2.2 min | Harden action, add getTodos, error types |
| Phase 3: Frontend | frontend-agent | 29,954 | 22 | 4.6 min | 5 components, all states, dark mode, a11y |
| Phase 4: Testing | testing-agent | 86,697 | 119 | 39.4 min | 50 new tests across 4 files |
| Coordinator fix | backend-agent (helper) | 11,536 | 3 | 0.3 min | Add vitest/globals to tsconfig.json |
| **Item 2 total** | | **189,647** | **184** | **48.5 min** | |

**Observations:**
- **Testing-agent is the most expensive phase by far**: 86,697 tokens (~46% of Item 2 total), 119 tool uses, 39 minutes. This is because it reads many files, writes 4 test files, runs the test suite, iterates on failures, and re-reads output.
- **Design-agent is the cheapest per-output**: 21,249 tokens for a full UI spec — high value per token because it only reads.
- **Frontend-agent scales with component count**: 29,954 tokens for 5 components. Budget ~6,000 tokens per new component.
- **Backend-agent is consistent**: ~23,000–24,000 tokens whether adding a schema + action (Item 1) or hardening existing code (Item 2). Context loading dominates.

---

## Cumulative session total (Items 1 + 2)

| Metric | Value |
|--------|-------|
| Total subagent tokens | **251,870** |
| Total tool uses | **247** |
| Total agent time | **~55 min** |
| Coordinator overhead | ~23,037 tokens (helper agents) |
| Actual USD this session | _(run `/cost` to get this — paste below)_ |

**USD from `/cost`**: `[paste here after running /cost]`

---

## Cost model per agent type

Based on the data above, here are rough per-call budgets for planning:

| Agent type | Typical tokens | Typical tool uses | When it gets expensive |
|------------|---------------|-------------------|------------------------|
| design-agent | 15,000–25,000 | 10–25 | Large codebases with many existing files to read |
| backend-agent | 20,000–30,000 | 10–25 | Many files to read + migrations + RLS |
| frontend-agent | 25,000–40,000 | 20–50 | Many components, shadcn installs, iteration |
| testing-agent | 50,000–100,000+ | 50–150 | Many test files + run/fix/re-run cycles |
| coordinator helper | 10,000–18,000 | 2–5 | Flat — mostly context overhead |

---

## Recommendations for cost control

1. **Batch test writing**: Give testing-agent multiple features at once rather than one feature per session — the context load cost is amortized.
2. **Pre-read docs for agents**: Include only the relevant `docs/` sections in agent prompts, not all of them — reduces token consumption.
3. **Keep coordinator helpers minimal**: Single-purpose helper agents (e.g., "add one line to package.json") still cost ~11k tokens. For trivial edits, the coordinator can use `Edit` directly.
4. **Parallelize backend + frontend**: Item 1 proved they work safely in parallel — saves 4–5 minutes of wall time and avoids sequential context accumulation.
5. **Run `/cost` at end of each session**: Paste the result here to build a real USD baseline over time.
6. **Clear context between large tasks**: After a full 4-agent pipeline (~190k tokens in subagents), the coordinator context is deep. Run `/clear` before the next independent task.

---

## Template for future sessions

Copy this block after each agent call in a new pipeline:

```
| Phase N: [name] | [agent-type] | [tokens] | [tool_uses] | [duration] | [notes] |
```

And at session end:
```
USD from /cost: $X.XX
```

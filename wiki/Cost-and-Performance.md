# Cost and Performance

This page covers real token measurements from the first AgentFlow pipeline sessions, explains why certain agents cost more than others, and provides practical recommendations for cost control.

---

## Cost Model Overview

AgentFlow uses Claude Sonnet for planning agents (coordinator, backend, frontend) and Claude Haiku for cheaper output-focused agents (design, testing). Pricing is approximate based on Anthropic's Claude API at the time of writing (~$3/MTok input, ~$15/MTok output for Sonnet; Haiku is ~5x cheaper).

### Per-Agent Type Budget

| Agent | Model | Typical tokens | Typical tool uses | Wall time | When it gets expensive |
|-------|-------|---------------|------------------|-----------|------------------------|
| design-agent | Haiku | 15,000–25,000 | 10–25 | 1–2 min | Large codebases with many files to read before writing the spec |
| backend-agent | Sonnet | 20,000–30,000 | 10–25 | 2–3 min | Many files to read + Prisma migrations + RLS policies |
| frontend-agent | Sonnet | 25,000–40,000 | 20–50 | 4–5 min | Many components, shadcn installs, multiple iteration cycles |
| testing-agent | Haiku | 50,000–100,000+ | 50–150 | 10–40 min | Run-fix-rerun cycles; reading many source files before writing |
| coordinator helper | Sonnet | 10,000–18,000 | 2–5 | flat | Context loading overhead dominates; task size matters little |

---

## Real Measurements

### Item 1: Parallel Execution Test (2026-05-15)

**Task:** Run backend-agent + frontend-agent simultaneously on a "add todo" skeleton.

| Phase | Agent | Tokens | Tool uses | Duration | Notes |
|-------|-------|--------|-----------|----------|-------|
| Parallel backend | backend-agent | 23,222 | 20 | 2.4 min | Zod schema + Server Action |
| Parallel frontend | frontend-agent | 27,500 | 41 | 4.0 min | Page + TodoForm component |
| Coordinator fix | backend-agent (helper) | 11,501 | 2 | 0.1 min | Add zod to package.json |
| **Total** | | **62,223** | **63** | **6.5 min** | |

**Key observations:**
- Frontend uses 2x the tool calls of backend for a similar token count — it reads more files (layout, existing components, CSS rules)
- Small coordinator fixes (~11k tokens) are expensive relative to their output because context loading dominates the cost

---

### Item 2: Full 4-Agent Pipeline — "Add a New Todo" (2026-05-15)

**Task:** Complete pipeline: design → backend → frontend → testing, sequential with checkpoints.

| Phase | Agent | Tokens | Tool uses | Duration | Notes |
|-------|-------|--------|-----------|----------|-------|
| Phase 1: Design | design-agent | 21,249 | 20 | 1.1 min | Spec only — no file writes |
| Coordinator helper | backend-agent (helper) | 16,481 | 4 | 0.9 min | Write design spec to `.agents/output/` |
| Phase 2: Backend | backend-agent | 23,730 | 16 | 2.2 min | Harden action, add getTodos, error types |
| Phase 3: Frontend | frontend-agent | 29,954 | 22 | 4.6 min | 5 components, all states, dark mode, a11y |
| Phase 4: Testing | testing-agent | 86,697 | 119 | 39.4 min | 50 new tests across 4 test files |
| Coordinator fix | backend-agent (helper) | 11,536 | 3 | 0.3 min | Add vitest/globals to tsconfig.json |
| **Total** | | **189,647** | **184** | **48.5 min** | |

---

### Cumulative (Items 1 + 2)

| Metric | Value |
|--------|-------|
| Total subagent tokens | 251,870 |
| Total tool uses | 247 |
| Total wall time | ~55 min |
| Coordinator overhead | ~23,037 tokens (helper agents) |

---

## Why Testing-Agent Is the Most Expensive

Testing-agent consumed **87k tokens (46% of the full pipeline)** and ran for **39 minutes** in Item 2, despite being a Haiku model.

The reason is the run-fix-rerun cycle:

```
1. Read all source files that changed (~15-20k tokens of context)
2. Write test file 1
3. Run pnpm vitest run → read failure output
4. Fix the test or mock
5. Run again → read output again
6. Write test file 2
7. Run again (full suite)
...repeat for each test file
```

Each run-fix-rerun cycle adds approximately 10–15k tokens. With 4 test files and 50 tests, this adds up quickly.

### Cost Breakdown (Item 2 Testing Phase)

| Activity | Approximate tokens |
|----------|--------------------|
| Initial file reading (source + existing tests) | ~20k |
| Writing 4 test files | ~15k |
| Test run outputs (vitest output is verbose) | ~25k |
| Fix cycles and re-reads | ~25k |
| **Total** | **~85k** |

---

## Cost Control Recommendations

### 1. Batch test writing across multiple features

Instead of running testing-agent for each feature separately, wait and batch them:

```
Use testing-agent to write tests for the following three features we just built:
1. Pin todo (togglePinTodo action + TodoItem pin button)
2. Delete with confirmation (new ConfirmDialog component)
3. Mark as done (toggleComplete action)
```

The context load cost (~20k tokens) is paid once, and the test writing is amortized.

### 2. Provide precise prompts with exact file paths

```
// VAGUE (expensive — agent reads everything)
Use testing-agent to add tests.

// PRECISE (cheaper — agent reads only what it needs)
Use testing-agent to add tests for:
- app/actions/todos.ts: togglePinTodo (3 cases: success, not found, already pinned)
- components/features/todos/TodoItem.tsx: pin button states (default, pending, pinned)
Include only these files. Do not add tests for unrelated components.
```

### 3. Parallelize backend and frontend

Backend and frontend can run simultaneously when the API contract is defined. This saves 4–5 minutes of wall time and reduces sequential context accumulation in the coordinator.

```
// In your checkpoint response:
yes, and parallelize backend and frontend
```

### 4. Use coordinator helpers sparingly

Small coordinator fixes (adding one line to `package.json`, adding one type to `tsconfig.json`) still cost ~11k tokens in context loading. For very trivial edits, the coordinator can make the edit itself using the `Edit` tool without spawning a subagent.

### 5. Run `/clear` between independent tasks

After a full 4-agent pipeline (~190k subagent tokens), the coordinator session context is deep. Starting a new, unrelated feature in the same session adds overhead. Run `/clear` first.

### 6. Keep coordinator helpers minimal

Each coordinator helper agent call (e.g., "write this design spec to disk") costs ~16k tokens. For the design-agent write, this is unavoidable. For everything else, the coordinator should use its own tools.

---

## Approximate USD by Feature Size

Based on Item 2 measurements and the Sonnet/Haiku pricing at time of writing:

| Feature size | Description | Tokens (approx) | USD (approx) |
|-------------|-------------|----------------|-------------|
| Small bug fix | 1 file, 1 fix, no pipeline needed | 5k–15k | $0.05–$0.15 |
| Quick change | 1 component change, no full pipeline | 25k–40k | $0.40–$0.80 |
| Small feature | 1 endpoint + 1 UI component + tests | 80k–120k | $1.50–$3 |
| Medium feature | 1–2 endpoints + 2–3 components + tests | 150k–200k | $3–$5 |
| Large feature | 3–5 screens + multiple endpoints + tests | 250k–400k | $5–$10 |
| Full auth implementation | Register, login, forgot password, session | 300k–600k | $6–$15 |

> These estimates use mixed Sonnet + Haiku (as the system is configured). All-Sonnet would be ~2x the estimate. All-Haiku would be ~0.2x — usable for very simple tasks where code quality is less critical.

---

## Token Scaling by Agent Count

The cost does not scale linearly with features because of context load overhead:

```
1 feature (4-agent pipeline):   ~190k tokens
2 features (if batched):        ~280k tokens  (not 380k — shared context)
3 features (if batched):        ~350k tokens  (not 570k)
```

This is why batching — especially for the testing phase — is the single most impactful cost-saving measure.

---

## Tracking Your Costs

At the end of every session:

1. Run `/cost` in the Claude Code panel
2. Note the USD figure
3. Paste it into `docs/cost-baseline.md` under the relevant session

The `docs/cost-baseline.md` file has a template for recording per-phase token counts. Use it to build a real baseline over time for your project's specific tasks.

---

## When to Use `use haiku for everything`

You can tell the coordinator to use Haiku for all agents:

```
use haiku for everything
```

This is 3-5x cheaper but produces lower-quality output for complex code. Recommended only for:
- Prototypes where correctness is not critical
- Very simple one-file changes
- Situations where you plan to heavily review and edit the output

Not recommended for:
- Production features
- Any backend code with auth/security implications
- Complex React components with many states

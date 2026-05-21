# Error Recovery

This page covers how subagent failures are detected, classified, and recovered from. It is based on a live experiment conducted on 2026-05-15 and the failure patterns observed during the initial pipeline setup.

---

## Failure Mode Taxonomy

Subagents can fail in five distinct ways. Each has a different detection method and recovery procedure.

| Mode | Description | How detected | Recovery |
|------|-------------|-------------|---------|
| **Partial success** | Task half-done; production code modified but broken | Test suite fails | Revert modified files to last known-good; re-run tests to confirm green |
| **Silent wrong output** | Task appears done, code compiles, but logic is wrong | Test assertions fail (not type errors) | Fix the specific logic; re-run tests |
| **Hard crash** | Agent errors out with no output file written | No `.agents/output/` file produced; coordinator has no result | Re-run with narrower scope; split the task into smaller pieces |
| **Scope creep** | Agent modifies files outside its permission boundary | Coordinator file-diff check catches unexpected modifications | Revert out-of-scope changes; re-run the agent with clearer boundaries |
| **Infinite retry** | Agent loops trying to fix an unfixable problem | Duration exceeds 10 minutes, or 2+ failed iterations on the same task | Stop immediately; escalate to user; do not retry on broken state |

---

## The Impossible-Instruction Experiment

On 2026-05-15, the coordinator deliberately gave backend-agent a set of false preconditions to test failure behavior:

> "Migrate the in-memory todo store to PostgreSQL using Prisma ORM. The project already has Prisma installed and a PostgreSQL database configured via DATABASE_URL in .env."

### Why it was impossible

| Claim in prompt | Reality |
|----------------|---------|
| "Prisma is already installed" | `@prisma/client` was NOT in `package.json` |
| "DATABASE_URL is in .env" | There was no `.env` file at all |
| "Database is configured" | No PostgreSQL server was reachable |

### What the Agent Did

The agent did NOT crash or refuse. It entered **partial success** mode:

1. Read the codebase — found no Prisma, contradicting the brief
2. Installed Prisma anyway (`@prisma/client` + `prisma` via npm)
3. Created `prisma/schema.prisma` with a correct `Todo` model
4. Created `lib/prisma.ts` (correct Next.js singleton pattern)
5. Replaced the in-memory store in `app/actions/todos.ts` with Prisma calls
6. Attempted `pnpm prisma migrate dev` — **failed** with `P1001: Can't reach database server`
7. Reported everything clearly in its output file: what succeeded, what failed, what the user must provide

**Key insight:** The agent was not deceptive. It identified the false preconditions, worked around them as far as it could, and reported the gap accurately. The problem was that it made **real, breaking changes** to production code (`app/actions/todos.ts`) even though it could not complete the task.

### Detection

The coordinator ran `pnpm vitest run` after the agent completed (standard post-phase protocol).

```
Test Files  1 failed | 4 passed (5)
Tests       6 failed | 55 passed (61)
```

The 6 failing tests were in `tests/unit/actions/todos.test.ts`. The Prisma calls in `createTodo` and `getTodos` hit the try/catch block (no DB reachable) and returned `INTERNAL_ERROR` instead of `{ data: Todo }`.

**This is the critical mechanism:** the coordinator does not trust the agent's self-reported success. Running the test suite independently is the only reliable detection method.

### Recovery Steps Applied

```
Step 1: DETECT
  pnpm vitest run → 6 tests fail → broken state confirmed

Step 2: ASSESS
  Read app/actions/todos.ts → Prisma imports found → root cause: DB not reachable
  Check other files → prisma/schema.prisma, lib/prisma.ts → not imported, not breaking
  Check package.json → Prisma packages added → acceptable side effect

Step 3: CONTAIN
  This is a precondition failure, not a fixable bug → 0 retries
  Rule: revert directly, do not loop

Step 4: REVERT
  Restore app/actions/todos.ts to last known-good (in-memory store version)
  pnpm tsc --noEmit → PASS
  pnpm vitest run → 61/61 PASS

Step 5: PRESERVE USEFUL ARTIFACTS
  prisma/schema.prisma → KEEP (correct schema, ready for real migration)
  lib/prisma.ts → KEEP (correct singleton, safe while not imported)
  package.json Prisma entries → KEEP (needed for real migration later)

Step 6: DOCUMENT
  Write this playbook
```

### Leftover Artifacts

After recovery, these files exist but are not imported anywhere:

| File | Status | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Keep | Correct `Todo` model, ready for real migration |
| `lib/prisma.ts` | Keep | Correct Next.js singleton pattern |
| `@prisma/client` + `prisma` in `package.json` | Keep | Will be needed; run `pnpm install` to sync lockfile |

---

## Coordinator Error-Handling Rules

These rules are enforced by the coordinator's instructions:

1. **Never trust self-reported success.** Always run `pnpm tsc --noEmit` and `pnpm vitest run` independently after every agent phase.

2. **The test suite is the source of truth.** If tests pass, the code is good. If tests fail, the code is broken — regardless of what the agent claims.

3. **Maximum 2 retry iterations.** If the same agent fails twice on the same task, stop and escalate to the user. Never loop indefinitely.

4. **Revert before retrying.** Never retry on top of broken state. Restore the last known-good version of all modified files, verify tests are green, then retry with a corrected prompt.

5. **Preserve useful side effects.** Files created by the agent that are not imported and do not break tests may be worth keeping even if the task itself failed. Evaluate case by case.

6. **Classify before recovering.** Precondition failures (false infrastructure claims) are not retryable without fixing the precondition first. Logic bugs are retryable with a clearer prompt.

7. **Document what changed.** Even a failed task may have left useful artifacts or revealed a design gap. Write it to `.agents/output/`.

---

## Red Flags: Precondition Failure Phrases

If a prompt you write (or that the coordinator auto-generates) contains any of these phrases, stop and verify the claim manually before delegating:

| Red flag phrase | How to verify |
|----------------|--------------|
| "The database is already configured" | Check `.env` for `DATABASE_URL`; check `prisma/migrations/` |
| "The package is already installed" | Check `package.json` dependencies |
| "The environment variable is already set" | Check `.env` and `.env.example` |
| "The migration has already run" | Check `prisma/migrations/` for SQL files |
| "Auth is already set up" | Check `lib/auth.ts` and `app/api/auth/` |
| "The test setup is already configured" | Check `vitest.config.ts` and `tests/setup.ts` |

**Coordinator action:** Before delegating, read the relevant files to verify claims. If a claim is false, either correct the prompt or tell the user what infrastructure is missing and ask them to set it up first.

---

## Quick Recovery Checklist

When a subagent produces a broken result, run through this checklist:

- [ ] Run `pnpm vitest run` — how many tests fail? (establishes the blast radius)
- [ ] Run `pnpm tsc --noEmit` — any TypeScript errors? (separate from test failures)
- [ ] Run `git diff` — which files were modified? (find the scope)
- [ ] Classify the failure: precondition failure / logic bug / scope creep / hard crash / infinite retry
- [ ] Revert only the broken production files to last known-good
- [ ] Re-run `pnpm vitest run` — confirm 100% green before continuing
- [ ] Decide: retry with corrected prompt / escalate to user / keep useful artifacts
- [ ] Write what happened to `.agents/output/<agent-name>-<YYYY-MM-DD-HHmm>.md`
- [ ] If scope creep: tighten the agent's file permission instructions before next run

---

## How to Revert a Broken File

### Using git

```bash
# Revert a single file to the last committed version
git checkout HEAD -- app/actions/todos.ts

# Verify the revert
pnpm vitest run
```

### Using the coordinator

If you are in a live coordinator session:

```
The app/actions/todos.ts file was broken by the last agent run.
Restore it to the last working version. The correct version uses
the in-memory store (the todos Map), not Prisma.
```

The coordinator will use its `Write` or `Edit` tool to restore the file, then run `vitest run` to confirm.

---

## How to Handle Hard Crashes

If an agent produces no output file and the coordinator reports an error:

1. Check if any files were partially modified (`git diff`)
2. Revert any partial changes
3. Restart with a narrower task scope — the original task may have been too large
4. Split the task: instead of "migrate the whole database", try "add isPinned to Prisma schema" and "update createTodo to use Prisma" as two separate tasks

If the crash is reproducible with the same prompt, it may indicate a prompt that triggers an agent loop. Rephrase the task or remove the scope creep trigger.

---

## Failure History Log

### 2026-05-15: Impossible Instruction Test

- **Agent:** backend-agent
- **Task:** Migrate in-memory store to Prisma with false preconditions
- **Failure mode:** Partial success
- **Detection:** 6 unit tests failed (INTERNAL_ERROR from Prisma connection failure)
- **Recovery:** Reverted `app/actions/todos.ts`; kept `prisma/schema.prisma`, `lib/prisma.ts`, package.json Prisma entries
- **Tests after recovery:** 61/61 PASS
- **Useful artifacts preserved:** Yes — Prisma schema, singleton, package entries
- **Output file:** `.agents/output/backend-impossible-2026-05-15-1700.md`

### 2026-05-15: Vitest Globals TypeScript Error

- **Agent:** testing-agent
- **Task:** Add tests for the "add todo" feature
- **Failure mode:** Silent wrong output (TypeScript error not a runtime failure)
- **Detection:** `pnpm tsc --noEmit` produced ~150 errors after the agent added `globals: true` to vitest config without updating `tsconfig.json`
- **Recovery:** Added `"types": ["vitest/globals"]` to `tsconfig.json`
- **Fix applied by:** Coordinator helper (backend-agent, thin call)
- **Tokens for fix:** ~11,536
- **Output file:** `.agents/output/backend-2026-05-15-1200.md`

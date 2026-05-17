# Team Handover: Claude Multi-Agent Pipeline

> **Audience**: Any developer picking up this project for the first time, or returning after a break.
> **What this covers**: How to start a session, how checkpoints work, how to read agent output files, and common pitfalls discovered during setup (Items 1–5, 2026-05-15).

---

## 1. What Is This System?

This project uses a **coordinator + subagent architecture** inside Claude Code (VSCode extension). Instead of asking Claude to do everything in one conversation, the coordinator breaks work into phases and delegates each to a specialist subagent:

| Agent | Role | Can write files? |
|-------|------|-----------------|
| `design-agent` | UX/UI specification — no code | ❌ Read-only |
| `backend-agent` | API routes, Server Actions, Prisma, auth | ✅ Yes |
| `frontend-agent` | React components, Tailwind, forms | ✅ Yes |
| `testing-agent` | Vitest + Playwright tests only | ✅ Tests only |
| coordinator | Plans, delegates, integrates, runs checks | ✅ Yes (thin layer) |

The coordinator is the **main thread** in your Claude Code session. It never writes production code itself — it reads, plans, delegates, verifies, and reports back to you.

---

## 2. How to Start a Session

### Prerequisites
- VSCode with the Claude Code extension installed and authenticated
- Node.js 22+ and pnpm on PATH (or npm as fallback)
- The repo cloned locally

### Step 1 — Open the project in VSCode
```
code c:\path\to\multy-agent-app
```

### Step 2 — Read the constitution first
Before giving Claude any task, it automatically loads `CLAUDE.md`. Skim it yourself too — it defines what agents are allowed to do and what is forbidden.

### Step 3 — Give the coordinator a task
Write your feature request or bug description in plain English. Example:
```
I need a delete todo feature. The user should be able to remove a todo from the list with a confirmation step.
```

The coordinator will:
1. Paraphrase the request to confirm understanding
2. Ask 1–3 clarifying questions **only if genuinely ambiguous**
3. Show you a phased plan (design → backend → frontend → testing)
4. Ask for your go-ahead before starting Phase 1

### Step 4 — Confirm each checkpoint
After every phase, the coordinator stops and shows you what was done. You say **yes** (proceed), **no** (stop), **edit** (change something), or **question** (ask something). You are always in control.

### Step 5 — Review the final summary
After all phases, the coordinator shows a full summary: files changed, test results, security notes, and a manual QA checklist. You review and merge — Claude never pushes or merges.

---

## 3. How Checkpoints Work

Checkpoints are **mandatory stops** between every phase. The coordinator MUST NOT skip them unless you explicitly say "do everything to the end without pausing."

### Checkpoint format
```
✅ Phase N (agent-name) done.
- Bullet summary of what was produced
- Output: .agents/output/agent-YYYY-MM-DD-HHMM.md

[CHECKPOINT N] Proceed with phase N+1? (yes / no / edit / question)
```

### Your valid responses

| Response | What happens |
|----------|-------------|
| `yes` | Coordinator launches the next phase |
| `no` | Everything stops; you decide what to do next |
| `edit` | Describe what to change; coordinator adjusts the next agent's prompt |
| `question` | Ask anything; coordinator answers before proceeding |

### What the coordinator checks before each checkpoint
After every agent completes, before presenting the checkpoint, the coordinator:
1. Reads the agent's output file
2. Spot-checks the actual changed files (not just the agent's summary)
3. Runs `tsc --noEmit` and `vitest run` if backend or test files changed
4. Only then presents the checkpoint

**This is the safety net** — agent self-reports are not trusted. The test suite is the source of truth.

---

## 4. How to Read Agent Output Files

Every subagent writes its result to:
```
.agents/output/<agent-name>-<YYYY-MM-DD-HHMM>.md
```

### Standard sections

| Section | What it contains |
|---------|-----------------|
| **Completed** | Checkboxed list of tasks finished |
| **Files** | Every file created or modified (with path) |
| **Assumptions** | Decisions the agent made without asking you |
| **Next steps** | What the coordinator or next agent should do |
| **Questions** | Things that need a developer decision |

### How the coordinator uses output files

The coordinator reads output files and forwards **only the relevant parts** to the next agent. Agents do not have shared memory — each starts fresh. The coordinator is the only thread with full context.

### Reading them yourself

Open any `.agents/output/` file to audit what an agent did. Pay attention to:
- **Assumptions** — these are where silent decisions happen. If an assumption is wrong, correct it before the next phase.
- **Questions** — unanswered questions accumulate. Review them before closing the session.
- **Files** — cross-check against `git diff` to confirm the agent stayed in scope.

### Current output files in this project
```
.agents/output/
├── design-2026-05-12-1000.md       # Theme toggle design spec
├── frontend-2026-05-12-1010.md     # Theme toggle implementation
├── testing-2026-05-12-1815.md      # Theme toggle tests
├── backend-2026-05-15-1200.md      # Build memory fix
├── design-2026-05-15-1400.md       # Add Todo design spec (Item 2)
├── backend-2026-05-15-1500.md      # Add Todo backend hardening
├── frontend-2026-05-15-1500.md     # Add Todo frontend polish
├── testing-2026-05-15-1600.md      # Add Todo tests (50 tests)
└── backend-impossible-2026-05-15-1700.md  # Failed Prisma experiment (Item 4)
```

---

## 5. Common Pitfalls (Discovered During Setup)

These are real problems encountered during the setup pipeline (Items 1–5) and how to avoid them.

---

### Pitfall 1 — "Partial success" is the most dangerous failure mode

**What happened (Item 4):** The coordinator gave backend-agent a task with false preconditions ("DATABASE_URL is already configured"). The agent didn't refuse — it installed Prisma, created the schema, and rewrote `app/actions/todos.ts` to use Prisma. TypeScript passed. But 6 unit tests failed because there was no real database.

**Why it's dangerous:** The code _looks_ correct. TypeScript passes. Only the test suite exposes the break.

**How to avoid it:**
- Always verify infrastructure claims before putting them in an agent prompt (check `package.json`, `.env.example`, `prisma/schema.prisma`)
- Watch for these phrases in prompts you write — they are red flags:
  - "The database is already configured"
  - "The package is already installed"
  - "The environment variable is already set"
- Never skip the post-agent `vitest run` check

**Recovery:** Revert the broken file to last known-good, re-run tests to confirm green, keep useful side effects (the schema file was correct and worth keeping).

See: [docs/error-recovery.md](error-recovery.md) for the full recovery playbook.

---

### Pitfall 2 — frontend-agent uses npm when pnpm is not on PATH

**What happened (Items 1 & 3):** The frontend-agent's shell environment didn't have `pnpm` on PATH, so it fell back to `npm install react-hook-form`. This causes `pnpm-lock.yaml` drift.

**How to avoid it:**
- After any agent session that installs packages, run `pnpm install` yourself in the terminal to resync the lockfile
- When writing frontend-agent prompts, note: "pnpm may not be on PATH — you may need to use npm as a fallback, and the coordinator will resync the lockfile"

---

### Pitfall 3 — design-agent cannot write files

**What happened (Item 2):** The design-agent produced a thorough spec but reported it couldn't write to `.agents/output/` because it has no file-write tools (read-only by design). The coordinator had to spawn a helper backend-agent to write the file.

**How to avoid it:**
- This is expected behaviour, not a bug. The coordinator always writes design-agent output to disk.
- Budget one extra small agent call per pipeline for the design output write (~16k tokens, ~1 min).

---

### Pitfall 4 — vitest globals need tsconfig declaration

**What happened (Item 2):** The testing-agent added `globals: true` to `vitest.config.ts` so tests don't need to `import { describe, it, expect }`. This works at runtime but TypeScript doesn't know about the globals — `tsc --noEmit` produced ~150 errors.

**Fix applied:** Added `"types": ["vitest/globals"]` to `tsconfig.json` `compilerOptions`.

**How to avoid it:** This fix is already in place. If you add a new `vitest.config.ts` in a sub-package or workspace, remember to add the same `types` entry to its `tsconfig.json`.

---

### Pitfall 5 — testing-agent is by far the most expensive phase

**What was measured (Item 3):** In a 4-agent pipeline for a single feature, the testing-agent consumed 87k tokens — 46% of all subagent tokens — and took 39 minutes. The other three agents combined used ~93k tokens.

**Why:** The testing-agent reads many files, writes multiple test files, runs the suite, reads failures, iterates, runs again. Each run-fix-rerun cycle adds ~10–15k tokens.

**How to manage costs:**
- Batch testing across multiple features when possible — the context load cost is amortised
- Give the testing-agent very precise prompts with exact file paths and test cases — reduces exploration
- See [docs/cost-baseline.md](cost-baseline.md) for full token breakdown

---

### Pitfall 6 — The todo list doesn't refresh after adding a todo

**What happened (Item 2):** The `TodoList` is server-rendered in `app/todos/page.tsx`. After `createTodo` succeeds in `TodoForm`, the list doesn't update without a page reload.

**Fix (not yet applied):** Call `router.refresh()` from `TodoForm` after a successful submit:
```ts
import { useRouter } from "next/navigation";
const router = useRouter();
// inside onSubmit, after success:
router.refresh();
```

This triggers Next.js to re-run the Server Component and re-fetch `getTodos()`.

---

### Pitfall 7 — `scripts/clean.js` has a pre-existing lint error

**What was discovered:** `scripts/clean.js` uses `require()` which triggers ESLint's `no-require-imports` rule. This error predates the multi-agent setup work and is unrelated to any feature.

**Current workaround:** Run lint with `--ignore-pattern scripts/` when checking feature code. Fix: convert `scripts/clean.js` to ES module syntax (`import fs from 'fs'`).

---

## 6. Definition of Done (Reminder)

A task is NOT done until all of these pass:

```
✅ pnpm build           — production build succeeds
✅ tsc --noEmit         — zero TypeScript errors
✅ eslint               — zero lint errors (excluding pre-existing issues)
✅ vitest run           — all tests green
✅ No secrets in code   — no hardcoded keys, no .env committed
✅ All UI states        — loading / empty / error / success all implemented
✅ Auth checks present  — every mutation checks session (or has a TODO stub with explanation)
✅ Manual QA checklist  — coordinator provides it, you complete it
```

---

## 7. Session Hygiene

- **Run `/cost` at the end of every session** and paste the USD figure into [docs/cost-baseline.md](cost-baseline.md)
- **Run `/clear` between large independent tasks** — after a full 4-agent pipeline the coordinator context is deep (~250k subagent tokens). Starting fresh keeps responses sharp.
- **Commit agent output files** — `.agents/output/*.md` files are part of the audit trail. Commit them with the feature.
- **Never commit `.env`** — it is already in `.gitignore`. If it isn't, add it immediately.
- **Check `AGENTS.md`** if it exists — it may contain per-repo agent configuration that overrides defaults.

---

## 8. Quick-Start Cheat Sheet

```
1. Open project in VSCode
2. Describe the feature in plain English to the coordinator
3. Review the plan → say "yes" to start
4. At each checkpoint: yes / no / edit / question
5. After final summary: do the manual QA checklist
6. Run /cost → paste into docs/cost-baseline.md
7. Commit (agent output files included)
8. Run /clear before the next independent task
```

For a full command reference, see [CHEAT_SHEET.md](../CHEAT_SHEET.md).
For cost data, see [docs/cost-baseline.md](cost-baseline.md).
For error recovery, see [docs/error-recovery.md](error-recovery.md).

# Getting Started

This page covers everything you need to run AgentFlow locally, launch the coordinator, and give it your first task.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 22+ | Required by Next.js 16 |
| pnpm | 9+ | `npm install -g pnpm` if not installed |
| Claude Code | Latest | `npm install -g @anthropic-ai/claude-code` |
| Anthropic API key | — | From [console.anthropic.com](https://console.anthropic.com) |
| Git | Any recent | For cloning and committing |
| VSCode (recommended) | Latest | Claude Code extension works best here |

You do NOT need:
- A running PostgreSQL database (in-memory store works for development)
- Any external accounts beyond Anthropic (GitHub Actions is optional)

---

## Installation (5 Steps)

### Step 1 — Clone the repository

```bash
git clone <repo-url>
cd multy-agent-app
```

### Step 2 — Install dependencies

```bash
pnpm install
```

This installs all Next.js, React, Zod, Vitest, and Prisma dependencies. The Prisma client packages are already in `package.json` from the impossible-instruction experiment — see [Error-Recovery](Error-Recovery.md) for context.

### Step 3 — Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the AgentFlow home page with the Todo App listed as the first project.

### Step 4 — Run the test suite to verify your environment

```bash
pnpm test
```

All tests should pass. If any fail, check the [Testing](Testing.md) page for troubleshooting.

### Step 5 — Launch the coordinator agent

```bash
claude --agent coordinator-agent
```

> **Critical:** You must launch with `--agent coordinator-agent`. Launching with just `claude` will start a regular Claude session without the ability to delegate to subagents — the `Agent(...)` tool only works when the coordinator runs as the main thread.

To avoid typing the flag every time, add this to `.claude/settings.json`:
```json
{ "agent": "coordinator-agent" }
```

This is already pre-configured in this repository.

---

## Verify Agents Are Loaded

After launching, type:

```
> /agents
```

You should see 5 agents under "Project":

```
Project agents:
  coordinator-agent   Plans, delegates, integrates
  design-agent        UI/UX specification (read-only)
  frontend-agent      React/Next.js components
  backend-agent       API, Server Actions, Prisma
  testing-agent       Vitest + Playwright tests
```

If you see fewer agents, verify that all `.md` files exist in `.claude/agents/`.

---

## Your First Task

Once the coordinator is running, describe what you want in plain English. Example:

```
I need a feature: users can pin important todos to the top of the list.
A pinned todo should stay above regular todos regardless of creation order.
```

The coordinator will:

1. **Paraphrase your request** to confirm it understood correctly
2. **Ask 1–3 clarifying questions** only if genuinely ambiguous
3. **Show you a phased plan** (e.g., design → backend → frontend → testing)
4. **Show token estimate** for the full pipeline
5. **Ask for confirmation** before starting Phase 1

```
[CHECKPOINT 0] May I proceed with Phase 1 (design-agent)? (yes / no / edit plan)
```

Type `yes` to begin. After each phase you will see another checkpoint. See the [Architecture](Architecture.md) page for the full checkpoint flow.

---

## Checkpoint Responses

| Response | What happens |
|----------|-------------|
| `yes` or `proceed` | Coordinator launches the next phase |
| `no` | Everything stops; you decide what to do next |
| `edit` | Describe the change; coordinator adjusts the next agent's prompt |
| `question` | Ask anything; coordinator answers before proceeding |
| `stop` | Pauses the workflow at any point |
| `show plan` | Shows where you are in the current plan |
| `show diff` | Shows what the agents have changed so far |

---

## Build and Lint Verification

After any agent session, run these checks yourself before committing:

```bash
pnpm build           # Production build must succeed
pnpm tsc --noEmit    # Zero TypeScript errors
pnpm lint            # Zero lint errors (see note below)
pnpm test            # All tests green
```

> **Note on lint:** `scripts/clean.js` has a pre-existing `no-require-imports` ESLint error that predates this project. Run lint as normal — only the `scripts/` folder triggers this. Everything in `app/`, `lib/`, `components/`, and `tests/` should be lint-clean.

---

## Session Hygiene Tips

Good habits that prevent wasted tokens and context pollution:

### Run `/cost` at the end of every session

```
> /cost
```

This shows your actual USD spend for the session. Paste the result into `docs/cost-baseline.md` to build a real cost baseline over time. See [Cost-and-Performance](Cost-and-Performance.md) for context on what costs are typical.

### Run `/clear` between independent tasks

After a full 4-agent pipeline, the coordinator has accumulated roughly 250k subagent tokens in context. Starting a new, unrelated feature in the same session will be slower and more expensive.

```
> /clear
```

Then re-launch with `claude --agent coordinator-agent` for the next task.

### Commit agent output files

Every subagent writes an output file to `.agents/output/<agent-name>-<YYYY-MM-DD-HHmm>.md`. These are your audit trail — commit them alongside the feature code.

```bash
git add .agents/output/
git commit -m "feat: add pin feature [+ agent output files]"
```

### Never commit `.env`

The `.env` file is in `.gitignore`. If it ever appears in `git status`, stop immediately and verify it is excluded before committing.

### Check for assumption drift

After each agent completes, read its output file's **Assumptions** section before proceeding. If an assumption is wrong, correct it in the next agent's prompt rather than discovering the problem at the testing phase.

---

## Common First-Session Mistakes

| Mistake | What goes wrong | Fix |
|---------|----------------|-----|
| Launch with just `claude` (no `--agent`) | Coordinator cannot delegate to subagents | Always use `claude --agent coordinator-agent` |
| Ask for too large a feature in one request | Coordinator gets lost, produces vague plan | Break into smaller features; one user story at a time |
| Say "yes" without reading the checkpoint summary | Silent wrong output slips through | Read the checkpoint summary carefully before approving |
| Skip `pnpm test` after agent session | Broken code looks correct until CI catches it | Always run the test suite independently |
| Ignore the Assumptions section in output files | Agent made wrong decisions you don't discover until late | Review Assumptions at every checkpoint |

---

## Where to Go Next

- [Architecture](Architecture.md) — understand how the agents communicate and how parallelization works
- [Agents-Reference](Agents-Reference.md) — detailed guide to each agent's capabilities and how to prompt it
- [Prompt-Examples](Prompt-Examples.md) — copy-paste prompt templates for common task types
- [Cost-and-Performance](Cost-and-Performance.md) — understand what each agent costs before running a big pipeline

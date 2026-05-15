# Hybrid Multi-Agent Setup for Next.js + Claude Code

Complete setup: 1 coordinator + 4 specialized agents, semi-automatic flow, GitHub Actions integration, Next.js patterns.

## ⚠️ CRITICAL NOTE BEFORE YOU START

**The coordinator agent MUST be launched with `claude --agent coordinator-agent`** — NOT just `claude`.

Why: the `Agent(...)` allowlist in the `tools` field (which the coordinator uses to delegate to other agents) works **only when an agent runs as the main thread**. Regular subagents cannot spawn other subagents — this is a hard limit of Claude Code.

Wrong:
```bash
claude
> "Use coordinator-agent to..."   # ❌ Coordinator won't be able to delegate
```

Correct:
```bash
claude --agent coordinator-agent
> "Add search feature to band collections"   # ✅ Works
```

To avoid typing the flag every time, add to `.claude/settings.json`:
```json
{ "agent": "coordinator-agent" }
```

(This is already pre-configured in this setup.)

## Architecture

```
┌──────────────────────────────────────────────┐
│  YOU (developer) — confirm between phases    │
├──────────────────────────────────────────────┤
│  coordinator-agent (main thread, sonnet)     │
│  - decomposes task, plans, asks confirmation │
│  - delegates phase by phase                  │
│  - integrates results                        │
└──────┬───────────────────────────────────────┘
       │ via Agent(...) tool
   ┌───┼─────────┬─────────┬─────────┐
   ▼   ▼         ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│design  │ │frontend│ │backend │ │testing │
│(haiku) │ │(sonnet)│ │(sonnet)│ │(haiku) │
│plan    │ │default │ │default │ │default │
│mode    │ │mode    │ │mode    │ │mode    │
└────────┘ └────────┘ └────────┘ └────────┘
```

**Model strategy (token savings)**:
- coordinator + frontend + backend = sonnet (planning + writing code)
- design = haiku (specs, not code — haiku is sufficient and 3-5x cheaper)
- testing = haiku (tests follow clear patterns)

## Folder structure

```
your-project/
├── .claude/
│   ├── agents/
│   │   ├── coordinator-agent.md
│   │   ├── design-agent.md
│   │   ├── frontend-agent.md
│   │   ├── backend-agent.md
│   │   └── testing-agent.md
│   └── settings.json
│
├── .github/
│   └── workflows/
│       ├── claude.yml           # @claude in issue/PR comments
│       └── claude-review.yml    # automatic PR review
│
├── docs/
│   ├── product/
│   │   ├── requirements.md      # your product, user stories
│   │   └── user-stories.md
│   ├── design/
│   │   └── ui-rules.md          # Tailwind/shadcn conventions
│   ├── backend/
│   │   ├── api-rules.md         # Server Actions, REST conventions
│   │   └── database-rules.md    # Prisma/Supabase RLS
│   └── testing/
│       └── testing-rules.md     # Vitest/Playwright patterns
│
└── CLAUDE.md                    # main project rules
```

## Semi-automatic flow (with checkpoints)

The coordinator pauses **after every phase** and asks you:

```
You: Add user profile editing with avatar upload.

Coordinator:
PLAN (5 phases):
  1. design-agent → form, validations, error states
  2. backend-agent → API + storage for image + RLS
  3. frontend-agent → components
  4. testing-agent → e2e + unit
  5. integration + manual QA list

Estimate: ~6 subagent calls, ~15-25 min.
[CHECKPOINT 0] May I proceed with phase 1? (yes/no/edit plan)

You: yes

[design-agent works in its own context]

Coordinator:
Phase 1 done.
Summary: 3-step form, validation on email and avatar size, 4 error states.
Output: .agents/output/design-2026-05-12.md

[CHECKPOINT 1] Proceed with phase 2 (backend)? (yes/no/question)

You: question — what image formats?

Coordinator: PNG/JPEG, max 5MB, client-side resize to 512x512 before upload.

You: yes

[backend-agent works...]

...etc.
```

At any point if you say "stop" or "show diff" — the coordinator pauses.

## Installation (5 minutes)

```bash
# 1. Create a Next.js project (or use existing one)
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app

# 2. Unzip this setup into the root
unzip hybrid-multi-agent-setup-en.zip
# (or git clone, whichever you prefer)

# 3. Install Claude Code globally (if you don't have it)
npm install -g @anthropic-ai/claude-code

# 4. Launch with the coordinator as the main agent
claude --agent coordinator-agent

# 5. Verify all agents are visible
> /agents
```

You should see 5 agents grouped under "Project".

## GitHub Actions setup (optional, for team work)

1. In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: your API key from console.anthropic.com

2. Push the `.github/workflows/` folder

3. In any Issue or PR comment:
   ```
   @claude use coordinator-agent and implement this feature.
   Delegate to design, frontend, backend, and testing agents.
   Open a PR when done — do NOT merge automatically.
   ```

4. Every PR automatically gets a review comment (via `claude-review.yml`).

## What does NOT happen automatically (by design)

- **Coordinator never merges PRs** — always sends to you for review
- **Never pushes directly to `main`** (denied in settings.json)
- **Never runs `prisma migrate reset`** (denied in settings.json)
- **Never deletes tests** to make CI pass (forbidden in testing-agent prompt)
- **Never moves to next phase** without your confirmation

## Recommended reading order

1. `CLAUDE.md` — project rules (every agent reads it)
2. `.claude/agents/coordinator-agent.md` — how the coordinator thinks
3. `CHEAT_SHEET.md` — real prompt examples
4. `docs/` — domain rules (you fill them in for your project)

# AgentFlow — Project Wiki

Welcome to the AgentFlow project wiki. This wiki covers the full system: the multi-agent Claude Code pipeline that builds software automatically, and the Todo App that serves as its first real-world demonstration.

---

## What Is AgentFlow?

AgentFlow is a **Next.js 16 + multi-agent Claude Code demo application** that shows how to structure a coordinator-plus-specialist-subagent pipeline to develop software features in a controlled, semi-automatic way.

It has two distinct layers:

| Layer | Description |
|-------|-------------|
| **The pipeline** | A 5-agent Claude Code system (coordinator + design + frontend + backend + testing) that builds features phase by phase, with human checkpoints between each phase |
| **The product** | A full-stack Todo App — the thing the pipeline is building — with React components, Server Actions, Zod validation, and a Prisma-backed PostgreSQL schema |

The two layers are intentionally intertwined: every feature in the Todo App was built by the agent pipeline, so you can study both the output (the app) and the process that produced it (the agent output files in `.agents/output/`).

---

## What Does AgentFlow Demonstrate?

1. **Structured task decomposition** — A coordinator agent breaks any feature request into design, backend, frontend, and testing phases before writing a single line of code.
2. **Specialist subagents** — Each phase runs in its own isolated context with tight file-write permissions. Design agent is read-only. Testing agent can only write test files.
3. **Semi-automatic workflow** — The coordinator never advances to the next phase without explicit human confirmation (a "yes" at each checkpoint). You are always in control.
4. **GitHub Actions integration** — A `@claude` comment in any issue or PR triggers the full coordinator pipeline. A separate workflow automatically reviews every PR for security, TypeScript correctness, auth checks, and missing tests.
5. **Real cost data** — Every agent call is measured (tokens, tool uses, duration). The full 4-agent pipeline for one feature costs approximately 190k tokens and takes ~48 minutes.
6. **Failure taxonomy** — The project includes a documented live experiment where the coordinator was given impossible instructions. The failure mode, detection method, and recovery steps are all recorded.

---

## Tech Stack Summary

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript strict mode |
| Styling | Tailwind CSS v4 (no shadcn yet — custom components) |
| Database | PostgreSQL via Prisma ORM (schema ready; in-memory store in use during dev) |
| Auth | Not yet implemented (stubs + TODO comments) |
| Validation | Zod v4 (shared between frontend and backend) |
| Forms | react-hook-form |
| Testing | Vitest + jsdom for unit/component; Playwright for E2E (config in place) |
| Package manager | pnpm |
| Theme | next-themes for dark/light mode |
| CI | GitHub Actions (two workflows) |

---

## Quick Start

See [Getting-Started.md](Getting-Started.md) for the full installation walkthrough. The short version:

```bash
# 1. Clone and install
git clone <repo-url>
cd multy-agent-app
pnpm install

# 2. Start the dev server
pnpm dev

# 3. Launch the coordinator agent
claude --agent coordinator-agent

# 4. Verify agents are loaded
> /agents
```

---

## Wiki Pages

| Page | What it covers |
|------|----------------|
| [Getting-Started](Getting-Started.md) | Prerequisites, installation, first task, session hygiene |
| [Architecture](Architecture.md) | Full multi-agent architecture diagram, coordinator pattern, parallelization rules |
| [Agents-Reference](Agents-Reference.md) | One section per agent: role, tools, file permissions, prompt tips, example output |
| [Todo-App](Todo-App.md) | The product: routes, implemented features, P1 backlog, user stories table |
| [Frontend](Frontend.md) | Pages, components, form flow, UI states, design tokens, accessibility rules |
| [Backend](Backend.md) | Server Actions, error codes, response format, Zod validation, auth patterns |
| [Database](Database.md) | Prisma schema, migration commands, RLS, seed data, how to wire up the real DB |
| [Testing](Testing.md) | Test structure, Vitest config, test patterns, coverage minimums, failure rules |
| [CI-CD](CI-CD.md) | GitHub Actions workflows, `@claude` trigger, auto-review, secrets setup |
| [Cost-and-Performance](Cost-and-Performance.md) | Per-agent token costs, real measurements, cost control recommendations |
| [Error-Recovery](Error-Recovery.md) | Failure taxonomy, the impossible-instruction experiment, recovery checklist |
| [Prompt-Examples](Prompt-Examples.md) | All prompt templates organized by task type, control commands, anti-patterns |
| [Conventions-and-Rules](Conventions-and-Rules.md) | Definition of done, forbidden list, required before PR, inter-agent communication |

---

## Repository Structure (Top Level)

```
multy-agent-app/
├── .claude/agents/          # 5 agent definition files
├── .github/workflows/       # CI: claude.yml + claude-review.yml
├── .agents/output/          # Agent audit trail (committed with features)
├── app/                     # Next.js App Router pages + Server Actions
├── components/              # React components
├── lib/                     # Shared utilities: Prisma singleton, Zod schemas
├── prisma/                  # schema.prisma + future migrations
├── tests/                   # Vitest test files
├── docs/                    # Domain rules (backend, design, testing, product)
├── wiki/                    # This documentation (you are here)
├── CLAUDE.md                # Project constitution — loaded by every agent
├── CHEAT_SHEET.md           # Prompt examples
└── README.md                # Setup instructions
```

---

## Key Principles

- **No code without a plan.** Every agent reads the relevant `docs/` files before writing anything.
- **Test suite is the source of truth.** The coordinator does not trust an agent's self-reported success — it runs `tsc --noEmit` and `vitest run` independently after every phase.
- **Human checkpoints are mandatory.** The coordinator never auto-advances between phases.
- **Secrets never touch code.** No API keys, tokens, or database URLs in any committed file.
- **Agents have bounded permissions.** Design agent is read-only. Testing agent cannot touch production code.

---

## Current Status (as of 2026-05-20)

- Todo App core features (P0): fully implemented and tested
- Prisma schema: defined but not wired up (in-memory store used in dev)
- Auth: not implemented (TODO stubs in place)
- GitHub Actions: both workflows active
- shadcn/ui: not installed — all UI components are custom for now

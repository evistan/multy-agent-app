# Project Rules (CLAUDE.md)

This file is automatically loaded into the context of EVERY Claude Code session and EVERY subagent. This is the project's "constitution".

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode, no `any`)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL via Prisma ORM (or Supabase — fill in `docs/backend/database-rules.md`)
- **Auth**: NextAuth.js v5 (Auth.js) or Supabase Auth
- **Validation**: Zod (shared between frontend and backend)
- **Forms**: react-hook-form
- **Testing**: Vitest (unit/integration) + Playwright (e2e)
- **Package manager**: pnpm

## General Rules

- Never implement directly without reading the relevant `docs/` files first.
- Always create a short implementation plan before changing files.
- Prefer small, safe, atomic changes.
- Never remove existing functionality unless explicitly requested.
- Never hardcode secrets, API keys, or service role keys.
- All database changes must go through migration files.
- All user-facing features must have: loading, empty, error, success states.
- All completed tasks must include tests or a clear reason why tests are not applicable.

## Agent Workflow

For every feature:

1. **Coordinator** analyzes the issue/task
2. **Design Agent** defines UI/UX (spec only, no code)
3. **Backend Agent** defines API/database contract
4. **Frontend Agent** implements UI (parallel with backend when contract is clear)
5. **Testing Agent** adds/updates tests
6. **Coordinator** integrates and produces final summary
7. **YOU** review and merge

## Definition of Done

A task is done ONLY when:

- ✅ Code builds (`pnpm build`)
- ✅ TypeScript passes (`pnpm tsc --noEmit`)
- ✅ Lint passes (`pnpm lint`)
- ✅ Tests pass (`pnpm test`)
- ✅ No secrets are exposed
- ✅ UI covers loading/error/empty/success states
- ✅ Backend access rules (auth, ownership, RLS) are respected
- ✅ PR summary explains what changed
- ✅ Manual QA checklist is attached

## Forbidden (absolutely prohibited)

- ❌ Auto-merging PRs
- ❌ Pushing directly to `main`
- ❌ Changing production database directly
- ❌ Exposing service role keys in frontend code
- ❌ Removing RLS policies / auth checks
- ❌ Hiding failing tests (skip, comment-out, weakened assertions)
- ❌ Deleting tests without explanation in commit message
- ❌ Large unrelated refactors in the same PR as a feature
- ❌ `console.log` of passwords, tokens, or PII
- ❌ Raw SQL without parameterization (Prisma handles this automatically)
- ❌ `dangerouslySetInnerHTML` with user input

## Required Before PR

Before opening a PR, Claude must provide:

1. **Summary** — what was done in 3-5 lines
2. **Files changed** — list
3. **Test results** — which tests ran, which passed
4. **Security notes** — auth checks, ownership, RLS changes
5. **Manual QA checklist** — what YOU need to verify manually
6. **Known limitations** — what is NOT covered

## Inter-Agent Communication

Each agent, when finished, writes its result to:
```
.agents/output/<agent-name>-<YYYY-MM-DD-HHmm>.md
```

With fixed sections:
- **Completed**: list of completed tasks
- **Files**: list of changed/new files
- **Assumptions**: what the agent assumed
- **Next steps**: recommendations for what to do next
- **Questions**: things requiring a developer decision

The coordinator reads these files and forwards **only relevant parts** to the next agent.

## Domain Rules

More detailed rules per domain are in `docs/`:
- `docs/product/<project-name>/` — current project requirements and user stories
- `docs/design/ui-rules.md` — Tailwind, shadcn conventions
- `docs/backend/api-rules.md` — REST/Server Actions patterns
- `docs/backend/database-rules.md` — Prisma/Supabase, RLS, migrations
- `docs/testing/testing-rules.md` — Vitest/Playwright patterns

Agents read only the `docs/` files relevant to their domain — not all of them.

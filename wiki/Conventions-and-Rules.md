# Conventions and Rules

This page distills the project's governing rules from `CLAUDE.md`. Every agent reads `CLAUDE.md` automatically at the start of every session — the rules here are the same rules the agents follow.

---

## General Rules

These apply to every agent and every human working on the project:

1. **Never implement directly without reading the relevant `docs/` files first.** Check `docs/backend/api-rules.md` before writing an API route. Check `docs/design/ui-rules.md` before building a component.

2. **Always create a short implementation plan before changing files.** Present the plan (even if 5 lines) and get acknowledgement before writing code.

3. **Prefer small, safe, atomic changes.** One feature per PR. No bundling unrelated refactors with feature work.

4. **Never remove existing functionality unless explicitly requested.** If you're changing a function, keep its existing behavior unless the task says otherwise.

5. **Never hardcode secrets, API keys, or service role keys.** Read from `process.env`. Never commit `.env`.

6. **All database changes must go through migration files.** No `prisma db push`, no direct SQL edits in production.

7. **All user-facing features must have loading, empty, error, and success states.** All four. No exceptions.

8. **All completed tasks must include tests** or a clear written explanation of why tests are not applicable.

---

## Definition of Done

A task is done ONLY when ALL of the following are true:

| Check | Command / Verification |
|-------|----------------------|
| Code builds | `pnpm build` passes |
| TypeScript passes | `pnpm tsc --noEmit` — zero errors |
| Lint passes | `pnpm lint` — zero errors (excluding pre-existing `scripts/` issue) |
| Tests pass | `pnpm test` — all tests green |
| No secrets exposed | No API keys, tokens, or `.env` committed |
| UI states complete | Loading / empty / error / success all implemented |
| Auth checks present | Every mutation has an auth check or a documented TODO stub |
| PR summary exists | Coordinator provides: summary, files changed, test results, security notes |
| Manual QA checklist attached | Coordinator provides the checklist; you complete it |

---

## Required Before Every PR

Before opening a pull request, the coordinator must provide:

1. **Summary** — What was done, in 3–5 lines
2. **Files changed** — Complete list of all modified and created files
3. **Test results** — Which tests ran, how many passed, any skipped
4. **Security notes** — Auth checks present, ownership checks, RLS changes, secrets check
5. **Manual QA checklist** — Steps you must verify by hand that are not covered by automated tests
6. **Known limitations** — What is NOT covered by this PR; what is intentionally deferred

---

## The Forbidden List

These actions are absolutely prohibited. No agent, no human:

| Forbidden action | Consequence / Why |
|-----------------|-------------------|
| Auto-merging PRs | PRs must be reviewed by a human before merge |
| Pushing directly to `main` | Feature branches + PR review required |
| Changing production database directly | All changes go through migrations |
| Exposing service role keys in frontend code | Immediate security incident |
| Removing RLS policies or auth checks | Opens security holes |
| Hiding failing tests with `.skip()` | Masks real failures from CI |
| Deleting tests without commit message explanation | Removes coverage silently |
| Large unrelated refactors in the same PR as a feature | Harder to review, harder to revert |
| `console.log` of passwords, tokens, or PII | Logs may be accessible to unauthorized parties |
| Raw SQL without parameterization | SQL injection risk (Prisma handles this automatically) |
| `dangerouslySetInnerHTML` with user input | XSS vulnerability |
| `pnpm prisma migrate reset` | Wipes all data — never run |
| `pnpm prisma db push` | Bypasses migration history |
| Committing `.env` | Contains credentials |
| Weakening test assertions to make tests pass | Hides logic bugs |

---

## Inter-Agent Communication Format

Each agent writes its output to:
```
.agents/output/<agent-name>-<YYYY-MM-DD-HHmm>.md
```

### Required Sections

Every output file must have these five sections:

```markdown
## Completed
- [x] Task 1
- [x] Task 2

## Files
- path/to/file1.ts (created)
- path/to/file2.tsx (modified)

## Assumptions
- Assumption 1 — what I decided without asking
- Assumption 2

## Next steps
- What the next agent or coordinator should do

## Questions
- Open question requiring a developer decision
```

### How the Coordinator Uses Output Files

The coordinator reads the output file and forwards **only the relevant parts** to the next agent. Agents do not share memory — each starts fresh. The coordinator is the only thread with full context.

Before every checkpoint, the coordinator:
1. Reads the output file
2. Spot-checks the actual modified files (not just the agent's summary)
3. Runs `pnpm tsc --noEmit` and/or `pnpm vitest run`
4. Only then presents the checkpoint to you

**These files are committed to the repository** alongside the feature code. They are the audit trail.

---

## Agent Workflow Order

For every feature, the standard order is:

```
1. Coordinator     — analyzes task, presents plan, asks CHECKPOINT 0
2. Design agent    — defines UI/UX spec (no code)
3. Backend agent   — API, Server Actions, Prisma (can run in parallel with frontend if contract is clear)
4. Frontend agent  — React components, pages (can run in parallel with backend)
5. Testing agent   — Vitest + Playwright tests
6. Coordinator     — integrates, runs full checks, produces final summary
7. YOU             — reviews diff, does manual QA, opens PR, merges
```

The coordinator **never skips checkpoints** unless you explicitly say `do everything to the end without pausing`.

---

## Domain Rules: Where to Find the Detailed Specs

| Domain | File | Covers |
|--------|------|--------|
| Product requirements | `docs/product/todo-app/requirements.md` | What to build, what is P0 vs P1, known limitations |
| User stories | `docs/product/todo-app/user-stories.md` | User story table with implementation status |
| UI/UX conventions | `docs/design/ui-rules.md` | Design tokens, spacing, state display, breakpoints, accessibility |
| API patterns | `docs/backend/api-rules.md` | REST conventions, Server Actions, response format, error codes |
| Database rules | `docs/backend/database-rules.md` | Prisma conventions, migrations, RLS, seed data, privacy |
| Testing rules | `docs/testing/testing-rules.md` | Vitest config, test patterns, coverage minimums, what not to do |

Agents read only the `docs/` files relevant to their domain, not all of them.

---

## Response Format: All Server Actions and API Routes

Every response — success or error — uses the same discriminated union shape:

```ts
// Success
{ data: T }

// Error
{ error: { message: string; code: ErrorCode; details?: unknown } }
```

Error codes:

| Code | HTTP equivalent | When |
|------|----------------|------|
| `VALIDATION` | 400 | Zod schema parse failed |
| `AUTH_REQUIRED` | 401 | No active session |
| `NOT_FOUND` | 404 | Resource does not exist OR user has no access |
| `FORBIDDEN` | 403 | Session OK, but user lacks permission (prefer 404 to avoid info leakage) |
| `CONFLICT` | 409 | Unique constraint violation |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected error — always `console.error` on server |

---

## TypeScript Rules

- **Strict mode is on** — `tsconfig.json` has `"strict": true`
- **No `any`** — use `unknown` and narrow with type guards
- **No non-null assertions** without a comment explaining why it's safe (`!`)
- **Explicit return types** on all exported functions
- **Zod `safeParse`** always — never use `.parse()` in production code (throws instead of returning an error)
- **`as const`** for string literal types in error codes

---

## Logging Rules

```ts
// Acceptable
console.error("[createTodo] Unexpected error:", error.message);

// Development only
if (process.env.NODE_ENV === "development") {
  console.log("[createTodo] Validation failed");
}

// FORBIDDEN
console.log("User:", user);             // ❌ may contain PII
console.log("Request body:", body);     // ❌ body may contain PII
console.log("Session:", session);       // ❌ contains tokens
console.log("Password:", password);     // ❌ never
```

---

## Code Organization Conventions

| Type | Location |
|------|----------|
| App Router pages | `app/<route>/page.tsx` |
| Root layout | `app/layout.tsx` |
| Server Actions | `app/actions/<domain>.ts` |
| REST API routes | `app/api/<domain>/route.ts` |
| Zod schemas | `lib/validations/<domain>.ts` |
| Prisma singleton | `lib/prisma.ts` |
| Generic UI primitives | `components/ui/<ComponentName>.tsx` |
| Domain components | `components/features/<domain>/<ComponentName>.tsx` |
| Theme components | `components/theme/<ComponentName>.tsx` |
| Unit tests | `tests/unit/<domain>/<name>.test.ts` |
| Component tests | `tests/components/<domain>/<Name>.test.tsx` |
| E2E tests | `tests/e2e/<flow>.spec.ts` |
| Test factories | `tests/factories/<domain>.ts` |
| Agent output files | `.agents/output/<agent-name>-<YYYY-MM-DD-HHmm>.md` |

---

## Commit Message Convention

Standard git commit message format:

```
<type>: <short description>

<optional body>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`

When deleting tests:
```
test: remove TodoForm error test — broken by auth middleware refactor
TODO: restore after middleware is mockable in test setup
```

When including agent output files:
```
feat: add pin todo feature

- togglePinTodo Server Action
- Pin button in TodoItem with amber styling
- getTodos now sorts pinned first

Includes agent output files for traceability.
```

# Agents Reference

One section per agent. Covers what it does, what tools it has, what files it can and cannot touch, how to write a good prompt for it, and what its output looks like.

---

## coordinator-agent

### Role

The coordinator is the **main thread** — the only agent that talks to you directly. It does not write production code. Its job is to:

- Read `CLAUDE.md` and the relevant `docs/` files
- Decompose the task into phases
- Show you a plan and ask for confirmation
- Spawn specialist subagents with precise, focused prompts
- Run `tsc` and `vitest` to verify each phase independently
- Forward only relevant context from one agent to the next
- Produce the final summary, security notes, and manual QA checklist

### Model

Claude Sonnet (the full model — it needs reasoning ability for planning and verification)

### File Write Permissions

Thin. The coordinator can write:
- `.agents/output/*.md` (output files from agents that cannot write files themselves, like design-agent)
- `docs/` and `wiki/` documentation files
- Minor config fixes (e.g., adding a line to `tsconfig.json`)

The coordinator does NOT write application code (`app/`, `components/`, `lib/`, `tests/`, `prisma/`).

### Tools

- `Read`, `Write`, `Edit` — for reading project files and writing output files
- `Bash` — for running `pnpm tsc`, `pnpm test`, `pnpm build`, `git diff`
- `Agent(...)` — the delegation tool; spawns subagents

### How to Prompt the Coordinator

Give it a **user story or feature description**, not a list of implementation steps. The coordinator figures out the implementation steps itself.

Good:
```
Add a due date field to todos. Users can optionally set a due date.
Overdue todos (past due date) should display in red.
```

Too detailed (reduces coordinator effectiveness):
```
1. Add dueDate DateTime? to Prisma schema
2. Update Zod schema with z.date().optional()
3. Add a date picker to TodoForm
4. Style past-due todos with text-red-600
```

If you are more opinionated about the approach, say so at the framing level:
```
Add due dates to todos (use a simple date input, no calendar picker).
Overdue todos should be red. Store in Postgres.
```

### Checkpoint Responses

- `yes` or `proceed` — advance to next phase
- `no` — stop here
- `edit [description]` — modify the next agent's prompt before sending
- `question [text]` — ask something; coordinator answers before proceeding
- `skip testing` — skip testing phase (risky, acknowledged)
- `parallelize backend and frontend` — run both simultaneously
- `do everything to the end without pausing` — auto-mode (not recommended for new features)

### Example Output (Checkpoint)

```
Phase 2 (backend-agent) complete.

Summary:
- Added isPinned Boolean field to CreateTodoSchema
- togglePinTodo(id) Server Action implemented
- getTodos() now sorts pinned first, then by createdAt asc
- TypeScript: PASS | Tests: 61/61 PASS

Output: .agents/output/backend-2026-05-20-1430.md

[CHECKPOINT 2] Proceed with Phase 3 (frontend-agent)? (yes / no / edit / question)
```

---

## design-agent

### Role

The design agent produces **UI/UX specifications only — no code**. It reads the existing codebase to understand current patterns, reads product requirements and UI rules, and writes a detailed spec covering:

- Component hierarchy and new/changed components
- State machine (empty / loading / error / success)
- Interaction details (what happens on click, hover, focus)
- Accessibility requirements (keyboard navigation, ARIA labels)
- Responsive behavior (mobile vs. desktop)
- Color and spacing decisions that match the project's design tokens

The spec becomes the source of truth for both backend-agent (data shapes needed) and frontend-agent (what to build).

### Model

Claude Haiku (read-only specs; haiku is sufficient and 3-5x cheaper)

### File Write Permissions

None. Design-agent is read-only. It cannot write any files.

> The coordinator always spawns a helper agent (or uses its own Write tool) to save the design spec to `.agents/output/design-*.md`.

### What It Reads

- `CLAUDE.md`
- `docs/design/ui-rules.md`
- `docs/product/<project>/requirements.md`
- `docs/product/<project>/user-stories.md`
- Existing component files (to match current patterns)

### How to Prompt the Design Agent

The coordinator handles this — you do not prompt design-agent directly. But if you want to influence the design output, tell the coordinator what design preferences you have at CHECKPOINT 0:

```
[CHECKPOINT 0] yes, but the pin button should use a star icon (not thumbtack)
and pinned todos should get a subtle left border in amber, not a background change.
```

### Example Output

```markdown
## Pin Feature — Design Spec

### Component changes
- TodoItem: add PinButton (left of existing buttons)
- PinButton: Star icon (lucide-react), outline when unpinned, filled amber when pinned
- TodoList: receives sorted todos from parent (pinned first)

### States
| State | Visual |
|-------|--------|
| Unpinned | Star outline, gray |
| Pinned | Star filled, amber-400 |
| Pin pending | Loader2 spinner, same position |
| Pin error | Original icon returns, toast error shown |

### Accessibility
- aria-label="Pin todo" / "Unpin todo" based on state
- Keyboard: Tab to button, Enter/Space to toggle

### Mobile
- Both pin and delete buttons visible at all times (no hover reveal on touch)
```

---

## backend-agent

### Role

The backend agent writes all server-side code:

- Server Actions (`app/actions/`)
- API routes (`app/api/`)
- Zod validation schemas (`lib/validations/`) — these are shared with frontend
- Prisma schema changes (`prisma/schema.prisma`)
- Database migrations (`pnpm prisma migrate dev`)
- Auth checks and ownership checks on every mutation

### Model

Claude Sonnet

### File Write Permissions

Yes — can write to:
- `app/actions/`
- `app/api/`
- `lib/validations/`
- `lib/` (utilities, Prisma singleton)
- `prisma/schema.prisma`
- `prisma/migrations/`
- `.agents/output/` (its own output file)

Cannot write to:
- `app/` pages (that is frontend-agent's domain)
- `components/` (frontend-agent)
- `tests/` (testing-agent)
- `.claude/agents/` (coordinator only)

### What It Reads Before Writing

- `CLAUDE.md`
- `docs/backend/api-rules.md`
- `docs/backend/database-rules.md`
- The design-agent's output file (for data shape requirements)
- `lib/auth.ts` (how auth works)
- `prisma/schema.prisma` (what already exists)

### Auth Check Pattern (Always Required)

Every mutation must include:
```ts
const session = await auth();
if (!session?.user) {
  return NextResponse.json(
    { error: { message: "Unauthorized", code: "AUTH_REQUIRED" } },
    { status: 401 }
  );
}
```

Because auth is not yet implemented in this project, backend-agent uses TODO stubs:
```ts
// TODO: Replace with real auth check when auth is implemented
// const session = await auth();
// if (!session?.user) return unauthorized();
```

### Ownership Check Pattern

```ts
const todo = await prisma.todo.findUnique({ where: { id } });
if (!todo || todo.userId !== session.user.id) {
  // 404 not 403 — don't reveal whether the resource exists
  return NextResponse.json(
    { error: { message: "Not found", code: "NOT_FOUND" } },
    { status: 404 }
  );
}
```

### How to Prompt the Backend Agent (via coordinator)

The coordinator constructs the backend-agent prompt. You influence it by being specific about data requirements at CHECKPOINT 1:

```
[CHECKPOINT 1] yes, but the isPinned field should persist to Postgres,
not just in-memory. Skip migration for now — add the field to the Prisma schema
with a TODO note.
```

### Example Output File

```markdown
# Backend Implementation: Pin Todo

## Completed
- [x] Added isPinned Boolean @default(false) to Prisma Todo model
- [x] Updated CreateTodoSchema with isPinned optional field
- [x] togglePinTodo(id: string) Server Action implemented
- [x] getTodos() updated to sort pinned first

## Files Modified
- lib/validations/todo.ts
- app/actions/todos.ts
- prisma/schema.prisma (schema only — migration pending DATABASE_URL)

## Assumptions
- No auth yet — all users share the same todo list
- isPinned not migrated to DB yet — in-memory only until DB is wired up

## Questions
- Should we add a compound index @@index([isPinned, createdAt]) in Prisma?
```

---

## frontend-agent

### Role

The frontend agent writes all user-facing React code:

- App Router pages (`app/`)
- React components (`components/`)
- Client-side form logic (react-hook-form)
- Loading, error, empty, and success states (all four must always be present)
- Dark mode support
- Accessibility attributes (aria-label, role, etc.)
- Responsive layout (mobile-first)

### Model

Claude Sonnet

### File Write Permissions

Yes — can write to:
- `app/` (pages, layouts, providers)
- `components/`
- `public/` (static assets if needed)
- `.agents/output/` (its own output file)

Cannot write to:
- `lib/validations/` (backend-agent's Zod schemas)
- `app/actions/` or `app/api/` (backend-agent)
- `tests/` (testing-agent)
- `prisma/` (backend-agent)

### What It Reads Before Writing

- `CLAUDE.md`
- `docs/design/ui-rules.md`
- The design-agent's output spec
- The backend-agent's output (to know action signatures and Zod types)
- Existing component files (to match current patterns)

### All Four States Required

For every user-facing feature, frontend-agent must implement:

| State | Requirement |
|-------|-------------|
| Loading | Spinner (`Loader2` from lucide-react) or skeleton on submit/action buttons |
| Empty | `EmptyState` component with icon + message + optional CTA |
| Error | Error banner or inline error with message from the server action |
| Success | Green banner or toast, auto-dismiss after 3 seconds |

### How to Prompt the Frontend Agent (via coordinator)

Most of the time the coordinator handles this. You can add constraints:

```
[CHECKPOINT 2] yes, but use a star icon for pin, not thumbtack.
Also make sure the pin button is keyboard accessible (focus ring visible).
```

### Package Manager Note

Frontend-agent may fall back to `npm install` if `pnpm` is not on PATH in its shell environment. After any agent session that installs packages, run `pnpm install` yourself to resync `pnpm-lock.yaml`.

---

## testing-agent

### Role

The testing agent writes **only tests** — it cannot modify application code. It:

- Reads all changed source files
- Writes unit tests for pure functions and Server Actions
- Writes component tests using `@testing-library/react`
- Writes Zod schema tests
- Runs the test suite, reads failures, fixes tests (not code), re-runs
- Produces a coverage summary

### Model

Claude Haiku

### File Write Permissions

Tests only:
- `tests/unit/`
- `tests/components/`
- `tests/integration/`
- `tests/e2e/`
- `tests/factories/`
- `.agents/output/` (its own output file)

Cannot write to:
- Any application code (`app/`, `components/`, `lib/`, `prisma/`)

If a test fails because the application code has a bug, testing-agent will report it but cannot fix it. The coordinator escalates to backend-agent or frontend-agent.

### Minimum Coverage Per Feature

| Type | Minimum tests |
|------|--------------|
| API endpoint / Server Action | 3 (success, validation, auth) |
| Zod schema | 3 (valid, invalid required field, edge case) |
| Critical user flow | 1 E2E test |
| Custom util function | 80%+ branch coverage |

### What Testing Agent Does NOT Do

- Does not use `.skip()` to make CI pass
- Does not comment out failing tests
- Does not weaken assertions (`toBeTruthy()` instead of `toBe(true)`)
- Does not delete tests without a comment explaining why
- Does not share database state between E2E tests

### Cost Warning

Testing-agent is the most expensive phase. In the measured 4-agent pipeline, it consumed **87k tokens (46% of the pipeline total)** and ran for **39 minutes**. This is because it reads many files, writes test files, runs the suite, reads failures, iterates, and re-runs.

To reduce cost:
- Batch testing for multiple features in one agent call
- Provide exact file paths and expected test cases in the prompt
- Avoid vague prompts like "add tests for everything new"

### Example Output

```markdown
# Testing: Pin Feature

## Completed
- [x] Unit tests for togglePinTodo action (3 cases)
- [x] Unit tests for getTodos sorting (pinned first)
- [x] Component tests for TodoItem pin button states
- [x] Zod schema test for isPinned field

## Test Results
- Test files: 5 passed
- Tests: 68/68 PASS

## Files
- tests/unit/actions/todos-pin.test.ts (new)
- tests/components/todos/TodoItem-pin.test.tsx (new)
```

---

## Spawning Agents Directly (Advanced)

While you typically interact only with the coordinator, you can ask the coordinator to use a specific agent for a focused task:

```
Use backend-agent only. Add a `completedAt DateTime?` field
to the Todo Prisma schema. No migration yet.
```

This skips the design and testing phases. Useful for small, well-understood changes. You are responsible for writing or updating tests separately.

For quick one-off fixes, the coordinator can also make trivial edits itself without spawning a subagent — for example, adding one line to `package.json`.

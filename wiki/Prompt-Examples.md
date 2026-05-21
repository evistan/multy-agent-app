# Prompt Examples

All prompt templates organized by task type. These are sourced from `CHEAT_SHEET.md` and the patterns observed during the AgentFlow setup sessions.

---

## Local Session Examples

Launch the coordinator first:
```bash
claude --agent coordinator-agent
```

Then paste any of the prompts below.

---

### 1. New Feature from Scratch (Full Pipeline)

Use this when you want the complete design → backend → frontend → testing flow.

```
I need a feature: users can pin important todos to the top of the list.
A pinned todo should stay above regular todos regardless of creation order.
Pinned todos should be visually distinguished (amber color or star icon).
Multi-user consideration: each user's pins are independent (when auth is added).
```

The coordinator will activate: design → backend → frontend → testing.

**What to expect:** ~190k tokens, ~48 minutes, four checkpoints.

---

### 2. UI Prototype Only (No Database)

Use this when you want to explore a UI design without writing any backend code.

```
I just need a UI prototype of a dashboard page showing statistics:
total todos, completed todos, pinned todos, and completion percentage.
Mock data only — no API, no database, no Server Actions.
```

The coordinator activates: design → frontend (with mock data only).

**What to expect:** ~50k tokens, ~10 minutes, two checkpoints.

---

### 3. Bug Fix

Be specific about the reproduction steps. The more precise, the better the fix.

```
Bug: when a user deletes a todo while the success banner is visible,
the banner disappears but the list does not refresh (the deleted todo
is still shown until manual page reload).

Reproduce:
1. Add a todo
2. Immediately click delete before the 3-second banner disappears
3. The todo still appears in the list

Expected: todo disappears from list immediately.
```

The coordinator activates: testing (reproduction test) → frontend (fix) → testing (regression).

---

### 4. Refactor (No Behavior Change)

```
Refactor: the TodoItem component handles both pin and delete with inline
useState + async handlers. Extract these into two separate custom hooks:
usePinTodo(todoId) and useDeleteTodo(todoId).
Keep types, keep the same behavior, do not change UI appearance.
Do not touch test files — the testing-agent will update them separately.
```

The coordinator activates: frontend (refactor) → testing (regression).

---

### 5. Performance

```
The todo list loads slowly when there are more than 100 todos.
I need cursor-based pagination on getTodos(). The UI should load 20 todos
at a time with a "Load more" button at the bottom of the list.
Preserve the sort order: pinned first, then by createdAt ascending.
```

The coordinator activates: design (UX decision for pagination) → backend (cursor API) → frontend (load-more UI) → testing.

---

### 6. Database Migration

```
I need a new field on the Todo model: completedAt (optional DateTime).
When a todo is marked complete, store the timestamp.
The migration must be backward-compatible (existing todos have completedAt = null).
Don't change the UI yet — just the schema, the Server Action, and the Zod schema.
```

The coordinator activates: backend (migration + action update). No design or frontend phase needed.

---

### 7. Auth Feature

```
Add "forgot password" flow:
1. User enters their email address
2. They receive an email with a one-time reset link
3. They open the link and set a new password
4. They are redirected to the login page

Use NextAuth v5 with a database session strategy.
The reset token should expire after 1 hour.
```

The coordinator activates: design (3 pages + email template) → backend (3 endpoints + token model + email service) → frontend (3 pages) → testing.

**What to expect:** This is a large feature. Budget ~300k–500k tokens.

---

### 8. Quick Change (Skip Planning)

Use this for single-file, low-risk changes where you don't need a design phase.

```
Quick: add a character counter below the todo input field.
It should show "87/100" (remaining/max). Turn it red when ≤ 10 chars remaining.
No plan, just do it.
```

The coordinator skips planning and directly calls frontend-agent.

---

### 9. Schema-Only Change

```
Add isPinned Boolean @default(false) to the Todo Prisma schema.
Schema change only — do not wire it up to Server Actions yet.
Do create the migration file.
```

---

### 10. Test Coverage Addition

```
Use testing-agent to add tests for these three things we just built:
1. togglePinTodo Server Action: success, not found, already pinned
2. TodoItem pin button: renders pin/unpin icon, shows spinner while pending
3. getTodos sort order: pinned todos appear before unpinned todos

Exact files to test:
- app/actions/todos.ts (togglePinTodo)
- components/features/todos/TodoItem.tsx (pin button states)
```

---

## GitHub Workflow Examples

These are used as comments in GitHub Issues or Pull Requests.

---

### Starting a Feature from an Issue

Comment in the issue:

```
@claude use coordinator-agent and implement this feature as described in this issue.
Delegate design, frontend, backend, and testing work to specialized agents.
Open a PR when done — do NOT merge automatically.
Branch name: feature/pin-todos
```

---

### Iterating on a PR

Comment in the PR:

```
@claude testing-agent reported in the review that the pin button
does not have an aria-label. Use frontend-agent to add:
- aria-label="Pin todo" when unpinned
- aria-label="Unpin todo" when pinned
Update this PR — do not open a new one.
```

---

### Requesting a Different Approach

```
@claude this PR implements togglePinTodo as a Server Action, but the team
has decided all mutations should be REST API routes for mobile client compatibility.
Use coordinator-agent to switch togglePinTodo to PATCH /api/todos/[id]/pin.
Keep the frontend client calls unchanged by updating them to use fetch().
```

---

### Asking for a Security Review

```
@claude review the auth and ownership checks in app/actions/todos.ts.
Are they consistent with docs/backend/api-rules.md?
Specifically check: do all mutations have auth stubs, and would they be
correct once real auth is wired up?
```

---

### Requesting a PR Review

Every PR automatically receives a review via `claude-review.yml`. To request a manual focused review:

```
@claude review this PR specifically for:
1. The new Prisma migration — is it reversible?
2. The isPinned field — is the sort order in getTodos() correct?
3. Are all four UI states (loading/error/empty/success) present in TodoItem?
```

---

## Control Commands Table

These commands are typed during a live local coordinator session.

| Command | What it does |
|---------|-------------|
| `yes` | Approve the current checkpoint and advance to the next phase |
| `proceed` | Same as `yes` |
| `no` | Stop the workflow at the current checkpoint |
| `stop` | Pause at any point, even mid-phase |
| `edit [description]` | Modify the next agent's prompt before sending |
| `question [text]` | Ask the coordinator something; it answers before proceeding |
| `show plan` | Display the current plan and which phase you are in |
| `show diff` | Show what files have been changed so far |
| `skip testing` | Skip the testing phase (at your own risk) |
| `parallelize backend and frontend` | Run both agents simultaneously |
| `use haiku for everything` | Reduce cost; accept lower output quality |
| `do everything to the end without pausing` | Auto-mode — removes all checkpoints (not recommended) |
| `/agents` | List all available agents |
| `/cost` | Show tokens used and approximate USD for this session |
| `/clear` | Reset the session context (use between independent tasks) |

---

## Anti-Patterns

Avoid these — they reliably produce poor outcomes.

---

### Don't Give Huge Tasks

```
// ANTI-PATTERN
Build me a complete social network: profiles, posts, comments,
likes, direct messages, and notifications. Use Next.js and PostgreSQL.
```

The coordinator will get lost trying to plan too many phases at once, and agents will produce low-quality output trying to do too much in a single call.

**Fix:** Break into features. Start with profiles, ship it, then add posts, etc.

---

### Don't Bypass the Coordinator

```
// ANTI-PATTERN
@frontend-agent add a profile page with avatar upload.
```

Without the coordinator you get:
- No design spec (the frontend-agent guesses the UX)
- No backend (frontend-agent may create its own mock data that doesn't match future backend shapes)
- No tests
- No security review

**Fix:** Always use `coordinator-agent` as the entry point.

---

### Don't Ignore `docs/`

If your project has specific conventions that differ from the defaults (e.g., you use a different color palette, or you prefer REST routes over Server Actions), add them to the relevant `docs/` file. Otherwise agents will make their own assumptions, which may be wrong.

---

### Don't Let Context Run Over 70%

A Claude session context has a limit. After a large 4-agent pipeline (~190k subagent tokens), the coordinator context is deep. If you start a new unrelated feature without clearing:

- The coordinator may confuse the current task with the previous one
- Responses slow down as more context is processed
- Cost per message increases

**Fix:** Run `/clear` and open a fresh session before starting a new independent task.

---

### Don't Use Vague Prompts for Bug Fixes

```
// ANTI-PATTERN
Fix the delete bug.
```

The coordinator has to guess what "the delete bug" means, then read a lot of files, then make assumptions.

**Fix:** Always describe the reproduction steps:
```
Bug: clicking delete on a todo while the success banner is visible
causes the list not to refresh. Steps to reproduce: ...
Expected behavior: ...
```

---

### Don't Skip the Checkpoint Review

```
// ANTI-PATTERN
Do everything to the end without pausing.
```

For new features, this removes your ability to catch wrong assumptions at Phase 1 (design) before they propagate through three more phases. A wrong assumption caught at design costs ~21k tokens. The same assumption caught at testing costs ~190k tokens.

**Acceptable use:** For features where all decisions are already made and you have high confidence in the agents' output. Not for new, unfamiliar features.

---

## Best Practice Flow for a Real Feature

```
1. Open a GitHub issue with a clear user story + acceptance criteria
2. Locally: claude --agent coordinator-agent
3. Coordinator reads the issue/description → proposes phased plan → you approve
4. Coordinator delegates phase by phase
5. At each checkpoint: read the summary, check the output file, then yes/no/edit
6. After final summary: do the manual QA checklist
7. Run /cost → paste into docs/cost-baseline.md
8. Commit the changes (including .agents/output/ files)
9. Push to a feature branch
10. GitHub Action automatically runs PR review
11. You read the review comment and merge manually
```

# Cheat Sheet: Prompt Examples

Concrete examples of how to communicate with the coordinator.

## Local work (via `claude --agent coordinator-agent`)

### 1. New feature from scratch
```
I need a feature: a user can create todo lists, add items,
mark them as done, and filter by status. Multi-user
(each sees only their own). No sharing between users for now.
```
→ Coordinator will activate: design → backend → frontend → testing

### 2. UI prototype only (no database)
```
I just need a UI prototype of a dashboard page with cards
showing statistics. Mock data for now, no API, no database.
```
→ Coordinator: design → frontend (with mock data)

### 3. Bug fix
```
Bug: when a user deletes a todo while the modal is open, the modal shows
"undefined" instead of closing. Reproduce: open edit modal,
in another tab delete the same todo, return and try save.
```
→ Coordinator: testing (reproduction) → frontend (fix) → testing (regression)

### 4. Refactor
```
Refactor: extract all fetch calls from components into a dedicated
lib/api/ folder. Keep types, add error handling, do not change
UI behavior.
```
→ Coordinator: frontend (refactor) → testing (regression)

### 5. Performance
```
The todo list loads slowly when there are >100 items. I need
pagination or virtual scroll, whichever is more appropriate.
```
→ Coordinator: design (UX decision) → backend (pagination API) → frontend → testing

### 6. Database migration
```
I need a new field on the User model: avatarUrl (optional).
Migration must be backward-compatible.
```
→ Coordinator: backend (migration + endpoint) → frontend (avatar upload UI) → testing

### 7. Auth feature
```
Add "forgot password" flow: user enters email, gets a link,
opens the link, sets a new password.
```
→ Coordinator: design (3 pages + email template) → backend (3 endpoints + token model) → frontend → testing

### 8. Quick change (skip planning)
```
Quick: add a loading spinner to the "Delete" button in TodoItem.
No plan, just do it.
```
→ Coordinator skips planning and directly calls frontend-agent

## GitHub workflow (via Issue/PR comments)

### Starting a feature from an issue
Comment in the issue:
```
@claude use coordinator-agent and implement this feature as described.
Delegate design, frontend, backend, and testing work to specialized agents.
Open a PR when done — do NOT merge automatically.
Branch name: feature/[short-name]
```

### Iterating on a PR
Comment in the PR:
```
@claude testing-agent reported BUG-2 in the review.
Use backend-agent to fix it, then testing-agent to verify.
Update this PR — do not open a new one.
```

### Requesting a different approach
```
@claude this PR uses Server Actions, but the design spec said REST API.
Use coordinator-agent to switch the backend to REST API routes.
Keep the frontend unchanged.
```

## Control commands during a session

| What you say | What it does |
|--------------|--------------|
| `yes` / `proceed` | Approve the next phase |
| `stop` | Pause the workflow |
| `show plan` | Coordinator shows where you are in the plan |
| `show diff` | Shows what the agents have changed |
| `skip testing` | Go straight to production (at your own risk) |
| `parallelize backend and frontend` | Maximum parallelization |
| `use haiku for everything` | Less precise but cheaper |
| `do everything to the end without pausing` | Auto-mode (NOT recommended for new features) |
| `/clear` | Reset context (between large features) |
| `/agents` | See the list of agents |
| `/cost` | See how many tokens/USD spent |

## Anti-patterns (DON'T do this)

### ❌ Don't give huge tasks
```
Build me an entire social network app.
```
The coordinator will get lost. Break it into smaller features.

### ❌ Don't bypass the coordinator
```
@frontend-agent add a profile page.
```
Without the coordinator you get no design, backend, or testing.

### ❌ Don't ignore `docs/`
If your project has specific conventions, add them to `docs/`.
Otherwise agents will make their own (probably wrong) assumptions.

### ❌ Don't let a session run over 70% context
Before a large new feature, run `/clear` or open a new session.

## Best practice flow for a real feature

```
1. Open a GitHub issue with user story + acceptance criteria
2. Locally: claude --agent coordinator-agent
3. Coordinator reads the issue → proposes a plan → you approve
4. Coordinator delegates phase by phase, you confirm checkpoints
5. After integration: you review the diff, commit, push to a feature branch
6. GitHub Action automatically runs PR review
7. You read review comments and merge manually
```

## Approximate token cost (March 2026, indicative)

| Activity | Sonnet tokens | Cost USD (approx) |
|----------|---------------|-------------------|
| Small bug fix | 5k-15k | $0.05-$0.15 |
| Medium feature (1 endpoint + UI + tests) | 30k-80k | $0.50-$1.50 |
| Large feature (3-5 screens, multiple endpoints) | 100k-300k | $2-$6 |
| Complete auth implementation | 200k-500k | $4-$10 |

Haiku is ~5x cheaper. That's why design and testing use haiku.

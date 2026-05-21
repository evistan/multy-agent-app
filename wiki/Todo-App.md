# Todo App

The Todo App is the first project built by the AgentFlow pipeline. It is a simple personal task management web application used to validate the multi-agent system end-to-end.

---

## What It Does

- Users can add todos with a title (1–100 characters)
- Users can delete any todo instantly
- Todos are listed in creation order (oldest first), with pinned todos shown above regular todos
- An empty state is shown when no todos exist
- The app supports light and dark mode, persisted to localStorage
- All UI states are implemented: loading, empty, error, success

---

## Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Server Component | Home page — "AgentFlow" title + projects list |
| `/todos` | Server Component | Todo list page — fetches todos on the server |

The home page links to `/todos`. The todos page has a "← All projects" link back to the home page.

---

## Implemented Features (P0)

All P0 features are fully implemented and covered by tests.

### 1. Add a Todo

- User types a title in the form input and clicks "Add Todo"
- Client-side validation: required, max 100 chars, no blank-only strings
- On submit: `Loader2` spinner shown on button, form is disabled
- Server Action `createTodo` validates with Zod and adds to the in-memory store
- On success: form resets, `router.refresh()` updates the list, green success banner shown for 3 seconds
- On error: red error banner shown with the error message

### 2. Delete a Todo

- Each todo row has a trash icon button
- On click: `Loader2` spinner replaces the trash icon, button is disabled
- Server Action `deleteTodo` removes the todo from the in-memory store
- On success: `router.refresh()` removes the item from the list
- No confirmation dialog (P1 backlog item)

### 3. Pin a Todo

- Each todo row has a pin/star icon button (left of the delete button)
- Outline star when unpinned, filled amber star when pinned
- Server Action `togglePinTodo` flips the `isPinned` flag
- `getTodos()` returns pinned todos first, then the rest sorted by `createdAt` ascending
- `isPinned` is stored in-memory only (not in Prisma schema yet — P1 backlog item)

### 4. View Todo List

- `getTodos()` is called server-side in `app/todos/page.tsx`
- List renders via `TodoList` → `TodoItem` components
- `EmptyState` shown when the list is empty

### 5. Light / Dark Theme

- `ThemeToggle` button fixed in the top-right corner
- Sun icon (light mode) / Moon icon (dark mode) from lucide-react
- `next-themes` provider wraps the app
- Uses `useSyncExternalStore` to prevent hydration mismatch
- Theme preference persisted to `localStorage`

### 6. Back Navigation

- `←  All projects` link on the todos page returns to the home page
- Standard Next.js `<Link>` component — no JavaScript required

---

## Not Yet Implemented (P1 Backlog)

These features are documented as user stories (status: not yet implemented) in `docs/product/todo-app/user-stories.md`.

| Feature | Notes |
|---------|-------|
| Mark as done (checkbox) | Checkbox renders but has no wired action |
| Edit todo inline | Not started |
| Persist todos to PostgreSQL | Prisma schema + singleton ready; `DATABASE_URL` needed |
| User authentication | NextAuth stubs in place; login flow not built |
| Delete confirmation dialog | Currently deletes immediately |
| Real-time updates across tabs | `router.refresh()` only works within the same tab session |
| Relative timestamps | Absolute dates shown; "2 hours ago" formatting not yet added |
| Character counter on input | Input renders without a counter |

---

## User Stories Table

| Story | Status |
|-------|--------|
| Home page lists projects | Done |
| "Back to projects" link on todo page | Done |
| Type title and click "Add Todo" | Done |
| New todo appears immediately after adding | Done |
| Validation message for empty/blank title | Done |
| Input clears automatically after add | Done |
| Delete todo with trash icon | Done |
| Todo disappears immediately after delete | Done |
| Empty state when no todos exist | Done |
| Loading spinner on submit button | Done |
| Success message after adding todo | Done |
| Error message if something goes wrong | Done |
| Delete button shows spinner while deleting | Done |
| Switch between light and dark mode | Done |
| App remembers theme preference | Done |
| Mark todo as done with checkbox | Not yet implemented |
| Edit todo title inline | Not yet implemented |
| Todos persist after page refresh | Not yet implemented |
| Register and log in for private todos | Not yet implemented |
| Confirmation before deleting | Not yet implemented |

---

## Known Limitations (Current State)

1. **Todos are in-memory only** — they reset when the dev server restarts. All users in the same server process share the same list.
2. **No authentication** — there is no concept of a logged-in user. Anyone who visits the page sees and can modify the same list.
3. **`isPinned` is not persisted** — the pin state lives only in the server-side in-memory array. Restarting the server resets pin states.
4. **Checkbox is visual only** — the checkbox component renders but has no Server Action wired to it.
5. **Delete has no confirmation** — a misclick immediately deletes a todo.
6. **No cross-tab refresh** — if you have two browser tabs open and add a todo in one, the other tab does not update until you manually refresh it.

---

## Technology Used in the Todo App

| Concern | Implementation |
|---------|---------------|
| Data store | In-memory array (TypeScript module-level variable) |
| Server Actions | `app/actions/todos.ts` — `createTodo`, `getTodos`, `deleteTodo`, `togglePinTodo` |
| Validation | Zod via `lib/validations/todo.ts` — `CreateTodoSchema` |
| Form | `TodoForm.tsx` using react-hook-form |
| List | `TodoList.tsx` (client wrapper) + `TodoItem.tsx` (individual row) |
| Empty state | `EmptyState.tsx` |
| Theme | `ThemeToggle.tsx` + `next-themes` |
| Routing | Next.js App Router (`app/todos/page.tsx`) |

---

## File Map

```
app/
  page.tsx                     — Home page
  todos/
    page.tsx                   — Todos page (server component)
  actions/
    todos.ts                   — All Server Actions + in-memory store

components/
  features/todos/
    TodoForm.tsx               — Add todo form
    TodoList.tsx               — List wrapper
    TodoItem.tsx               — Single todo row (pin + delete)
    EmptyState.tsx             — Empty list state
  theme/
    ThemeToggle.tsx            — Light/dark toggle

lib/
  validations/
    todo.ts                    — CreateTodoSchema (Zod)
  prisma.ts                    — Prisma singleton (imported when DB is wired)

prisma/
  schema.prisma                — Todo model (id, title, createdAt, updatedAt)
```

---

## How to Add the Next P1 Feature

The recommended process follows the standard pipeline:

1. Open the coordinator session: `claude --agent coordinator-agent`
2. Reference the P1 backlog item: _"Implement 'mark as done' for todos — user can check/uncheck a todo, and done todos are visually distinguished (strikethrough text)."_
3. Confirm the coordinator's plan at CHECKPOINT 0
4. Proceed phase by phase (design → backend → frontend → testing)
5. Review the final diff and commit

For database-backed P1 features (persist to PostgreSQL, auth), you must first configure `DATABASE_URL` in `.env` and run `pnpm prisma migrate dev`. See [Database](Database.md) for step-by-step instructions.

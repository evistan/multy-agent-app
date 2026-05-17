# Product Requirements — Todo App

## What is this project?

A simple personal task management web app where users can add and delete todos. Built as a pipeline validation exercise using the multi-agent coordinator system.

## Who are the users?

- **Primary**: Individual users who want a simple task list (any age, basic tech level)

## What is this project NOT?

- ❌ Not a team collaboration tool
- ❌ Not a project management system (no due dates, priorities, labels in MVP)
- ❌ Not a social app (no sharing, comments, or activity feeds)
- ❌ Not a calendar or scheduling app

## Core features (P0) — All implemented

1. **Add a todo** — User types a title (1–100 chars) and submits. Todo appears in list immediately. Input clears after success.
2. **Delete a todo** — User clicks the delete button on any todo. Todo disappears from list immediately. No confirmation dialog (MVP).
3. **View todo list** — List shows all todos in creation order. Empty state shown when no todos exist.
4. **Back navigation** — "← All projects" link on the todo page returns user to the home page.
5. **Light/dark theme** — Toggle in top-right corner, persisted to localStorage.

## Nice-to-have (P1) — Not yet implemented

1. **Edit a todo** — Inline edit of an existing todo title
2. **Mark as done** — Checkbox to mark a todo complete (visual toggle)
3. **Persist todos** — Save todos to PostgreSQL via Prisma (schema + singleton already in place)
4. **Auth** — User accounts so todos are private per-user (NextAuth or Supabase)
5. **Delete confirmation** — Confirm dialog before deleting to prevent accidents
6. **Real-time updates** — List refreshes across tabs without page reload
7. **Relative timestamps** — Show "2 hours ago" instead of absolute date
8. **Character counter** — Show remaining chars (e.g. "87/100") on input

## Tech constraints

- Must work on mobile (responsive, touch-friendly buttons)
- Must support light and dark mode
- Must be accessible (WCAG AA, keyboard navigation, screen readers)
- Must work without a database in development (in-memory store is acceptable for local dev)

## Known limitations (current state)

- Todos are stored in-memory — they reset when the dev server restarts
- No authentication — all users share the same in-memory todo list
- Delete has no confirmation step
- Checkbox on each todo is visual only (no action wired)

# Frontend

This page covers all pages, components, form flows, UI states, design tokens, and accessibility rules for the AgentFlow / Todo App frontend.

---

## Pages

### Home Page — `app/page.tsx`

Server component. Renders the "AgentFlow" title and a list of project cards. Currently shows one project: "Todo App". Each card links to the project's route (`/todos`).

No client-side JavaScript required for the home page.

### Todos Page — `app/todos/page.tsx`

Server component. Fetches todos on the server via `await getTodos()` and passes them to the `TodoList` client component.

Structure:
```tsx
// Simplified
export default async function TodosPage() {
  const result = await getTodos();
  const todos = result.data ?? [];
  return (
    <main>
      <Link href="/">← All projects</Link>
      <h1>Todos</h1>
      <TodoForm />
      <TodoList todos={todos} />
    </main>
  );
}
```

After any mutation (add, delete, pin), the client calls `router.refresh()` which triggers Next.js to re-run the server component and refetch `getTodos()`.

### Root Layout — `app/layout.tsx`

- Loads the Geist font (next/font)
- Wraps the app in `<Providers>` (which includes `ThemeProvider` from next-themes)
- Applies base Tailwind styles to `<body>`

### Providers — `app/providers.tsx`

Client component. Wraps children with `ThemeProvider` from `next-themes`. Configured with `attribute="class"` for Tailwind dark mode compatibility.

---

## Components

### TodoForm — `components/features/todos/TodoForm.tsx`

**Type:** Client component (`"use client"`)

**Purpose:** Add-new-todo form with all four UI states implemented.

**Form library:** react-hook-form with client-side validation rules:

| Field | Validation |
|-------|-----------|
| `title` | required, minLength: 1 (after trim), maxLength: 100 |

**Form flow:**

```
1. User types a title
2. User clicks "Add Todo" button
3. [LOADING STATE]
   - Button label changes to spinner (Loader2 icon, animate-spin)
   - Button and input are disabled
   - Submit function calls createTodo(formData)
4a. [SUCCESS STATE — returned { data: Todo }]
    - form.reset() — input clears
    - router.refresh() — server component refetches list
    - Green success banner shown with "Todo added!" message
    - Banner auto-dismisses after 3 seconds (setTimeout)
4b. [ERROR STATE — returned { error: ActionError }]
    - Red error banner shown with error.message
    - Input remains filled (user can correct and retry)
    - Button re-enabled
5. [EMPTY STATE — no todos in list]
    - Handled by TodoList / EmptyState, not by TodoForm
```

**Key implementation detail:** The success/error banners are local state (`useState`) — they do not use a toast library. The success banner auto-dismisses via a `setTimeout` cleanup in `useEffect`.

---

### TodoList — `components/features/todos/TodoList.tsx`

**Type:** Client component

**Purpose:** Wrapper that renders the todo list or delegates to `EmptyState`.

**Props:**
```ts
interface TodoListProps {
  todos: Todo[];
}
```

**Logic:**
- If `todos.length === 0` → renders `<EmptyState />`
- Otherwise → maps over todos and renders `<TodoItem>` for each

---

### TodoItem — `components/features/todos/TodoItem.tsx`

**Type:** Client component

**Purpose:** A single todo row with a pin button and a delete button.

**Props:**
```ts
interface TodoItemProps {
  todo: Todo;
}
```

**Pin button:**
- Shows a `Star` icon (lucide-react) when unpinned (outline style, neutral color)
- Shows a filled amber `Star` when `todo.isPinned === true`
- On click: sets local `isPinning` state → calls `togglePinTodo(todo.id)` → `router.refresh()`
- While pending: `Loader2` spinner in the pin button position
- `aria-label="Pin todo"` / `"Unpin todo"` based on current state

**Delete button:**
- Shows a `Trash2` icon (lucide-react) in default state
- On click: sets local `isDeleting` state → calls `deleteTodo(todo.id)` → `router.refresh()`
- While pending: `Loader2` spinner replaces the trash icon, button disabled
- `aria-label="Delete todo"`

**Pinned styling:**
- Pinned todos have a subtle left border in amber, or an amber background tint
- Non-pinned todos have the default styling

---

### EmptyState — `components/features/todos/EmptyState.tsx`

**Type:** Client or server component (no client-only APIs used)

**Purpose:** Shown when the todo list is empty.

Renders:
- An icon (e.g., clipboard or checklist)
- A title: "No todos yet"
- A subtitle: "Add your first todo above"

No CTA button (the form is always visible above the list).

---

### ThemeToggle — `components/theme/ThemeToggle.tsx`

**Type:** Client component

**Purpose:** Fixed top-right button to toggle between light and dark mode.

**Key implementation:** Uses `useSyncExternalStore` to read the theme on the client without causing a hydration mismatch. The server always renders a neutral state; the client hydrates to the user's actual theme preference from `localStorage`.

```tsx
// Hydration-safe pattern
const theme = useSyncExternalStore(
  subscribe,           // listens to theme changes
  getClientSnapshot,  // returns actual theme on client
  getServerSnapshot   // returns "light" on server (avoids mismatch)
);
```

Icons:
- `Sun` icon (lucide-react) when in dark mode (click to go light)
- `Moon` icon (lucide-react) when in light mode (click to go dark)

Position: `fixed top-4 right-4` — always visible, overlaps content.

---

## UI Rules

Defined in `docs/design/ui-rules.md`. Summary below.

### Design Tokens

| Token | Value |
|-------|-------|
| Primary color | `blue-600` (Tailwind) |
| Accent color | `emerald-500` |
| Border radius (default) | `rounded-lg` (8px) |
| Border radius (avatars, badges) | `rounded-full` |
| Font family | Geist (loaded via `next/font` in root layout) |
| Body font size (mobile) | `text-sm` |
| Body font size (desktop) | `text-base` |
| Heading font size | `text-lg` |

### Spacing Scale

- Inline gap: `gap-2` (8px) or `gap-4` (16px)
- Section padding: `p-4 md:p-6 lg:p-8`
- Page max-width: `max-w-7xl mx-auto`

Always use Tailwind default values (4px increments). Do not use arbitrary values like `p-[13px]`.

### State Display Rules

| State | Element | When to use |
|-------|---------|-------------|
| Loading (fast) | `Loader2` spinner (`animate-spin`) | When action takes < 500ms |
| Loading (slow) | Skeleton | When action takes > 500ms; use `bg-muted animate-pulse` |
| Empty | `EmptyState` component | When a list or data section has no items |
| Error | Red banner or inline error | When a Server Action returns `{ error }` |
| Success | Green banner, auto-dismiss 3s | After a successful mutation |

### Responsive Breakpoints

```
Default (no prefix)  — mobile (< 640px)
sm: 640px            — large phones
md: 768px            — tablet
lg: 1024px           — small laptop
xl: 1280px           — desktop
```

**Mobile-first always.** Default (unprefixed) classes are for mobile. Desktop overrides use `md:` or `lg:` prefixes.

Touch targets: interactive buttons must be at least 44x44px on mobile.

### Components: Custom vs. shadcn

shadcn/ui is **not yet installed** in this project. All components are currently custom.

When shadcn is added, use it for: Button, Input, Form, Dialog, Sheet, Avatar, Card, Badge, Toast, Tabs, Select.

Custom components live in:
- `components/ui/` — generic primitives (not yet created)
- `components/features/<domain>/` — domain-specific (e.g., `components/features/todos/`)
- `components/theme/` — theme-specific utilities

### Accessibility Rules

| Rule | Detail |
|------|--------|
| Keyboard navigation | All interactive elements must be reachable via `Tab` |
| Focus ring | Visible by default (Tailwind focus utilities). Never remove `outline-none` without a replacement. |
| Color contrast | WCAG AA minimum. `text-foreground` on `bg-background` always passes. |
| Form labels | All form inputs must have a `<label>`. Never use placeholder as the only label. |
| Modal/Dialog | Focus trap inside; `Esc` closes; return focus to trigger on close. |
| Toast/Alert | `role="status"` for non-critical; `role="alert"` for errors (read immediately by screen readers). |
| Icon buttons | Must have `aria-label` (e.g., `aria-label="Delete todo"`). Icon-only buttons are never accessible without it. |
| Loading states | `aria-disabled={true}` on disabled buttons; `aria-busy={true}` on loading containers. |

### Animation Rules

- All transitions under **200ms** — longer feels slow
- Use: `transition-colors`, `transition-transform` (Tailwind utilities)
- Do NOT use `animate-bounce` or `animate-spin` for decorative UI — only for loading spinners
- Loading skeletons: `animate-pulse`, real content structure, `bg-muted` color

---

## Dark Mode

Dark mode is implemented via `next-themes` and Tailwind's `class` strategy.

- `<html class="dark">` → dark mode active
- `<html class="light">` → light mode active
- All color utilities that need dark variants use: `bg-background`, `text-foreground`, `border-border` (CSS variables defined in the root layout or globals.css)
- Test components in both modes — do not assume white text on white background never happens

---

## Common Patterns

### Client component with async action

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTodo } from "@/app/actions/todos";

export function DeleteButton({ todoId }: { todoId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteTodo(todoId);
    router.refresh();
    // no setIsDeleting(false) needed — component unmounts after refresh
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label="Delete todo"
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
```

### Success banner with auto-dismiss

```tsx
const [successMessage, setSuccessMessage] = useState<string | null>(null);

// After successful mutation:
setSuccessMessage("Todo added!");
setTimeout(() => setSuccessMessage(null), 3000);

// In JSX:
{successMessage && (
  <div role="status" className="bg-green-50 text-green-800 p-3 rounded-lg">
    {successMessage}
  </div>
)}
```

---

## Adding a New Feature Component

1. Create the component in `components/features/<domain>/ComponentName.tsx`
2. Implement all four states: loading, empty (if list), error, success
3. Use `"use client"` only if the component uses hooks or browser APIs
4. Add `aria-label` to all icon-only buttons
5. Test in both light and dark mode manually
6. Ask testing-agent to write component tests covering all states

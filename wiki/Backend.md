# Backend

This page covers Server Actions, error types, response format conventions, Zod validation, auth patterns, and API rules for the AgentFlow / Todo App backend.

---

## Architecture Choice: Server Actions

This project uses **Next.js Server Actions** as the primary mutation mechanism, not REST API routes.

| Pattern | Use when |
|---------|----------|
| Server Actions | UI mutations from React components (preferred) |
| REST API routes (`app/api/`) | External clients, mobile apps, or precise HTTP control |

Server Actions run on the server, are type-safe with TypeScript, and integrate naturally with react-hook-form. They do not require a separate HTTP client.

---

## Server Actions

All Server Actions live in `app/actions/todos.ts`. They share a module-level in-memory store (a TypeScript `Map`) until the real database is wired up.

### `createTodo(input: CreateTodoInput)`

Creates a new todo.

**Input:** `CreateTodoInput` from `lib/validations/todo.ts` (Zod-validated)

**Process:**
1. Validates input with `CreateTodoSchema.safeParse(input)`
2. Checks auth (TODO stub — no auth yet)
3. Creates a new `Todo` object with `crypto.randomUUID()` as the ID
4. Adds to the in-memory store
5. Returns `{ data: Todo }`

**Error cases:**
- Blank/empty title → `{ error: { message: "...", code: "VALIDATION" } }`
- Title over 100 chars → `{ error: { message: "...", code: "VALIDATION" } }`
- Unexpected error → `{ error: { message: "...", code: "INTERNAL_ERROR" } }`

---

### `getTodos()`

Returns all todos, sorted: pinned first, then by `createdAt` ascending.

**Process:**
1. Reads from in-memory store
2. Sorts: `isPinned` descending (pinned first), then `createdAt` ascending
3. Returns `{ data: Todo[] }`

**Error cases:**
- Unexpected error → `{ error: { message: "...", code: "INTERNAL_ERROR" } }`

**Note:** Called server-side in `app/todos/page.tsx` as an async function. Not a form action.

---

### `deleteTodo(id: string)`

Deletes a todo by ID.

**Process:**
1. Checks auth (TODO stub)
2. Finds the todo in the in-memory store
3. If not found → `{ error: { message: "...", code: "NOT_FOUND" } }`
4. Removes from store
5. Returns `{ data: { success: true } }`

---

### `togglePinTodo(id: string)`

Toggles the `isPinned` flag on a todo.

**Process:**
1. Checks auth (TODO stub)
2. Finds the todo in the in-memory store
3. If not found → `{ error: { message: "...", code: "NOT_FOUND" } }`
4. Flips `isPinned`
5. Returns `{ data: Todo }` (the updated todo)

---

## Todo Type

```ts
export type Todo = {
  id: string;
  title: string;
  createdAt: string;   // ISO 8601 string (not Date object — safe for serialization)
  isPinned: boolean;
};
```

---

## ActionError Type

```ts
export type ActionError = {
  message: string;
  code: ErrorCode;
  details?: unknown;   // Zod flatten() output for VALIDATION errors
};

export type ErrorCode =
  | "VALIDATION"
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";
```

---

## Error Codes

| Code | HTTP Equivalent | When Used |
|------|----------------|-----------|
| `VALIDATION` | 400 | Zod schema parse failed; includes `details` with field errors |
| `AUTH_REQUIRED` | 401 | No active session (future: when auth is implemented) |
| `NOT_FOUND` | 404 | Resource does not exist, or user has no access (do not reveal which) |
| `FORBIDDEN` | 403 | Session OK but user lacks permission (use 404 instead to avoid info leakage) |
| `CONFLICT` | 409 | Duplicate (e.g., unique constraint violation) |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error; always `console.error` on server |

---

## Response Format Convention

Every Server Action returns a discriminated union. This is the required format — do not return plain values or throw exceptions.

```ts
// Success
{ data: T }

// Error
{ error: { message: string; code: ErrorCode; details?: unknown } }
```

### Client-side handling pattern

```ts
const result = await createTodo({ title });

if ("error" in result) {
  setErrorMessage(result.error.message);
  return;
}

// result.data is typed as Todo
setSuccessMessage("Todo added!");
```

---

## Zod Validation

Zod schemas are defined in `lib/validations/` and are **shared between frontend and backend**. Do not define validation logic twice.

### Current Schema — `lib/validations/todo.ts`

```ts
import { z } from "zod";

export const CreateTodoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be 100 characters or fewer"),
});

export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
```

### Validation in Server Actions

```ts
const parsed = CreateTodoSchema.safeParse(input);
if (!parsed.success) {
  return {
    error: {
      message: "Invalid input",
      code: "VALIDATION" as const,
      details: parsed.error.flatten(),
    },
  };
}
// Use parsed.data — guaranteed to be valid and trimmed
```

### Validation in Forms (frontend)

The same schema is imported in `TodoForm.tsx` for client-side validation with react-hook-form. This ensures validation rules are identical on both sides.

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateTodoSchema } from "@/lib/validations/todo";

const form = useForm<CreateTodoInput>({
  resolver: zodResolver(CreateTodoSchema),
});
```

---

## Auth Check Pattern

Authentication is **not yet implemented** in this project. All auth checks are TODO stubs.

### Current stub pattern

```ts
// TODO: Replace with real auth check when auth is implemented
// const session = await auth();
// if (!session?.user) {
//   return { error: { message: "Unauthorized", code: "AUTH_REQUIRED" } };
// }
```

### Future implementation pattern (when auth is added)

```ts
import { auth } from "@/lib/auth";

export async function createTodo(input: CreateTodoInput) {
  const session = await auth();
  if (!session?.user) {
    return {
      error: { message: "Unauthorized", code: "AUTH_REQUIRED" as const },
    };
  }
  // session.user.id is now available
}
```

For REST API routes:
```ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "AUTH_REQUIRED" } },
      { status: 401 }
    );
  }
}
```

---

## Ownership Check Pattern

When resources belong to specific users (after auth is implemented):

```ts
const todo = await prisma.todo.findUnique({ where: { id } });

// Return 404 (not 403) — never reveal whether the resource exists
// to a user who does not own it
if (!todo || todo.userId !== session.user.id) {
  return {
    error: { message: "Not found", code: "NOT_FOUND" as const },
  };
}
```

This applies to all mutations: delete, update, togglePin. Never return 403 for resource-level access control — it leaks existence information.

---

## Error Logging Rules

```ts
// Acceptable — log errors for debugging, never log PII
console.error("[createTodo] Unexpected error:", error);

// FORBIDDEN — never log user data
console.log("Creating todo for user:", session.user.email); // ❌
console.log("Request body:", body); // ❌ (body may contain PII)

// In development only
console.log("[createTodo] Validation failed"); // OK in dev
```

---

## Rate Limiting (Not Yet Implemented)

For future public endpoints (register, login, password reset):

- Upstash Redis or in-memory store (production: Redis)
- Default: 5 requests per 60 seconds per IP
- Response on exceed: `{ error: { code: "RATE_LIMITED" } }` with `Retry-After` header

The current Server Actions have no rate limiting. This is acceptable because:
1. There is no auth (no login endpoint to brute-force)
2. Server Actions require a matching CSRF cookie (Next.js enforces this)

---

## Pagination Pattern (Not Yet Implemented)

For future list endpoints with many items:

```ts
// Cursor-based pagination (preferred over offset)
// GET /api/todos?cursor=abc&limit=20

// Response
{
  data: {
    items: Todo[];
    nextCursor: string | null;  // null means no more pages
  }
}
```

`getTodos()` currently returns all todos with no pagination. When adding pagination:
1. Add `cursor` and `limit` params to `getTodos`
2. Use Prisma's `cursor` + `take` for DB queries
3. Return `nextCursor` as the ID of the last item

---

## REST API Routes (Not Yet Used)

If REST routes are added (for external API access):

Location: `app/api/<domain>/route.ts`

Naming conventions:
- `GET /api/todos` — list all
- `GET /api/todos/[id]` — get single
- `POST /api/todos` — create
- `PATCH /api/todos/[id]` — partial update
- `DELETE /api/todos/[id]` — delete

All routes follow the same `{ data: T }` / `{ error: {...} }` response format.

---

## Adding a New Server Action

1. Add the Zod schema to `lib/validations/todo.ts` (or create a new file)
2. Implement the action in `app/actions/todos.ts`
3. Export the action and its types
4. Add auth check (or TODO stub with explanation)
5. Add ownership check if the resource belongs to a user
6. Export any new types from the action file
7. Ask testing-agent to write 3+ tests (success, validation, auth)

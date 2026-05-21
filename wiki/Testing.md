# Testing

This page covers the test structure, naming conventions, Vitest configuration, what is covered, test patterns, coverage minimums, and what to do when a test fails.

---

## Test Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit and component tests (runs in Node.js with jsdom) |
| `@testing-library/react` | Component rendering and interaction |
| `@testing-library/user-event` | Simulated user events (click, type, etc.) |
| jsdom | Browser-like environment for component tests |
| Playwright | E2E browser tests (config in place, not yet in active use) |

---

## Test Structure

```
tests/
├── unit/
│   ├── actions/
│   │   ├── todos.test.ts          — createTodo, getTodos, deleteTodo
│   │   └── todos-pin.test.ts      — togglePinTodo + sort order
│   ├── validations/
│   │   └── todo.test.ts           — CreateTodoSchema edge cases
│   └── (utils/ for future lib utilities)
├── components/
│   └── todos/
│       ├── TodoForm.test.tsx      — form submit, loading, error, success states
│       ├── TodoList.test.tsx      — list rendering, empty state delegation
│       ├── TodoItem-pin.test.tsx  — pin button states, spinner, aria-label
│   └── theme/
│       └── ThemeToggle.test.tsx   — icon switching, accessibility
├── integration/
│   └── (api/ and actions/ for future API route tests)
├── e2e/
│   └── (Playwright specs — not yet written)
└── factories/
    └── (test data builders — not yet created)
```

---

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `<name>.test.ts` | `todos.test.ts` |
| Component test | `<ComponentName>.test.tsx` | `TodoForm.test.tsx` |
| E2E spec | `<flow>.spec.ts` | `add-todo.spec.ts` |
| Feature-specific test | `<name>-<feature>.test.ts` | `todos-pin.test.ts` |

---

## Vitest Configuration

Location: `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,                // describe, it, expect — no imports needed
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/**", "app/api/**", "app/actions/**"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

### Vitest Globals and TypeScript

`globals: true` makes `describe`, `it`, `expect`, `beforeEach`, etc. available without imports. For TypeScript to recognize these globals, `tsconfig.json` must include:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

This fix was applied during the Item 2 pipeline (see `docs/handover.md` Pitfall 4).

### Running Tests

```bash
pnpm test              # Watch mode (development)
pnpm vitest run        # Single run (CI / pre-commit)
pnpm vitest run --coverage  # With coverage report
```

---

## What Is Currently Covered

### Unit Tests: Server Actions (`tests/unit/actions/`)

**`todos.test.ts`**
- `createTodo` with valid input → returns `{ data: Todo }`
- `createTodo` with empty title → returns `{ error: { code: "VALIDATION" } }`
- `createTodo` with title over 100 chars → returns `{ error: { code: "VALIDATION" } }`
- `getTodos` returns all todos sorted by creation order
- `deleteTodo` removes the correct todo
- `deleteTodo` with unknown ID → returns `{ error: { code: "NOT_FOUND" } }`

**`todos-pin.test.ts`**
- `togglePinTodo` sets `isPinned: true` on unpinned todo
- `togglePinTodo` sets `isPinned: false` on pinned todo
- `togglePinTodo` with unknown ID → returns `{ error: { code: "NOT_FOUND" } }`
- `getTodos` returns pinned todos before unpinned todos
- `getTodos` within the same pin group sorts by `createdAt` ascending

### Unit Tests: Zod Schemas (`tests/unit/validations/`)

**`todo.test.ts`**
- Valid title → `safeParse` succeeds
- Empty string → fails with required error
- Blank string (spaces only) → fails after trim (Zod `.trim()`)
- Title of exactly 100 chars → succeeds
- Title of 101 chars → fails with max-length error
- Title with leading/trailing spaces → trimmed in `parsed.data.title`

### Component Tests (`tests/components/`)

**`TodoForm.test.tsx`**
- Renders input and submit button
- Submit with empty title → shows validation error, does not call action
- Submit with valid title → calls `createTodo`, shows loading spinner
- Successful submit → form resets, success banner shown
- Failed submit → error banner shown, form not reset

**`TodoList.test.tsx`**
- Renders a list of TodoItem components when todos provided
- Renders EmptyState when todos array is empty

**`TodoItem-pin.test.tsx`**
- Renders pin button with correct aria-label
- Renders delete button with correct aria-label
- Pin button shows Loader2 while action is pending
- Delete button shows Loader2 while action is pending
- Pin button toggles aria-label after state change

**`ThemeToggle.test.tsx`**
- Renders without crashing
- Shows correct icon based on theme state
- Button has accessible label

---

## Test Patterns

### Pure Function / Server Action (Unit)

```ts
import { createTodo } from "@/app/actions/todos";

describe("createTodo", () => {
  it("creates a todo with valid input", async () => {
    const result = await createTodo({ title: "Buy milk" });
    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data.title).toBe("Buy milk");
      expect(result.data.isPinned).toBe(false);
    }
  });

  it("rejects empty title", async () => {
    const result = await createTodo({ title: "" });
    expect(result).toHaveProperty("error");
    if ("error" in result) {
      expect(result.error.code).toBe("VALIDATION");
    }
  });
});
```

### Zod Schema Test

```ts
import { CreateTodoSchema } from "@/lib/validations/todo";

describe("CreateTodoSchema", () => {
  it.each([
    ["Buy milk", true, "valid title"],
    ["", false, "empty string"],
    ["   ", false, "whitespace only"],
    ["a".repeat(100), true, "exactly 100 chars"],
    ["a".repeat(101), false, "101 chars — over limit"],
  ])("title=%j → success=%s (%s)", (title, expected) => {
    const result = CreateTodoSchema.safeParse({ title });
    expect(result.success).toBe(expected);
  });
});
```

### Component Test

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoForm } from "@/components/features/todos/TodoForm";

vi.mock("@/app/actions/todos", () => ({
  createTodo: vi.fn().mockResolvedValue({ data: { id: "1", title: "Test", createdAt: new Date().toISOString(), isPinned: false } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("TodoForm", () => {
  it("shows success banner after successful submit", async () => {
    render(<TodoForm />);
    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /add todo/i });

    await userEvent.type(input, "Buy milk");
    await userEvent.click(button);

    expect(await screen.findByText(/todo added/i)).toBeInTheDocument();
  });
});
```

### API Route Integration Test (For Future REST Routes)

```ts
import { POST } from "@/app/api/todos/route";

describe("POST /api/todos", () => {
  it("returns 401 without session", async () => {
    const req = new Request("http://localhost/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });
});
```

---

## What We Do NOT Do

| Prohibited | Why |
|-----------|-----|
| `.skip()` to make CI pass | Masks real failures |
| Comment-out failing tests | Same as skipping |
| Weaken assertions (`toBeTruthy()` instead of `toBe(true)`) | Hides logic bugs |
| Delete tests without a commit message explanation | Removes coverage silently |
| Share database state between E2E tests | Causes flaky tests |
| Test implementation details (e.g., internal state variable names) | Tests should test behavior |
| Mock the module under test | If you need to mock `createTodo` to test `createTodo`, the test is wrong |

---

## Coverage Minimums

| Scope | Minimum |
|-------|---------|
| Every Server Action | 3+ tests: success, validation error, auth error |
| Every Zod schema | 3+ tests: valid input, missing required field, boundary/edge case |
| Every critical user flow | 1 E2E test (when E2E is set up) |
| Custom utility functions in `lib/` | 80%+ branch coverage |
| Components with user interaction | Tests for each interactive state |

---

## When a Test Fails

**Rule 1: Do not modify the test to make it pass. Fix the code.**

If the test expectation is correct and the code is wrong, fix the code. The test is not wrong just because it is failing.

**Rule 2: Do not add `.skip()`. Fix the code, or delete the test with an explanation.**

If you genuinely cannot fix the code right now and the test must be deactivated temporarily, delete it (do not skip) and add an explanation in the commit message:
```
test: remove TodoForm success test — createTodo mocking broken by new auth middleware
TODO: restore after auth middleware is mocked in test setup
```

**Rule 3: If the test itself is wrong, fix it and commit separately.**

If you discover the test had an incorrect expectation, fix the test in its own commit. Do not silently weaken the assertion — explain what the correct behavior is.

**Coordinator rule:** If `vitest run` fails after an agent session, the coordinator does not proceed to the next phase. It reverts broken files, re-runs the suite, and confirms 100% green before presenting the checkpoint.

---

## Playwright E2E Configuration

Location: `playwright.config.ts`

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

E2E tests are not yet written. The first E2E test to add would cover the full add-todo flow:

```ts
// tests/e2e/add-todo.spec.ts
test("user can add a todo", async ({ page }) => {
  await page.goto("/todos");
  await page.fill('input[name="title"]', "Buy milk");
  await page.click('button:has-text("Add Todo")');
  await expect(page.getByText("Buy milk")).toBeVisible();
});
```

---

## Test Data Factories (For Future Use)

When Prisma is wired up, use factories to create test data:

```ts
// tests/factories/todo.ts
export function createTodoFixture(overrides?: Partial<Todo>): Todo {
  return {
    id: "test-todo-1",
    title: "Test todo",
    createdAt: new Date().toISOString(),
    isPinned: false,
    ...overrides,
  };
}
```

---

## CI Integration

Tests run in CI on every push and PR. See [CI-CD](CI-CD.md) for the full workflow. The test commands:

```yaml
- run: pnpm install
- run: pnpm tsc --noEmit
- run: pnpm lint
- run: pnpm vitest run --coverage
```

Playwright E2E is not yet in CI (no E2E tests written yet).

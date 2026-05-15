# Testing Rules

## Stack

- **Vitest**: unit + integration tests
- **Playwright**: E2E browser tests
- **Coverage target**: 70%+ on `lib/` and `app/api/`

## Structure

```
tests/
├── unit/
│   ├── validations/      # Zod schemas
│   ├── utils/            # lib/utils/ functions
│   └── components/       # Components (only pure ones)
├── integration/
│   ├── api/              # API routes
│   └── actions/          # Server Actions
├── e2e/
│   ├── auth.spec.ts
│   ├── profile.spec.ts
│   └── ...
└── factories/            # test data builders
```

## Naming

- Unit/integration: `<name>.test.ts`
- E2E: `<flow>.spec.ts`

## Vitest config

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
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

## Playwright config

```ts
// playwright.config.ts
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

## Test patterns

### Pure function
```ts
import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/utils/date";

describe("formatDate", () => {
  it("formats ISO date into a readable string", () => {
    expect(formatDate("2026-05-12")).toBe("May 12, 2026");
  });
});
```

### Zod schema
```ts
describe("ProfileSchema", () => {
  it.each([
    ["", false, "empty name"],
    ["a".repeat(101), false, "name over 100 chars"],
    ["John", true, "valid name"],
  ])("name=%j → success=%s (%s)", (name, expected) => {
    const result = ProfileSchema.safeParse({ name, email: "j@e.com" });
    expect(result.success).toBe(expected);
  });
});
```

### API endpoint (integration)
```ts
import { POST } from "@/app/api/profile/route";

describe("POST /api/profile", () => {
  it("returns 401 without session", async () => {
    const req = new Request("http://localhost/api/profile", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });
});
```

### E2E flow
```ts
test("user can complete profile setup", async ({ page }) => {
  await page.goto("/onboarding");
  await page.fill('input[name="name"]', "Test User");
  await page.click('button:has-text("Continue")');
  await expect(page).toHaveURL("/dashboard");
});
```

## Test data factories

```ts
// tests/factories/profile.ts
import type { Profile } from "@prisma/client";

export function createProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: "test-profile-1",
    userId: "test-user-1",
    name: "Test User",
    email: "test@example.com",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}
```

## What we DON'T do

- ❌ `.skip()` to make CI pass
- ❌ Comment-out tests
- ❌ Weakening assertions (`toBeTruthy` instead of `toBe(true)`)
- ❌ Deleting tests without explanation in commit message
- ❌ Sharing database between e2e tests (each test cleans up its own)
- ❌ Testing implementation detail (test behavior, not structure)

## Coverage minimum (per feature)

- Every API endpoint: 3+ tests (success, validation, auth)
- Every Zod schema: 3+ tests (valid, invalid required, edge case)
- Every critical user flow: at least 1 E2E test
- Every custom util function: 80%+ branch coverage

## When a test fails

1. **DO NOT modify the test to pass** — fix the code
2. **DO NOT add `.skip()`** — fix the code or delete the test with explanation
3. If the test itself is wrong: report it in the PR description, fix it, commit separately

## CI integration

```yaml
# .github/workflows/test.yml (example)
- run: pnpm install
- run: pnpm tsc --noEmit
- run: pnpm lint
- run: pnpm vitest run --coverage
- run: pnpm playwright install --with-deps
- run: pnpm playwright test
```

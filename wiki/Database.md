# Database

This page covers the Prisma schema, migration commands, indexing conventions, RLS policies (for future Supabase use), seed data, and the steps to wire up the real PostgreSQL database.

---

## Current State

| Aspect | Status |
|--------|--------|
| Prisma ORM | Installed (`@prisma/client` + `prisma` in package.json) |
| Schema file | Exists at `prisma/schema.prisma` — defines the `Todo` model |
| Prisma singleton | Exists at `lib/prisma.ts` — correct Next.js pattern |
| Database connection | NOT configured — no `DATABASE_URL` in `.env` |
| Migrations | NOT run — no `prisma/migrations/` directory |
| Used in production code | NOT imported — `app/actions/todos.ts` uses in-memory store |
| In-memory store | Active — all data resets on server restart |

The Prisma schema and singleton were created during the impossible-instruction experiment (see [Error-Recovery](Error-Recovery.md)) and intentionally kept as useful artifacts. They are correct and ready to use when a database is configured.

---

## Current Prisma Schema

Location: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Todo {
  id        String   @id @default(cuid())
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("todos")
}
```

### Notes on the Current Schema

- `isPinned` is **not yet in the schema** — it exists only in the in-memory store's `Todo` type. Adding it requires a new migration.
- No `userId` field — todos are not yet associated with users. This will need to be added when auth is implemented.
- No `deletedAt` (soft delete) — todos are hard-deleted. Add `deletedAt DateTime?` if recovery is needed.
- `@@map("todos")` maps the Prisma model name `Todo` to the SQL table name `todos` (snake_case, plural).

---

## Prisma Model Conventions

| Convention | Example |
|------------|---------|
| IDs | `String @id @default(cuid())` — not autoincrement |
| Timestamps | `createdAt DateTime @default(now())` + `updatedAt DateTime @updatedAt` on every model |
| Soft delete | `deletedAt DateTime?` — add when records may need recovery |
| Table names | `@@map("snake_case_plural")` — e.g., `@@map("todos")` |
| Foreign keys | `@@index([userId])` — index every foreign key |
| Composite indexes | `@@index([userId, createdAt])` — for sort + filter queries |

---

## Migration Commands

### Safe Commands (Use These)

```bash
# Create a new migration after changing schema.prisma
pnpm prisma migrate dev --name <short_description>

# Apply existing migrations (e.g., in CI or on a new machine)
pnpm prisma migrate deploy

# Regenerate Prisma client after schema changes (no DB required)
pnpm prisma generate

# Seed the database
pnpm prisma db seed

# Open Prisma Studio (visual DB browser)
pnpm prisma studio
```

### Forbidden Commands

```bash
pnpm prisma migrate reset   # ❌ Wipes ALL data — NEVER run
pnpm prisma db push         # ❌ Bypasses migration history — NEVER use in production
```

`prisma migrate reset` is explicitly blocked in `.claude/settings.json`. No agent is allowed to run it.

---

## Reversibility Rules

Every migration must be reversible, OR must document why it is not:

| Change type | Reversible | Notes |
|------------|-----------|-------|
| `ADD COLUMN` nullable | Yes | New nullable column — safe to reverse |
| `ADD COLUMN` with default | Yes | Existing rows get default value |
| `ADD INDEX` | Yes | Drop the index to reverse |
| `ALTER COLUMN` change type | Careful | May fail on existing data |
| `DROP COLUMN` | No | Requires a backup plan; data is gone |
| `RENAME TABLE` | Yes (with care) | Coordinate with any raw SQL references |
| `ADD CONSTRAINT` (unique) | No if duplicates exist | Check data first |

---

## Steps to Wire Up the Real Database

Follow these steps when you are ready to switch from in-memory to PostgreSQL.

### 1. Provision a Database

Local option:
```bash
# Using Docker
docker run --name agentflow-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agentflow \
  -p 5432:5432 \
  -d postgres:16
```

Or use a hosted service: Supabase, Neon, Railway, PlanetScale (PostgreSQL mode).

### 2. Set `DATABASE_URL` in `.env`

Create `.env` in the project root (never commit this file):
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agentflow"
```

For Supabase:
```
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

### 3. Add `isPinned` to the Schema

Edit `prisma/schema.prisma`:
```prisma
model Todo {
  id        String   @id @default(cuid())
  title     String
  isPinned  Boolean  @default(false)   // ADD THIS
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("todos")
}
```

### 4. Run the Migration

```bash
pnpm prisma migrate dev --name add_todo_model_and_is_pinned
```

This will:
- Create `prisma/migrations/<timestamp>_add_todo_model_and_is_pinned/migration.sql`
- Apply the migration to your database
- Regenerate the Prisma client

### 5. Replace the In-Memory Store in Server Actions

In `app/actions/todos.ts`, replace the in-memory array with Prisma calls:

```ts
import { prisma } from "@/lib/prisma";

export async function createTodo(input: CreateTodoInput) {
  // ... validation ...
  const todo = await prisma.todo.create({
    data: { title: parsed.data.title },
  });
  return { data: todo };
}

export async function getTodos() {
  const todos = await prisma.todo.findMany({
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "asc" },
    ],
  });
  return { data: todos };
}

export async function deleteTodo(id: string) {
  await prisma.todo.delete({ where: { id } });
  return { data: { success: true } };
}

export async function togglePinTodo(id: string) {
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo) return { error: { message: "Not found", code: "NOT_FOUND" as const } };
  const updated = await prisma.todo.update({
    where: { id },
    data: { isPinned: !todo.isPinned },
  });
  return { data: updated };
}
```

### 6. Run Tests

```bash
pnpm test
```

Some unit tests mock the in-memory store. After switching to Prisma, tests that call Server Actions will need to mock `prisma` instead. Ask testing-agent to update the tests.

---

## Prisma Singleton Pattern

Location: `lib/prisma.ts`

This is the correct Next.js pattern to prevent multiple Prisma Client instances during development hot-reload:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Import it everywhere as:
```ts
import { prisma } from "@/lib/prisma";
```

---

## Indexing Conventions

Add indexes for:

| Scenario | Index type |
|----------|-----------|
| Foreign keys | Prisma adds automatically for `@relation` fields |
| Frequently filtered fields | `@@index([status])` |
| Sort + filter combinations | `@@index([userId, createdAt])` |
| Unique constraints | `@@unique([email])` |
| Soft-delete queries | `@@index([deletedAt])` |

For the Todo model after auth is added:
```prisma
@@index([userId])
@@index([userId, createdAt])
@@index([isPinned, createdAt])
```

---

## Supabase RLS (For Future Use)

If migrating from Prisma direct connection to Supabase with Row Level Security:

### Enable RLS on every table

```sql
alter table todos enable row level security;
```

### Standard policies

```sql
-- Users can view only their own todos
create policy "Users can view own todos"
  on todos for select
  using (auth.uid() = user_id);

-- Users can insert their own todos
create policy "Users can insert own todos"
  on todos for insert
  with check (auth.uid() = user_id);

-- Users can update only their own todos
create policy "Users can update own todos"
  on todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete is handled via application logic (no direct delete policy)
```

### SECURITY DEFINER functions

When you need cross-table operations that bypass RLS:

```sql
create or replace function get_user_todo_count()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp   -- REQUIRED: explicit search_path
as $$
begin
  return (select count(*) from todos where user_id = auth.uid());
end;
$$;

-- Explicitly restrict who can call this function
revoke execute on function get_user_todo_count from public, anon;
grant execute on function get_user_todo_count to authenticated;
```

---

## Seed Data

When the database is wired up, use `prisma/seed.ts` for development data.

```ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Idempotent — safe to run multiple times
  await prisma.todo.upsert({
    where: { id: "seed-todo-1" },
    update: {},
    create: {
      id: "seed-todo-1",
      title: "Set up the project",
      isPinned: true,
    },
  });

  await prisma.todo.upsert({
    where: { id: "seed-todo-2" },
    update: {},
    create: {
      id: "seed-todo-2",
      title: "Add the first feature",
      isPinned: false,
    },
  });

  console.log("Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run:
```bash
pnpm prisma db seed
```

---

## Privacy Rules

| Rule | Enforcement |
|------|------------|
| Never log entire user objects | Only log `userId`, never full user record |
| Never expose `passwordHash` or tokens in queries | Use explicit `select` in Prisma queries |
| Never select `*` from user tables | `select: { id: true, email: true, name: true }` |
| Never commit `.env` | Already in `.gitignore` — verify before every commit |
| Never log full request bodies | May contain PII; log only non-sensitive fields |

```ts
// FORBIDDEN
const user = await prisma.user.findUnique({ where: { id } });
console.log("User:", user); // ❌ logs passwordHash, tokens, PII

// CORRECT
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true }, // explicit safe fields
});
```

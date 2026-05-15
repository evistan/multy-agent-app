# Database Rules

> **NOTE**: This file covers both Prisma and Supabase. Delete sections you don't use.

## Technology

- **Primary**: PostgreSQL via Prisma ORM
- **Option**: Supabase (PostgreSQL + RLS + auth + storage)

## Schemas

### Prisma model conventions

```prisma
model Profile {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name      String
  email     String
  avatarUrl String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?  // soft delete

  @@index([userId])
  @@index([deletedAt])
  @@map("profiles")
}
```

- ID: `cuid()` (not autoincrement — collision risk and easier sharding)
- Timestamps: `createdAt`, `updatedAt` on EVERY model
- Soft delete: `deletedAt: DateTime?` if a resource can be restored
- Tables: `@@map("snake_case_plural")`

## Migrations

```bash
# Creating a migration
pnpm prisma migrate dev --name <short_description>

# NEVER run:
pnpm prisma migrate reset       # ❌ wipes all data
pnpm prisma db push             # ❌ bypasses migration history
```

### Reversible migrations

Every migration must be reversible OR must have an explanation of why it isn't:
- ✅ ADD COLUMN nullable — reversible
- ✅ ADD INDEX — reversible
- ⚠️ ALTER COLUMN type — careful, can fail on existing data
- ❌ DROP COLUMN — irreversible, requires a backup plan

## Indexes

Consider indexes for:
- Foreign keys (Prisma already adds implicit index for `@relation`)
- Fields you filter on often: `@@index([status])`
- Composite for sort + filter: `@@index([userId, createdAt])`
- Unique constraints: `@@unique([email])`

## Supabase RLS (if used)

### Rule: EVERY table must have RLS enabled

```sql
alter table profiles enable row level security;
```

### Standard policies

```sql
-- Users can view their own
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = user_id);

-- Users can update their own
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Nobody can DELETE directly (only via app logic)
-- Do not create a delete policy.
```

## SECURITY DEFINER functions

When using `security definer` (e.g. for cross-table operations):

```sql
create or replace function complex_operation()
returns ...
language plpgsql
security definer
set search_path = public, pg_temp  -- REQUIRED explicit
as $$
...
$$;

-- Explicit grant — don't leave public default
revoke execute on function complex_operation from public, anon;
grant execute on function complex_operation to authenticated;
```

## Seed data

```ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // idempotent — use upsert
  await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { email: "demo@example.com", name: "Demo User" },
  });
}

main().finally(() => prisma.$disconnect());
```

Run: `pnpm prisma db seed`

## Privacy

- **NEVER** log entire user objects (PII)
- **NEVER** expose `passwordHash`, `tokenSecret` in Prisma select
- Use `select: { id, email, name }` explicitly — not `select: *`

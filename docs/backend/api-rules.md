# API Rules

## API styles we use

1. **Server Actions** (preferred for mutations from UI)
2. **REST API routes** (for external clients, mobile, or precise HTTP control)

## Locations

- Server Actions: `app/actions/<domain>.ts` or `lib/actions/<domain>.ts`
- REST routes: `app/api/<domain>/route.ts`
- Zod schemas: `lib/validations/<domain>.ts` (shared with frontend)

## Naming conventions

### REST endpoints
- `GET /api/profiles/[id]` — read single
- `GET /api/profiles` — list (with pagination)
- `POST /api/profiles` — create
- `PUT /api/profiles/[id]` — full update
- `PATCH /api/profiles/[id]` — partial update
- `DELETE /api/profiles/[id]` — delete

### Server Actions
- `createProfile(input: ProfileInput)`
- `updateProfile(id: string, input: ProfileInput)`
- `deleteProfile(id: string)`

## Response format (REQUIRED)

```ts
// Success
{ data: T }

// Error
{ error: { message: string, code: string, details?: unknown } }
```

## Error codes

| Code | HTTP status | When |
|------|-------------|------|
| `AUTH_REQUIRED` | 401 | No session |
| `FORBIDDEN` | 403 | Session OK but user lacks permission |
| `NOT_FOUND` | 404 | Resource does not exist (OR user has no access — security) |
| `VALIDATION` | 400 | Zod parse fail |
| `CONFLICT` | 409 | Duplicate (e.g. email taken) |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected — always log on server |

## Auth check (every mutation)

```ts
const session = await auth();
if (!session?.user) {
  return NextResponse.json(
    { error: { message: "Unauthorized", code: "AUTH_REQUIRED" } },
    { status: 401 }
  );
}
```

## Ownership check (multi-user resources)

```ts
const resource = await prisma.resource.findUnique({ where: { id } });
if (!resource || resource.userId !== session.user.id) {
  // 404 NOT 403 — don't leak existence info
  return NextResponse.json(
    { error: { message: "Not found", code: "NOT_FOUND" } },
    { status: 404 }
  );
}
```

## Validation

```ts
const parsed = MySchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    {
      error: {
        message: "Invalid input",
        code: "VALIDATION",
        details: parsed.error.flatten(),
      },
    },
    { status: 400 }
  );
}
```

## Rate limiting

For public endpoints (login, register, password reset):
- Upstash Redis or in-memory (production: Redis)
- 5 requests per 60s per IP as default
- 429 with Retry-After header

## Pagination pattern

```ts
// GET /api/profiles?cursor=abc&limit=20
{
  data: {
    items: T[],
    nextCursor: string | null
  }
}
```

## Webhooks (if used)

- Always verify signature
- Idempotent — use event ID to prevent double processing
- Return 2xx quickly, process async

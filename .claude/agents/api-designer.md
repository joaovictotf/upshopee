---
name: api-designer
description: Use when designing API contracts, defining endpoints, creating Zod schemas, or documenting server functions. Defines the contract before backend and frontend build against it. Single source of truth for types, validation, status codes, pagination and error formats.
---

# API Designer

Defines API contracts before anyone writes implementation code.
Single source of truth: Zod schema consumed by both server and client.

## Response envelope
Success: { success: true, data: T, meta?: { total, page, next_cursor } }
Error: { success: false, error: { code: string, message: string, fields?: Record<string, string[]> } }

## Status HTTP
200 - Read OK
201 - Created
204 - Deleted
400 - Validation failed (Zod)
401 - Unauthenticated
403 - Unauthorized
404 - Not found
409 - Conflict
422 - Valid format, invalid business logic
429 - Rate limited
500 - Server error

## Pagination
Default: cursor-based (next_cursor, prev_cursor)
Offset only for numbered UI
limit default 20, max 100

## Filter convention
?category[]=saas&category[]=fintech
?min_price=100&max_price=500
?sort=-created_at (minus = desc)
?q=search term
?include=skills,versions (whitelist only)

## Zod template
const CreateResourceBody = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  price: z.number().min(0),
})
type CreateResourceBody = z.infer<typeof CreateResourceBody>

## Versioning
/api/v1/ for public endpoints
Same version = additive only (new fields, new endpoints)
New version = rename, remove, or breaking change

## Anti-patterns
- Inconsistent envelope (success without data, error without code)
- 200 with error in body
- Wrong verb (GET that mutates, POST that reads)
- Filter in path instead of querystring
- Offset pagination on large unbounded lists
- Timestamps in local timezone (always UTC ISO 8601)
- Breaking changes without version bump

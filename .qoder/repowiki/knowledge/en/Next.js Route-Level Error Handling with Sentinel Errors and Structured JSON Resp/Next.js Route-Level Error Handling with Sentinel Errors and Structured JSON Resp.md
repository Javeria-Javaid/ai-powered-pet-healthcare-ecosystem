---
kind: error_handling
name: Next.js Route-Level Error Handling with Sentinel Errors and Structured JSON Responses
category: error_handling
scope:
    - '**'
source_files:
    - lib/auth.ts
    - app/api/auth/login/route.ts
    - app/api/auth/register/route.ts
    - app/api/pets/route.ts
    - app/api/ai/chat/route.ts
---

## Overview

The Pet Healthcare Ecosystem uses a simple, route-level error handling pattern in its Next.js App Router API handlers. There is no centralized error middleware, custom error class hierarchy, or global exception handler. Instead, each route function wraps its body in a `try/catch` block and returns structured JSON responses with explicit HTTP status codes.

## Error Representation

Errors are represented as plain objects inside a consistent response envelope:

```ts
{ success: false, error: { code: 'BAD_REQUEST', message: '...' } }
```

The `code` field is a string constant (e.g. `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`) that clients can match against. Successful responses use `{ success: true, ...data }`. This pattern is repeated across every route file (`app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/pets/route.ts`, `app/api/ai/chat/route.ts`, etc.).

## Authentication & Authorization Errors

Authentication and authorization errors are propagated via **sentinel strings thrown from helper functions** in `lib/auth.ts`:

- `requireAuth()` throws `new Error('UNAUTHENTICATED')` when no session cookie is present.
- `requireRole(allowedRoles)` throws `new Error('FORBIDDEN')` when the user's role is not in the allowed set.
- `verifyPassword()` silently returns `false` on Argon2 verification failure instead of throwing.

Route handlers catch these sentinel strings explicitly in their `catch` blocks using `if (err.message === 'UNAUTHENTICATED')` / `if (err.message === 'FORBIDDEN')` to map them to `401 Unauthorized` or `403 Forbidden` JSON responses. This is the only mechanism used to propagate auth failures out of `lib/auth.ts` — there are no custom `Error` subclasses.

## Input Validation Errors

Input validation happens inline at the top of each route handler before any database access. Missing or invalid fields return `400 Bad Request` with descriptive messages (e.g. `'Email and password are required.'`, `'Pet name and species are required.'`, `'Message content is required.'`). Role validation in registration checks `Object.values(UserRole).includes(role)` and rejects unknown roles with `400`.

## Business Logic Errors

Business rule violations return specific codes:
- `409 Conflict` for duplicate email during registration.
- `404 Not Found` for missing AI conversations.
- `403 Forbidden` when a user tries to access another user's pet or conversation (ownership checks like `pet.ownerId !== user.id` or `conversation.userId !== user.id`).

## Database & Prisma Errors

Prisma operations are called directly without explicit error wrapping. Unhandled Prisma exceptions bubble up into the route's `catch` block and are converted to a generic `500 Internal Server Error` with the message `'An unexpected error occurred.'` or `'An error occurred.'`. The `lib/db.ts` module does not add any error transformation; it only manages connection pooling differences between development and production.

## Streaming & Tool Errors (AI Chat)

The AI chat endpoint (`app/api/ai/chat/route.ts`) uses a `ReadableStream` with an internal `isClosed` guard. Errors inside the stream are caught per-step:
- Tool execution failures are caught individually and returned to the AI model as `{ success: false, error: e.message }` so the model can retry or adapt.
- Stream write errors are ignored by checking `isClosed` before enqueueing.
- A final catch block sends `{ success: false, error: { message: err.message || 'Internal stream error.' } }` and closes the stream.

## Conventions Observed

1. Every route handler has a single `try/catch` around the entire handler body.
2. Authz/auth failures are signaled by throwing string-error sentinels from `lib/auth.ts`, never by returning `null` or raising typed exceptions.
3. Client-facing errors always include both a machine-readable `code` and a human-readable `message`.
4. Unknown/unexpected errors are collapsed into `INTERNAL_SERVER_ERROR` with a non-technical message — raw stack traces or Prisma error details are never exposed to the client.
5. No global error boundary, Express-style middleware, or `unhandledRejection` listener was found in this repository; error handling is fully decentralized per-route.
6. Console logging (`console.error(...)`) is used alongside error responses for server-side diagnostics but is not part of the response contract.
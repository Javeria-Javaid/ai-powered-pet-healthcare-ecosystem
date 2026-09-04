---
kind: error_handling
name: String-Code Error Propagation with Per-Route Try/Catch in Next.js App Router
category: error_handling
scope:
    - '**'
source_files:
    - lib/auth.ts
    - lib/db.ts
    - lib/ai.ts
    - app/api/auth/login/route.ts
    - app/api/auth/register/route.ts
    - app/api/pets/[petId]/route.ts
    - app/api/appointments/route.ts
---

## Overview

The Pet Healthcare Ecosystem uses a lightweight, convention-driven error handling strategy built on top of Next.js App Router route handlers. There is no centralized error middleware, custom `Error` subclass hierarchy, or global exception handler. Instead, each route handler wraps its logic in a `try/catch`, returns structured JSON responses for client errors, and throws string-message `Error`s that are caught by the caller to map into HTTP status codes.

## Key Patterns Observed

### 1. Structured Error Response Shape
Every API endpoint returns a consistent envelope:
- Success: `{ success: true, ...data }`
- Error: `{ success: false, error: { code: '<CODE>', message: '<human text>' } }`

This shape is used across all routes (login, register, appointments, pets CRUD) and is what the frontend consumes.

### 2. Centralized Auth Errors via String Messages
In `lib/auth.ts`, `requireAuth()` throws `new Error('UNAUTHENTICATED')` and `requireRole()` throws `new Error('FORBIDDEN')`. These sentinel strings are the single source of truth for auth failures. Route handlers catch them explicitly by checking `err.message === 'UNAUTHENTICATED'` and return `{ code: 'UNAUTHORIZED', ... }` with status 401. This pattern avoids creating a dedicated `UnauthorizedError` class — the contract is purely string-based.

### 3. Per-Route Try/Catch as the Global Handler
Each route handler (`app/api/**/*.ts`) follows the same skeleton:
```
export async function POST(req) {
  try { ... }
  catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') return 401 response;
    return { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } }, 500;
  }
}
```
There is no Next.js `error.ts` boundary file, no `unstable_onRequestError`, and no shared error-handling utility — every route duplicates this pattern.

### 4. Domain-Specific Error Codes
The codebase defines a small set of application-level error codes used consistently:
- `BAD_REQUEST` — missing/invalid input fields
- `UNAUTHORIZED` — unauthenticated request
- `FORBIDDEN` — authenticated but not authorized (e.g., wrong pet owner)
- `NOT_FOUND` — resource not found
- `CONFLICT` — duplicate user / double-booked vet slot
- `INTERNAL_SERVER_ERROR` — fallback for unexpected exceptions
- `UNAUTHENTICATED` — internal sentinel thrown by `requireAuth()` (not returned to clients directly)

These codes appear in `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/appointments/route.ts`, and `app/api/pets/[petId]/route.ts`.

### 5. Authorization Helpers Return Typed Results, Not Errors
In `app/api/pets/[petId]/route.ts`, the local helper `getAuthorizedPet(petId, userId)` returns an object `{ status, error, message } | { pet }` instead of throwing. The caller checks `if (authCheck.error)` and maps it to a `NextResponse.json` with the appropriate status. This is a deliberate choice to keep authorization failures as normal control flow rather than exceptions.

### 6. AI Layer Throws Raw Errors Upward
The AI subsystem (`lib/ai.ts` and `lib/ai/providers/*.ts`) throws plain `Error`s with descriptive messages for configuration and API failures:
- `throw new Error('OPENROUTER_API_KEY is not configured...')`
- `throw new Error('OpenRouter API error (status ${res.status}): ${errText}')`
- `throw new Error('Invalid response structure received from OpenRouter.')`
- `throw new Error('Pet not found.')`, `throw new Error('Access Denied: You do not own this pet.')`

These propagate up to the route/tool executor and are surfaced to the LLM tool-calling loop; they are not wrapped in domain error types.

### 7. Defensive `.catch(() => {})` on Non-Critical DB Ops
In `lib/db.ts` and `lib/auth.ts`, cleanup operations like deleting expired sessions use `.catch(() => {})` to swallow errors silently, treating them as best-effort side effects that should not break the main flow.

### 8. No Global Error Boundary or Middleware
A search of the repository finds no `app/error.ts`, no `app/global-error.ts`, no `next.config.ts` error hooks, and no Express-style middleware. Error handling is entirely co-located inside each route handler.

## Architecture & Conventions

| Aspect | Convention |
|---|---|
| Error propagation | Throw `Error` with a known string `message` (e.g. `'UNAUTHENTICATED'`, `'FORBIDDEN'`) |
| Client-facing errors | Return `NextResponse.json({ success: false, error: { code, message } })` with correct HTTP status |
| Unknown errors | Catch-all returns `INTERNAL_SERVER_ERROR` with a generic message |
| Authz failures | Prefer returning typed result objects (e.g. `getAuthorizedPet`) over throwing |
| Validation failures | Return `BAD_REQUEST` early before hitting the database |
| External service failures | Throw descriptive `Error`s; callers decide how to surface them |
| Silent failures | Use `.catch(() => {})` for non-fatal cleanup |

## Constraints Enforced by Code Structure

- Every route handler must be wrapped in `try/catch` — there is no alternative path, so adding a new route without one will leak raw `Error` objects to the client.
- Authenticated endpoints must call `requireAuth()` (or `requireRole()`) at the top of the handler; the string-sentinel contract means any other thrown error will fall through to `INTERNAL_SERVER_ERROR`.
- Business-rule violations (ownership, conflicts, validation) must return explicit `code` values in the error envelope rather than relying on HTTP status alone, because the frontend parses `error.code`.

## Key Files

- `lib/auth.ts` — defines `requireAuth()` / `requireRole()` sentinel errors and session helpers
- `app/api/auth/login/route.ts` — canonical example of input validation → domain error codes → catch-all 500
- `app/api/auth/register/route.ts` — shows role validation and conflict handling
- `app/api/pets/[petId]/route.ts` — demonstrates ownership-check helper returning typed results instead of throwing
- `app/api/appointments/route.ts` — shows transactional conflict detection returning `CONFLICT`
- `lib/ai.ts` — AI provider layer that throws descriptive `Error`s for config/API/validation failures
- `lib/db.ts` — Prisma client with defensive `.catch(() => {})` on non-critical session cleanup
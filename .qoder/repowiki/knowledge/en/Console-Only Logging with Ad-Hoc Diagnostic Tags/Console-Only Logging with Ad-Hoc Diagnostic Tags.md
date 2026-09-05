---
kind: logging_system
name: Console-Only Logging with Ad-Hoc Diagnostic Tags
category: logging_system
scope:
    - '**'
source_files:
    - lib/ai.ts
    - lib/auth.ts
    - lib/db.ts
    - app/api/ai/chat/route.ts
    - app/api/auth/login/route.ts
    - app/api/auth/register/route.ts
    - app/api/auth/google/callback/route.ts
    - app/api/landing-chat/route.ts
    - app/api/appointments/[appointmentId]/conversation/route.ts
    - prisma/schema.prisma
---

## What system/approach is used

The repository has **no dedicated logging framework or library**. All output is produced via Node/Next.js built-in `console` methods (`console.log`, `console.warn`, `console.error`). There is no logger initialization, no log-level configuration, no structured logging library (e.g., pino, winston, bunyan), and no request/response middleware for HTTP logging. The only structured trace mechanism is a database-backed audit log table (`auditLog`) used to record state-changing operations.

## Key files and packages

- `app/api/**/*.ts` — API route handlers emit `console.error` / `console.warn` / `console.log` directly in try/catch blocks around external calls (AI providers, OAuth callbacks, DB queries).
- `lib/ai.ts` — Contains the bulk of application-side diagnostic output, tagged with `[AI DIAGNOSTIC]` and `[AI DIAGNOSTIC - TOOL START]` prefixes to distinguish AI-related logs from other console output.
- `lib/auth.ts` — No logging; authentication errors are surfaced as thrown `Error` objects (`UNAUTHENTICATED`, `FORBIDDEN`) rather than logged.
- `lib/db.ts` — No logging; Prisma client is instantiated without any query hooks or loggers.
- `prisma/schema.prisma` — Defines an `AuditLog` model that stores user actions (e.g., appointment cancellation) with fields `userId`, `action`, `entity`, `entityId`, and `payload` JSON.

## Architecture and conventions

- **Per-route error logging**: Each Next.js API route wraps its handler body in try/catch and emits a single `console.error('... Error:', err.message)` (or `console.warn` for non-fatal failures). The message string includes the endpoint name so the source can be identified by grepping the text.
- **Diagnostic tags for AI subsystem**: Because the AI layer is highly dynamic (provider selection, tool execution, fallback chains), `lib/ai.ts` uses human-readable tag prefixes — `[AI DIAGNOSTIC]` and `[AI DIAGNOSTIC - TOOL START]` — on `console.log`/`console.warn` lines to make them filterable among generic console output.
- **Audit trail via database**: State mutations that need persistence beyond runtime logs write to the `auditLog` Prisma model. For example, cancelling an appointment creates an `APPOINTMENT_UPDATED` audit entry recording previous/new status. This is the only place where structured, queryable "logs" are persisted.
- **No global error handler**: There is no top-level error boundary or Express/Next error middleware that centralizes logging. Errors bubble up to the Next.js default error handler after being logged at the call site.

## Conventions and constraints

Observed patterns (descriptive, not enforced by lint/config):

1. **Use `console.error` for failures** inside API routes; use `console.warn` for recoverable warnings (e.g., failing one AI provider and trying a fallback); use `console.log` for informational/diagnostic traces (especially under `[AI DIAGNOSTIC ...]` tags).
2. **Tag messages with context**: Console strings include the module/route name (e.g., `Login API Error:`, `Gemini fallback failed:`) so operators can identify the origin when grepping logs.
3. **Do not log sensitive data**: Auth code hashes passwords/tokens but never prints them; AI tool arguments are logged but do not contain raw secrets.
4. **Persist critical state changes as audit entries**: Mutations that change business state (appointment cancellation) also create an `auditLog` row — this is the only persistent logging path in the codebase.
5. **No log levels or sinks**: There is no way to toggle verbosity, rotate files, or ship logs to an external service from the current code. Any such capability would require adding a logger library and replacing all `console.*` calls.

### Enforcement

There is no ESLint rule, TypeScript config, or CI check enforcing a logging standard. The only hard constraint is that audit events must conform to the `AuditLog` Prisma model schema defined in `prisma/schema.prisma`; inserting records outside that shape will fail at runtime.
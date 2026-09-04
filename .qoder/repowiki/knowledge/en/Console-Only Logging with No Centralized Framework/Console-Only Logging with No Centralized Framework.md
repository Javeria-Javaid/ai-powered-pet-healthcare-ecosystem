---
kind: logging_system
name: Console-Only Logging with No Centralized Framework
category: logging_system
scope:
    - '**'
source_files:
    - app/api/ai/chat/route.ts
    - app/api/auth/login/route.ts
    - app/api/auth/register/route.ts
    - app/api/auth/logout/route.ts
    - app/api/auth/me/route.ts
    - app/api/auth/google/callback/route.ts
    - app/api/landing-chat/route.ts
    - lib/ai.ts
    - test_booking.ts
---

## What system/approach is used

This repository does **not** implement a centralized logging framework or structured logger. All runtime output goes through Node.js's built-in `console` methods (`console.log`, `console.warn`, `console.error`) directly from the code that needs to emit a message. There are no third-party logging libraries (e.g., Winston, Pino, Bunyan, pino-http) and no custom logger module — the `lib/` directory contains only `ai.ts`, `auth.ts`, and `db.ts`, none of which export a logger.

## Key files and packages

- `app/api/ai/chat/route.ts` — uses `console.error` for AI chat request failures.
- `app/api/auth/login/route.ts`, `register/route.ts`, `logout/route.ts`, `me/route.ts`, `google/callback/route.ts` — use `console.error` around try/catch blocks in auth endpoints.
- `app/api/landing-chat/route.ts` — uses `console.warn` and `console.log` for OpenRouter fallback chain diagnostics.
- `lib/ai.ts` — uses `console.warn` and `console.log` with `[AI DIAGNOSTIC]` prefixed strings to record provider selection, tool execution entry points, and fallback behavior.
- `test_booking.ts` — uses `console.log` / `console.error` for ad-hoc test run output.

No other files in the repo import or define a logging abstraction.

## Architecture and conventions

- **Ad-hoc per-call-site logging**: Every route handler wraps its business logic in try/catch and emits `console.error('... Error:', err.message)` with a short human-readable label identifying the endpoint (e.g. `Login API Error`, `Registration API Error`, `Google OAuth callback error`).
- **Diagnostic prefix convention**: The AI subsystem prefixes diagnostic messages with `[AI DIAGNOSTIC ...]` (e.g. `[AI DIAGNOSTIC] Serving assistant request with provider: GROQ`, `[AI DIAGNOSTIC - TOOL START] Name: ..., Args: ...`) so they can be grepped out of noisy logs.
- **No log levels beyond console primitives**: The codebase relies on the implicit level distinction between `console.log` (informational), `console.warn` (warnings), and `console.error` (errors). There is no configuration to toggle verbosity or filter by severity.
- **No structured fields**: Messages are plain template strings; there are no JSON log objects, correlation IDs, request IDs, user IDs, or timestamps attached to log lines.
- **No sinks or transport**: Output is written to stdout/stderr only; there is no file sink, HTTP collector, log aggregation service, or environment-driven destination switch.

## Conventions and constraints

Observed patterns (descriptive, not enforced by tooling):

1. Errors caught in API routes are logged via `console.error` with a label indicating the route, then re-thrown or returned as an error response — never swallowed silently.
2. Diagnostic traces in the AI layer consistently use the `[AI DIAGNOSTIC ...]` string prefix so operators can filter them out in production logs.
3. Fallback chains (e.g. Groq → Gemini) log a warning before attempting the secondary provider.
4. There is no shared logger utility; each module writes directly to `console`, meaning adding a new sink or changing log format would require touching every call site.
5. Environment variables (`NODE_ENV`, `DATABASE_URL`, `OPENROUTER_API_KEY`, `BOOKING_ASSISTANT_PROVIDER`) drive behavior but do not alter logging behavior — logging is always enabled regardless of environment.
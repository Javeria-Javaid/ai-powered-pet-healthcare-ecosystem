---
kind: configuration_system
name: Environment-Based Configuration with Per-Module Secrets and Runtime Feature Flags
category: configuration_system
scope:
    - '**'
source_files:
    - .env.example
    - prisma.config.ts
    - lib/db.ts
    - lib/auth.ts
    - lib/ai.ts
    - lib/ai/providers/gemini.ts
    - lib/ai/providers/qwen.ts
    - app/api/auth/google/callback/route.ts
    - app/api/auth/google/config/route.ts
    - app/api/landing-chat/route.ts
    - app/api/ai/chat/route.ts
---

## What system/approach is used

The application uses a flat, environment-variable-driven configuration approach built on Node.js `process.env`. There is no centralized config loader or typed configuration schema. Instead, each subsystem reads the variables it needs directly from `process.env` at import/construct time. `.env` files are loaded via `dotenv/config` only for Prisma tooling (`prisma.config.ts`); the Next.js runtime loads `.env` automatically.

## Key files and packages

- `.env.example` — canonical template of required environment variables (database URL, JWT secret, Alibaba Cloud placeholders).
- `prisma.config.ts` — Prisma CLI config that calls `import "dotenv/config"` and reads `DATABASE_URL` to configure the datasource and seed script.
- `lib/db.ts` — creates a single shared `PrismaClient` instance; switches between pooled and global-instance behavior based on `NODE_ENV`.
- `lib/auth.ts` — sets session cookie `secure` flag based on `process.env.NODE_ENV === 'production'`; otherwise defaults to insecure cookies for development.
- `lib/ai.ts` — reads `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `BOOKING_ASSISTANT_PROVIDER` to select the active AI provider (gemini vs qwen) at runtime.
- `lib/ai/providers/gemini.ts` — reads `GEMINI_API_KEY`.
- `lib/ai/providers/qwen.ts` — reads `DASHSCOPE_API_KEY`.
- Route handlers under `app/api/...` read per-route secrets: `GOOGLE_CLIENT_ID` in Google OAuth routes, `OPENROUTER_API_KEY` in `landing-chat/route.ts`, and feature toggles like `test=true` query parameter gated by `NODE_ENV`.
- `next.config.ts` — currently empty; no runtime env exposure via `NEXT_PUBLIC_` prefix was observed.

## Architecture and conventions

1. **Per-subsystem env reading** — Each module imports and reads only the variables it needs. There is no single `config` object; `DATABASE_URL` is read in both `prisma.config.ts` and `lib/db.ts`, and `OPENROUTER_API_KEY` is read in multiple route/handler files.
2. **Secrets live in environment variables** — Database credentials, JWT secret, and all third-party API keys (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `DASHSCOPE_API_KEY`, `GOOGLE_CLIENT_ID`) are expected to be provided as environment variables. `.env.example` documents them but is not committed with real values.
3. **Runtime feature flags via env + query params** — The booking assistant provider is selected by `BOOKING_ASSISTANT_PROVIDER` (`gemini` default, can be overridden to `qwen`). Development-only mock flows are gated by `process.env.NODE_ENV === 'development'` (e.g., mock Google token handling, mock AI header). A `?test=true` query param enables test-mode chat when not in production.
4. **Environment-aware behavior** — `lib/db.ts` instantiates a fresh connection pool in production but reuses a global singleton across hot-reloads in development to avoid socket exhaustion. `lib/auth.ts` sets `secure: true` on session cookies only in production.
5. **Validation on use, not load** — Missing secrets are not validated at startup; they are checked lazily when the relevant code path executes (e.g., `OpenRouterProvider` throws if `OPENROUTER_API_KEY` is absent when generating a response).
6. **No typed config layer** — Variables are read as strings and coerced inline where needed (e.g., model name string, boolean checks against `NODE_ENV`). There is no zod/env-schema validation or typed config object.
7. **Alibaba Cloud integration is documented but not implemented** — `.env.example` includes commented-out `ALIBABA_CLOUD_*` variables indicating future cloud configuration, but no code currently consumes them.

## Conventions and constraints

- **Database connection**: `DATABASE_URL` must be set; Prisma CLI requires it via `dotenv/config` in `prisma.config.ts`, and the runtime `lib/db.ts` reads it to construct the `pg.Pool`.
- **JWT secret**: `JWT_SECRET` is documented in `.env.example` as a secure random key; while the current auth implementation generates tokens server-side without using this variable, the file treats it as a required secret for cryptographic functions.
- **AI provider selection**: `BOOKING_ASSISTANT_PROVIDER` controls which provider class is instantiated; valid values observed are `'gemini'` (default) and `'qwen'`. Each provider independently validates its own API key and throws a descriptive error if missing.
- **Cookie security**: Session cookies are marked `secure` only when `NODE_ENV === 'production'`; in development they remain non-secure so HTTPS is not required locally.
- **Development-only paths**: Mock authentication (`mock_google_token_*` prefix) and mock AI headers are only active when `NODE_ENV === 'development'`, enforcing a strict dev/prod split for experimental features.
- **No `NEXT_PUBLIC_` variables**: No environment variables are exposed to the browser via the Next.js public env convention; all sensitive configuration stays server-side.
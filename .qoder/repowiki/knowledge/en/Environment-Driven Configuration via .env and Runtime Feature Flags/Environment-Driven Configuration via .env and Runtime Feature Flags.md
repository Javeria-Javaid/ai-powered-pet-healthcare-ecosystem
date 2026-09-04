---
kind: configuration_system
name: Environment-Driven Configuration via .env and Runtime Feature Flags
category: configuration_system
scope:
    - '**'
source_files:
    - .env.example
    - lib/db.ts
    - lib/auth.ts
    - lib/ai.ts
    - proxy.ts
    - prisma.config.ts
    - next.config.ts
---

## What system/approach is used

The application uses a **plain `.env` file** loaded by Node.js/Next.js at startup, with no dedicated configuration library. Configuration is read directly from `process.env` throughout the codebase. Prisma's own config loader (`prisma.config.ts`) explicitly imports `dotenv/config` to load environment variables before reading `DATABASE_URL`. There are no YAML/TOML/JSON config files; all runtime settings come from environment variables.

## Key files and packages

- `.env.example` — template listing required environment variables (database URL, JWT secret, Alibaba Cloud keys).
- `lib/db.ts` — reads `DATABASE_URL` and `NODE_ENV`; switches between pooled production connections and a global singleton development connection using `pg` + `@prisma/adapter-pg`.
- `lib/auth.ts` — hardcodes session cookie name (`session_token`), expiry (`2 * 60 * 60 * 1000` ms = 2 hours), and toggles cookie `secure` flag based on `process.env.NODE_ENV === 'production'`.
- `lib/ai.ts` — central feature-flag hub: `BOOKING_ASSISTANT_PROVIDER` selects the active AI provider (`groq`, `qwen`, or `gemini`); each provider class reads its own API key/model from env (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, etc.).
- `proxy.ts` — defines protected route prefixes (`/dashboard`, `/appointments`, `/pets`, `/medical-records`, `/vet`) and enforces authentication at the Next.js middleware layer.
- `next.config.ts` — empty default Next.js config (no runtime overrides).
- `prisma.config.ts` — Prisma CLI config that loads `dotenv/config` and reads `DATABASE_URL` for migrations/seeding.
- `lib/ai/providers/*.ts` — per-provider modules that each read their own secrets from `process.env`.

## Architecture and conventions

1. **Single source of truth is `process.env`**: Every module reads configuration directly from `process.env` at import or request time. There is no centralized config object or typed config schema.
2. **Environment-specific behavior via `NODE_ENV`**: Production vs development branching happens in `lib/db.ts` (connection pooling strategy) and `lib/auth.ts` (cookie security flags). Development uses a global singleton Prisma client/pool to survive hot-reloads; production creates a fresh `pg.Pool` per process.
3. **Feature flags as env vars**: The only explicit feature flag pattern is `BOOKING_ASSISTANT_PROVIDER` in `lib/ai.ts`, which acts as a runtime switch between Groq (with Gemini fallback), Qwen, and Gemini providers. This is the sole example of a toggleable behavior driven by an environment variable.
4. **Secrets are per-service env vars**: Database credentials (`DATABASE_URL`), auth secret (`JWT_SECRET`), and AI provider keys (`OPENROUTER_API_KEY`, plus provider-specific keys in `lib/ai/providers/*.ts`) are all injected as separate environment variables. No secret manager or encrypted config store is used.
5. **Prisma CLI gets its own env loading**: `prisma.config.ts` calls `import "dotenv/config"` so `prisma db push/migrate/seed` can run without the app being started, reading `DATABASE_URL` independently from the Next.js runtime.
6. **Route-level protection via middleware config**: `proxy.ts` declares a `matcher` array of protected paths and a `protectedPaths` list, enforcing login redirects before handlers run.

## Conventions and constraints

- **No `.env` committed**: `.gitignore` excludes `.env` while `.env.example` documents required variables — secrets must be supplied externally.
- **Database URL is mandatory**: `lib/db.ts` reads `process.env.DATABASE_URL` unconditionally; missing it will cause runtime failure when connecting.
- **Session token cookie is always `httpOnly` and path `/`**: Set via `setSessionCookie` in `lib/auth.ts`; `secure` is enabled only when `NODE_ENV === 'production'`.
- **Session expiry is fixed at 2 hours**: Defined as a constant `SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000` in `lib/auth.ts`; there is no env-driven override.
- **Sliding-window session refresh**: When a session has less than 1 hour remaining, `validateSession` extends it by another 2 hours automatically.
- **AI provider selection defaults to `groq`**: If `BOOKING_ASSISTANT_PROVIDER` is unset, `getAIProvider()` returns a `FallbackProvider` that tries Groq first then falls back to Gemini.
- **Protected routes are hardcoded**: The `protectedPaths` array in `proxy.ts` is the single source of truth for which URL prefixes require authentication; adding a new protected area requires editing both this array and the `matcher` config.
- **Prisma datasource URL comes exclusively from `DATABASE_URL`**: Both `prisma.config.ts` and `lib/db.ts` read this same variable, keeping database configuration consistent across CLI and runtime.
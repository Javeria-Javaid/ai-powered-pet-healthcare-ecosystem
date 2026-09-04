---
kind: build_system
name: Next.js + Prisma Build System
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - next.config.ts
    - tsconfig.json
    - eslint.config.mjs
    - postcss.config.mjs
    - prisma.config.ts
    - prisma/schema.prisma
    - .env.example
---

## What system/approach is used
This project is a single-package Next.js 16 (App Router) application built entirely through npm scripts defined in `package.json`. There are no Makefiles, Dockerfiles, or CI pipelines in the repository. The build pipeline is:
- Development: `npm run dev` → `next dev`
- Production build: `npm run build` → `next build` (produces `.next/` output)
- Production serve: `npm run start` → `next start`
- Linting: `npm run lint` → `eslint` via `eslint.config.mjs`

Database schema and migrations are managed by Prisma (`prisma.config.ts` pointing at `prisma/schema.prisma`, migrations under `prisma/migrations`, seed script `prisma/seed.js`).

## Key files and packages
- `package.json` — declares all runtime dependencies (`next`, `react`, `@prisma/client`, `pg`, `argon2`, `google-auth-library`, `puppeteer`) and dev dependencies (`prisma`, `typescript`, `eslint`, `tailwindcss`, `@tailwindcss/postcss`). Scripts define the entire build lifecycle.
- `next.config.ts` — minimal Next.js config (no custom overrides).
- `tsconfig.json` — TypeScript configured with `target: ES2017`, `module: esnext`, `moduleResolution: bundler`, `strict: true`, `noEmit: true`, JSX `react-jsx`, path alias `@/*` → `./*`, Next plugin included.
- `eslint.config.mjs` — ESLint v9 flat config extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`; explicitly ignores `.next/**`, `out/**`, `build/**`, `next-env.d.ts`.
- `postcss.config.mjs` — PostCSS pipeline using `@tailwindcss/postcss` for Tailwind CSS v4 processing.
- `prisma.config.ts` — Prisma configuration file declaring schema location (`prisma/schema.prisma`), migrations directory (`prisma/migrations`), seed command (`node ./prisma/seed.js`), and datasource URL from `DATABASE_URL` env var.
- `prisma/schema.prisma` and `prisma/migrations/*` — versioned database migrations driven by Prisma.
- `.env.example` / `.env` — environment variables consumed at build/runtime (e.g., `DATABASE_URL`).

## Architecture and conventions
- **Single-package monorepo**: All source code, config, and assets live in one `package.json`-rooted project; there is no workspace or sub-project structure.
- **TypeScript-first**: All app code is TS/TSX; JS-only files are limited to the Prisma seed script (`prisma/seed.js`) and ad-hoc test/utility scripts at the repo root (`test_*.ts`, `run_booking_*.ts`, `proxy.ts`).
- **Path aliases**: `@/*` maps to the project root, enabling absolute imports like `@/lib/db`.
- **Prisma-driven data layer**: Schema changes flow through `prisma/schema.prisma` → generated migrations in `prisma/migrations/<timestamp>_<name>/migration.sql`, with an optional seed step.
- **Tailwind CSS v4**: Styles are processed via PostCSS with the `@tailwindcss/postcss` plugin; no separate CSS build step beyond what Next.js invokes.
- **No custom build hooks**: `next.config.ts` is intentionally empty, deferring all build behavior to Next.js defaults.

## Conventions and constraints
- **Build commands are fixed to npm scripts** in `package.json`; there are no alternative entry points (no `Makefile`, no shell wrappers).
- **Linting uses ESLint v9 flat config** with Next's recommended rules; generated build artifacts (`/.next`, `/out`, `/build`, `next-env.d.ts`) are explicitly ignored.
- **TypeScript is strict** (`strict: true`, `isolatedModules: true`, `skipLibCheck: true`) and does not emit its own JS (`noEmit: true`) — compilation is delegated to Next.js during `next build`.
- **Environment variables are required at runtime**, notably `DATABASE_URL` (consumed by Prisma config); an `.env.example` is provided as a template.
- **Migrations are timestamp-named directories** under `prisma/migrations/` and locked via `prisma/migrations/migration_lock.toml`.
- **No containerization or CI**: There are no `Dockerfile`, `docker-compose.yml`, GitHub Actions workflows, or other CI/CD configuration files in the repository. Deployment is expected to be done by running `npm run build` followed by `npm run start` on a platform that supports Node.js.
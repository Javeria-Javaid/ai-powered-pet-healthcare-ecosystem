---
kind: dependency_management
name: npm-based Dependency Management with Lockfile and Prisma Skills Lock
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - skills-lock.json
    - prisma/migrations/migration_lock.toml
---

## What system/approach is used

This repository uses **npm** as its package manager for the single Next.js application. Dependencies are declared in `package.json` under `dependencies` and `devDependencies`, and a deterministic install tree is captured in `package-lock.json` (lockfileVersion 3). There is no monorepo workspace — all packages live in one root project.

In addition to npm, the repo tracks AI agent skill definitions via a separate lockfile: `skills-lock.json` pins specific versions of Prisma-related skills sourced from GitHub (`sourceType: "github"`, source `prisma/skills`) using `computedHash` digests per skill.

There is no vendoring strategy (no `vendor/` directory), no private npm registry configuration, and no `.npmrc` file present at the repository root. All third-party packages are resolved from the public npm registry.

## Key files and packages

- `package.json` — declares runtime dependencies (`next`, `react`, `react-dom`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `argon2`, `google-auth-library`, `lucide-react`, `react-markdown`) and dev dependencies (`typescript`, `eslint`, `eslint-config-next`, `prisma`, `tailwindcss`, `@tailwindcss/postcss`, `@types/*`).
- `package-lock.json` — npm lockfile pinning every transitive dependency version and integrity hash; ensures reproducible installs across environments.
- `skills-lock.json` — locks AI agent skill definitions from the `prisma/skills` GitHub source, keyed by skill name with `computedHash` values for each skill's `SKILL.md` content.
- `prisma/migrations/migration_lock.toml` — Prisma-specific lockfile that pins the database migration schema version alongside the Prisma client generation step.

## Architecture and conventions

- **Single-package scope**: The project is a flat Next.js app named `my-app` (`private: true`); there are no internal workspaces or sub-packages sharing dependencies.
- **Version ranges vs exact pins**: Runtime dependencies use caret ranges (`^7.9.1`, `^0.45.1`, `^11.0.2`, etc.) allowing minor/patch upgrades within the specified major version, while some core framework packages like `next` and `react`/`react-dom` are pinned to exact versions (`16.3.2`, `19.2.8`). Dev dependencies similarly use caret ranges (`^5`, `^9`, `^19`, `^20`).
- **Lockfile-driven installs**: Because `package-lock.json` exists, `npm ci` can be used in CI to enforce an exact install tree matching the committed lockfile.
- **Prisma tooling**: Prisma is installed as both a runtime dependency (`@prisma/client`, `@prisma/adapter-pg`) and a dev dependency (`prisma`), following the standard pattern where the generated client ships with the app but the CLI is only needed during development/build.
- **Skills as external dependencies**: AI agent skills are not npm packages; they are pulled from GitHub (`prisma/skills`) and locked by `skills-lock.json`, which records a `computedHash` per skill so changes to upstream skill content can be detected.

## Conventions and constraints

- All third-party Node.js packages are managed through npm and must be added via `npm install` so that `package-lock.json` stays in sync with `package.json`.
- No private npm registries or scoped package authentication are configured; all packages resolve from the public npm registry.
- No vendored copies of libraries exist in the repository — all code comes from `node_modules` at install time.
- The `prisma` CLI and `@prisma/client` versions are kept aligned (both at `^7.9.1`), ensuring the generated client matches the CLI used to generate it.
- The `skills-lock.json` file acts as a versioned manifest for AI agent skills; any change to a skill's source content will produce a different `computedHash`, signaling that the lockfile needs updating before committing.
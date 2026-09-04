---
kind: frontend_style
name: Tailwind CSS v4 + Tailwind Theme Tokens in Next.js App Router
category: frontend_style
scope:
    - '**'
source_files:
    - app/globals.css
    - postcss.config.mjs
    - next.config.ts
    - package.json
    - app/layout.tsx
    - app/page.tsx
    - app/components/Navbar.tsx
---

## What system/approach is used

The frontend styling stack is built on **Next.js (App Router)** with **Tailwind CSS v4** processed via `@tailwindcss/postcss`. There is no separate `tailwind.config.js` — configuration lives inline through the new Tailwind v4 `@theme` directive and CSS custom properties. The project uses a minimal, utility-first approach: components are styled directly with Tailwind utility classes rather than a component library or CSS-in-JS solution. Icons come from `lucide-react`, which is imported as React components inside JSX.

## Key files and packages

- `app/globals.css` — global stylesheet that imports Tailwind (`@import "tailwindcss"`) and declares design tokens via `@theme inline`.
- `postcss.config.mjs` — registers `@tailwindcss/postcss` as the only PostCSS plugin.
- `next.config.ts` — default Next config; no extra CSS/webpack overrides.
- `package.json` — declares `tailwindcss ^4`, `@tailwindcss/postcss ^4`, `next 16.3.2`, `react 19.2.8`, and `lucide-react ^1.39.0`.
- `app/layout.tsx` — root layout that applies base body styles and imports `globals.css`.
- `app/components/*.tsx` — page-level UI components styled entirely with Tailwind utilities.
- `ui-reference/` — PNG screenshots of the intended dashboards (clinics-dashboard.png, homepage.png, owner-dashboard.png, veterinarian-dashboard.png) serve as visual references for the UI but are not part of the build.

## Architecture and conventions

### Design tokens
Global tokens are declared in `app/globals.css` using CSS variables under `:root`:
- `--background: #f8fafc`
- `--foreground: #0f172a`

These are exposed to Tailwind via the `@theme inline` block as `--color-background`, `--color-foreground`, `--font-sans`, and `--font-mono`. This makes them available as `bg-background`, `text-foreground`, `font-sans`, etc., throughout the app.

### Base typography and colors
- The `<html>` tag sets `lang="en"` and `className="h-full antialiased"`.
- The `<body>` uses inline Tailwind utilities: `min-h-full flex flex-col bg-[#f8fafc] text-[#0f172a]`.
- A fallback `font-family: Arial, Helvetica, sans-serif` is set on `body` alongside the Geist font variables.

### Component styling pattern
Components in `app/components/` are client components (`'use client'`) composed of small, single-purpose React functions. Styling is done exclusively with Tailwind utility class strings passed to `className`. Examples observed:
- Sticky header with backdrop blur: `sticky top-0 z-40 w-full border-b border-zinc-150 bg-white/95 backdrop-blur-md`.
- Responsive navigation: `hidden md:flex` to toggle mobile/desktop nav.
- Consistent color palette centered around zinc/slate neutrals and blue accents (`text-zinc-600`, `hover:text-blue-600`, `bg-blue-600`, `hover:bg-blue-700`).
- Rounded buttons: `rounded-full px-5 py-2 text-sm font-semibold`.
- Layouts use flexbox utilities (`flex flex-col min-h-screen`, `flex-grow`, `mx-auto max-w-7xl px-6`).

### Iconography
Icons are imported as React components from `lucide-react` (e.g., `PawPrint`) and sized inline with Tailwind (`w-4 h-4`). No SVG sprite or icon font is used.

### Responsiveness
Breakpoints follow Tailwind defaults (e.g., `md:`). Components hide/show elements based on viewport width rather than media queries in CSS.

### Page composition
The landing page (`app/page.tsx`) composes reusable sections (`Navbar`, `Hero`, `AboutSection`, `CommunitiesSection`, `HowItWorks`, `CTASection`, `Footer`, `AuthModal`, `ChatWidget`) into a single vertical layout. Each section is a self-contained component styled with its own utility classes.

## Conventions and constraints

- **No custom CSS beyond globals**: All component styling is expressed as Tailwind utility classes; there are no per-component `.css` files or CSS modules.
- **Design tokens are centralized**: Colors and fonts are defined once in `app/globals.css` under `:root` and surfaced to Tailwind via `@theme inline`; components should reference these tokens (`bg-background`, `text-foreground`) rather than hard-coding hex values where possible.
- **Utility-first, no theme config file**: Because Tailwind v4 is used, there is no `tailwind.config.*` file; any customization must go through the `@theme` directive or CSS variables.
- **Consistent neutral palette**: The codebase consistently uses the zinc scale (`zinc-150`, `zinc-600`, `zinc-700`, `zinc-900`) for borders, text, and backgrounds, with blue (`blue-600`, `blue-700`) reserved for primary actions and hover states.
- **Responsive patterns**: Navigation and layout switches rely on Tailwind's responsive prefixes (`hidden md:flex`) rather than custom media queries.
- **Icon standardization**: New icons should be added from `lucide-react` and sized with Tailwind utilities instead of importing raw SVGs.
- **Visual reference artifacts**: The `ui-reference/` directory contains PNG screenshots of target dashboards (homepage, owner dashboard, clinic dashboard, veterinarian dashboard). These act as visual targets for the UI but are not compiled into the build.
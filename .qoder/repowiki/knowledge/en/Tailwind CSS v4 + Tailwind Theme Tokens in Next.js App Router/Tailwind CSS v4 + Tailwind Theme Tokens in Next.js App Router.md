---
kind: frontend_style
name: Tailwind CSS v4 + Tailwind Theme Tokens in Next.js App Router
category: frontend_style
scope:
    - '**'
source_files:
    - app/globals.css
    - postcss.config.mjs
    - package.json
    - app/layout.tsx
    - app/page.tsx
    - app/components/Navbar.tsx
    - app/components/Hero.tsx
---

## What system/approach is used

The frontend uses **Next.js App Router** (Next 16) with **Tailwind CSS v4** as the styling engine. Styling is applied almost exclusively via **utility-first Tailwind classes** directly on React components; there is no separate CSS-in-JS library, styled-components, or component UI kit beyond a small set of hand-written shared components under `app/components/`. Icons come from **lucide-react**. The project does not use a custom `tailwind.config.*` file — configuration lives inline in CSS via the Tailwind v4 `@theme` directive.

## Key files and packages

- `app/globals.css` — global stylesheet that imports Tailwind (`@import "tailwindcss"`) and declares design tokens using Tailwind v4's `@theme inline` block: background (`--background: #f8fafc`), foreground (`--foreground: #0f172a`), and font families (`--font-sans`, `--font-mono` mapped to Geist Sans/Mono). The `<body>` sets `background` and `color` from these CSS variables and falls back to `Arial, Helvetica, sans-serif` for `font-family`.
- `postcss.config.mjs` — registers `@tailwindcss/postcss` as the only PostCSS plugin, confirming Tailwind v4 processing.
- `package.json` — dependencies include `next 16.3.2`, `react 19.2.8`, `tailwindcss ^4`, `@tailwindcss/postcss ^4`, and `lucide-react ^1.39.0`.
- `app/layout.tsx` — root layout applies `lang="en"`, `h-full antialiased` on `<html>`, and hardcodes body colors via Tailwind color utilities (`bg-[#f8fafc] text-[#0f172a]`).
- `app/page.tsx` and `app/components/*.tsx` — all page and component markup is styled inline with Tailwind utility classes.

## Architecture and conventions

- **Utility-first everywhere**: Every visual style (spacing, typography, colors, borders, shadows, gradients, responsive breakpoints) is expressed as Tailwind classes on JSX elements. There are no custom CSS class names beyond the globally imported Tailwind styles.
- **Design tokens via CSS variables + `@theme inline`**: Global palette and font choices are centralized in `globals.css` as CSS custom properties and exposed through Tailwind's `@theme inline` so they can be referenced by name (e.g., `--color-background`, `--color-foreground`, `--font-sans`). Components then consume them indirectly via Tailwind utilities rather than reading CSS variables directly.
- **Color palette**: A zinc-based neutral scale (`zinc-50` through `zinc-900`) plus a blue accent (`blue-50`–`blue-700`) is used consistently across the landing page components (Navbar, Hero, CTASection, etc.). Primary CTAs use `bg-blue-600` / `hover:bg-blue-700`; secondary links use `text-zinc-600 hover:text-blue-600`.
- **Typography**: Headings use `font-black` / `font-bold` with `tracking-tight` / `tracking-wider`; body copy uses `text-base` / `text-lg` with `leading-relaxed`. Font family resolution goes through the `--font-sans` token declared in `@theme inline`.
- **Responsive strategy**: Mobile-first Tailwind breakpoints (`md:`) are used throughout (e.g., `hidden md:flex` for desktop nav, `grid-cols-1 md:grid-cols-2`, `text-4xl md:text-6xl`, `py-16 md:py-24`). No media query files — responsiveness is handled purely via utility prefixes.
- **Layout structure**: Pages compose reusable sections (`Navbar`, `Hero`, `AboutSection`, `CommunitiesSection`, `HowItWorks`, `CTASection`, `Footer`) inside a flex column (`flex flex-col min-h-screen`) driven from `page.tsx`. The root layout enforces full-height layout with `min-h-full` and `antialiased`.
- **Icons**: All icons are imported from `lucide-react` (e.g., `PawPrint`) and rendered inline with size utilities (`w-4 h-4`).
- **No custom CSS beyond globals**: There is no `tailwind.config.js/ts`, no SCSS/SASS, no CSS modules, and no third-party UI component library (like shadcn, Radix, MUI). Custom UI is built from scratch using Tailwind primitives.

## Conventions and constraints

- **Styling must be done with Tailwind utility classes** — observed across every component; no custom `.css` class selectors are authored in components.
- **Global theme values live only in `app/globals.css`** via CSS variables and the `@theme inline` block; components do not define their own color/font tokens.
- **Body-level defaults are set in the root layout** (`layout.tsx`) using Tailwind color utilities for background and text color, ensuring consistent base appearance across routes.
- **Responsive behavior uses Tailwind's `md:` breakpoint prefix** consistently; no custom media queries are introduced.
- **Iconography is sourced exclusively from lucide-react**, never from image assets or SVG strings within components.
- **The project relies on Tailwind v4's new `@theme inline` syntax** rather than a config file, so any new design token must be added to `globals.css`'s `@theme inline` block.
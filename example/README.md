# Starlight documentation site for `@samline/drawer`

A copy-paste-ready [Astro](https://astro.build/) +
[Starlight](https://starlight.astro.build/) site, designed to live
inside the `drawer` package and deploy automatically to **GitHub
Pages** at `https://samline.github.io/drawer/`.

## Why this exists

The `@samline/drawer` package needs public documentation. The same
Starlight template that powers the rest of the monorepo's docs gives
this package a head start:

- A single file (`site.config.mjs`) the maintainer (or an AI agent)
  edits to set identity, repo links and the GitHub Pages base path.
- A pre-wired GitHub Actions workflow that deploys to Pages on every
  push to `main` — zero additional CI setup.
- An `AGENTS.md` that any AI agent can read to know exactly how to
  populate the template with package-specific content.

---

## Quick start

### 1. Configure the site

Open `site.config.mjs` and confirm the four placeholders at the top
match the `@samline/drawer` identity:

```js
title: 'Drawer',
description: '@samline/drawer — a small, framework-free drawer runtime for vanilla JS and direct browser usage.',
site: 'https://samline.github.io',
base: '/drawer',
editLinkBaseUrl: 'https://github.com/samline/drawer/edit/main/',
```

The values are pre-populated. You should not need to change them
unless you are forking the template for a new package.

### 2. Add the homepage and feature pages

The site content lives in `src/content/docs/`. See `AGENTS.md` for
the recommended file layout and frontmatter rules. The current
content ships with:

- `index.mdx` — homepage with `<CardGrid>` linking to docs.
- `getting-started.mdx` — installation + first runnable example.
- `reference/index.md` — overview of the reference section.
- `reference/configuration.md` — every `CommonDrawerOptions` and
  `VanillaDrawerOptions` field with defaults and rationale.
- `reference/api.md` — function-by-function reference with
  signatures and examples.
- `reference/typescript.md` — every exported type, callback
  signature, and helper return shape.
- `reference/browser.md` — `window.Drawer` for no-bundler setups.
- `reference/css-styling.md` — the data-attribute contract the
  stylesheet expects.
- `reference/examples.mdx` — end-to-end recipes.

### 3. Preview locally

```bash
npm install
npm run dev
# → http://localhost:4321/drawer
```

Type-check frontmatter and any custom components:

```bash
npm run check
```

### 4. Deploy

Push to `main` — the bundled GitHub Actions workflow
(`.github/workflows/deploy.yml`) builds and publishes the site to
GitHub Pages.

One-off repo setting: **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

After the action finishes (≈30 s), the site is live at:

```
https://samline.github.io/drawer/
```

---

## File-by-file tour

| Path                                       | What it is                                                  |
| ------------------------------------------ | ----------------------------------------------------------- |
| `site.config.mjs`                          | ⭐ The only per-package config. **Edit this.**              |
| `site.schema.mjs`                          | Runtime validator for `site.config.mjs`.                    |
| `astro.config.mjs`                         | Astro + Starlight glue. Reads everything from above.        |
| `src/content.config.ts`                    | Frontmatter schema for the docs content collection.         |
| `src/content/docs/`                        | The documentation content. Add `.md`/`.mdx` here.           |
| `public/`                                  | Static assets served as-is (favicon, screenshots).          |
| `src/styles/custom.css`                    | Free-form CSS that layers on top of Starlight's theme.      |
| `.github/workflows/deploy.yml`             | Auto-deploys `dist/` to GitHub Pages on every push to main. |
| `AGENTS.md`                                | AI-agent instructions (use this if you delegate to an AI).  |
| `README.md`                                | The file you are reading right now.                         |

---

## NPM scripts

| Script           | What it does                                           |
| ---------------- | ------------------------------------------------------ |
| `npm run dev`    | Start the dev server with HMR at `http://localhost:4321/drawer`. |
| `npm run build`  | Build the production site to `./dist/`.                |
| `npm run preview`| Preview the built site locally.                        |
| `npm run check`  | Type-check frontmatter and TS sources.                 |
| `npm run astro`  | Pass-through to the `astro` CLI.                       |

---

## Updating the template

The template files (`astro.config.mjs`, `site.schema.mjs`,
`content.config.ts`, `AGENTS.md`, `README.md`, `package.json`,
`tsconfig.json`, the deploy workflow, and `src/styles/custom.css`)
are shared with the rest of the monorepo. Pull template improvements
in with:

```bash
# From the package repo:
git remote add template /path/to/docs-template       # local path or git URL
git fetch template
git merge template/main --allow-unrelated-histories  # resolve per file as needed
```

If you'd rather rebase on the latest template periodically, keep the
template as a remote branch and merge with a manual conflict strategy.

---

## License

MIT — see [LICENSE](LICENSE).

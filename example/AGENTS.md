# AGENTS.md

> **Read this first.** You (the AI agent) are being asked to populate
> the documentation site of an NPM package using this Starlight template.
> This file tells you exactly what to do, in what order, and which
> files are yours to modify. **Do not deviate from the steps below
> unless the user asks you to.**

---

## 0. Snapshot of the template

```
docs/
├── AGENTS.md                ← you are reading this
├── README.md                ← human-friendly version
├── site.config.mjs          ← ★ single source of truth per-package ★
├── site.schema.mjs          ← runtime validation for site.config.mjs
├── astro.config.mjs         ← imports site.config.mjs, don't edit
├── package.json             ← dependencies, don't edit
├── tsconfig.json            ← TypeScript strict, don't edit
├── src/
│   ├── content.config.ts    ← Starlight frontmatter schema, don't edit
│   └── content/
│       └── docs/
│           ├── index.md                 ← homepage
│           ├── getting-started.md       ← install & first example
│           └── reference/
│               ├── index.md
│               ├── configuration.md
│               ├── api.md
│               └── examples.md
├── public/
│   └── favicon.svg
└── .github/
    └── workflows/
        └── deploy.yml       ← auto-deploys to GitHub Pages
```

The dev server: `npm run dev` → http://localhost:4321
Production build: `npm run build` → `./dist/`
Type-check: `npm run check`

---

## 1. Workflow you must follow

When the user says "populate the docs" (or equivalent), work in this
exact order:

### Step 1 — Gather the package identity

If the user did not already give you the values, **ask** for them.
Required fields:

| Field              | Example                                  |
| ------------------ | ---------------------------------------- |
| `title`            | `Cleave Zen`                             |
| `description`      | `Lightweight input mask library`         |
| `tagline`          | `Mask numbers, dates & more in 1KB`      |
| `github owner`     | `sam`                                    |
| `github repo`      | `cleave-zen`                             |
| branch name        | `main` (default)                         |

### Step 2 — Edit `site.config.mjs` only

Open **`site.config.mjs`** and replace each placeholder:

```js
title: 'Cleave Zen',                                   // ← was 'My Package Docs'
description: 'Lightweight input mask library',         // ← 1–2 sentence tagline
site: 'https://sam.github.io',                         // ← owner only
base: '/cleave-zen',                                   // ← repo name as /repo
editLinkBaseUrl: 'https://github.com/sam/cleave-zen/edit/main/',
```

**Never** touch `astro.config.mjs` — it reads everything from
`site.config.mjs` automatically. If a build error says something
missing, fix it in `site.config.mjs`, not in `astro.config.mjs`.

### Step 3 — Replace `src/content/docs/`

Delete every file under `src/content/docs/` whose content still
contains the placeholder markers `PACKAGE_NAME_HERE`,
`REPLACE-OWNER` / `REPLACE-REPO`, "Replace this paragraph with …", etc.

**Placeholder convention used by this template:**

- In `.md` files the marker is plain text (`PACKAGE_NAME_HERE`).
- In `.mdx` files we deliberately avoid `{NAME}` because MDX parses
  every `{ … }` as a JavaScript expression. Use `PACKAGE_NAME_HERE`
  instead, or wrap the literal in ``{'{'}NAME{'}'}`` if you really
  need braces.

Then recreate the following structure with real content for the
package. The Markdown structure of each file should match what the
placeholder already shows — only the actual content changes.

**Required pages:**

| File path (under `src/content/docs/`) | Purpose                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| `index.mdx`                           | Homepage with `<CardGrid>` linking to docs.                   |
| `getting-started.mdx`                 | Installation + first runnable example.                        |
| `reference/index.md`                  | Auto-collected in `Reference` sidebar group.                  |
| `reference/configuration.md`         | Every option / default / reason.                              |
| `reference/api.md`                    | Function-by-function reference with signatures and examples.  |
| `reference/examples.mdx`              | End-to-end recipes for common scenarios.                      |

> **`.md` vs `.mdx`** — use `.md` for prose + tables only, `.mdx` the
> moment you need any Starlight component (`<Card>`, `<CardGrid>`,
> `<Tabs>`, `<Aside>`, etc.). Files with the wrong extension will
> render the tags as literal text.

Add more pages under `reference/` if the package has enough surface
area to warrant it (`reference/events.md`, `reference/types.md`,
`reference/migration.md`, etc.).

### Step 4 — Inline frontmatter rules

Every `.md` / `.mdx` file MUST start with frontmatter:

```yaml
---
title: 'Short title'                    # → sidebar & browser tab
description: 'One-sentence description' # → <meta> + search snippets
template: doc                           # uses Starlight's doc layout
---
```

Optional but recommended:

```yaml
---
title: 'Getting started'
description: 'Install and run a first example in 5 minutes.'
sidebar:
  order: 1       # explicit position; lower = higher in sidebar
  badge:
    text: New
    variant: tip
---
```

The full schema lives at
<https://starlight.astro.build/reference/frontmatter/>.

### Step 5 — Use Starlight built-in components for richness

The agent is encouraged to use these inline components — they are
already installed and rendered by Starlight:

| Component                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `:::note` / `:::tip` / `:::caution`    | Callouts (also bare `:::` variants).         |
| `<Card>` + `<CardGrid>`                | Feature/linking grids.                       |
| `<Tabs>` + `<TabItem>`                 | Side-by-side variants (e.g. npm/pnpm/yarn). |
| `<Steps>`                              | Numbered tutorials.                          |
| `<Aside>`                              | Long callouts without the colon syntax.      |
| `<Badge text="WIP" variant="caution"/>`| Compact labels in tables or sentences.       |
| `<FileTree>`                           | Nested directory trees.                      |
| `<Icon name="..." />`                  | Icon glyphs — names: <https://starlight.astro.build/reference/icons/> |

**Every `.mdx` file that uses these components MUST import them** at
the top (below the frontmatter):

```mdx
---
title: ...
---

import { Card, CardGrid } from '@astrojs/starlight/components';

// now you can use <Card>, <CardGrid>, …
```

Failing to add the import causes the tags to render as literal text
inside a `<code>` block.

Use the tabbed content helper when showing the same code in multiple
package managers:

````md
:::tabs key="package-manager"
--- npm ---
\`\`\`bash
npm install cleave-zen
\`\`\`
--- pnpm ---
\`\`\`bash
pnpm add cleave-zen
\`\`\`
--- yarn ---
\`\`\`bash
yarn add cleave-zen
\`\`\`
:::
````

### Step 6 — Verify locally before committing

```bash
npm install
npm run dev      # open http://localhost:4321 — visit every new page
npm run check    # type-checks frontmatter and TS sources
npm run build    # produces ./dist/ — mirror of what GitHub Pages serves
```

If any of those fail, fix it in the files mentioned in the error
message. Do not loosen types by editing `tsconfig.json` unless the
user asks for it.

### Step 7 — Commit + push + verify GitHub Pages

```bash
git add .
git commit -m "docs: populate site for {PACKAGE_NAME}"
git push origin main
```

GitHub Actions will deploy automatically. Confirm via:

1. Repo → **Settings → Pages** — Source must be **GitHub Actions**
   (one-off setting per repo).
2. Repo → **Actions** tab — workflow should finish green.
3. The site will be live at
   `https://{GITHUB_OWNER}.github.io/{GITHUB_REPO}/` within ~30 s of
   the workflow finishing.

---

## 2. Edit/Don't-edit quick reference

| File                    | Edit? | Why                                            |
| ----------------------- | ----- | ---------------------------------------------- |
| `site.config.mjs`       | ✅    | Only place to change site-wide identity.       |
| `src/content/docs/**`   | ✅    | The actual documentation.                      |
| `public/**`             | ✅    | Favicon, logos, PDFs, screenshots.             |
| `src/assets/**`         | ✅    | Images you reference from MDX.                 |
| `astro.config.mjs`      | ❌    | Reads from `site.config.mjs`.                  |
| `site.schema.mjs`       | ❌    | Runtime validation; edit only if schema grows. |
| `src/content.config.ts` | ❌    | Starlight frontmatter schema.                  |
| `package.json`          | ❌*   | Only if a new dependency is required.          |
| `tsconfig.json`         | ❌    | Strict TS — keep.                              |
| `.gitignore`            | ❌    |                                              |
| `.github/workflows/*`   | ❌    | Auto-deploys; don't break the workflow.        |

---

## 3. Common pitfalls

1. **Forgetting the leading slash on `base`.** `astro build` will
   succeed but the deployed site has 404s. `base: '/cleave-zen'`
   not `base: 'cleave-zen'`.

2. **Editing `astro.config.mjs` instead of `site.config.mjs`.** Always
   edit the latter — the former is autogenerated and will be
   overwritten in future template updates.

3. **Leaving placeholder markers.** Search the project for
   `{PACKAGE_NAME`, `{TAGLINE`, `{GITHUB_OWNER` after you're done and
   replace every occurrence. Use `grep -R '\\{PACKAGE_NAME' src/` to
   find them.

4. **Missing `<meta name="viewport">`.** Already added in the
   default `head:` config — keep it.

5. **Using raw HTML where a Starlight component exists.** Prefer
   `Card`, `Aside`, `Tabs` etc. — they handle theming and a11y
   correctly out of the box.

6. **Not running `npm run check`.** It catches broken frontmatter
   and broken TS; CI does NOT run check (only build), so missing it
   will let bugs ship.

7. **Wrong repo for the GitHub Action.** Per-package the repo owner
   is the same, but the *repo* changes. Always edit `editLinkBaseUrl`
   in `site.config.mjs`.

---

## 4. Optional enhancements (ask before adding)

- **Search across multiple sites** — set `pagefind.mergeIndex` per
  <https://pagefind.app/docs/multisite/>. Only relevant if every
  package docs site is deployed and you want a single search page.
- **Algolia DocSearch** — replace the default Pagefind with Algolia
  by installing `@astrojs/starlight-docsearch`.
- **i18n** — add entries to `locales` in `site.config.mjs`, then
  add a parallel `src/content/docs/{locale}/...` tree.
- **Dark-mode logo override** — replace `logo.src` with `{ light,
  dark }`.

Before adding any of these, confirm with the user.

---

## 5. When you are finished

Reply to the user with:

1. A bulleted list of files you created / replaced.
2. The output of `npm run check` (last 10 lines).
3. The local dev URL plus the GitHub Pages URL it will become
   after `git push`.

You are done.

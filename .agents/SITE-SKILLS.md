# Repository skills

The maintained theme adaptation skill is [package-site](skills/package-site/SKILL.md). Pass that file or its canonical GitHub URL to an agent in the destination package; it can locate/download the template and carry out the complete workflow. See the root README for the one-message invocation. Ten upstream skills were installed locally with autoskills 0.4.1 on 2026-10-19, using:

```sh
npx --yes autoskills -y -a codex
```

Their sources and content hashes are recorded in ../site-skills-lock.json. Keep the downloaded trees and license notices unmodified; formatting excludes them while still checking our package-site skill. Refresh deliberately through autoskills and review the lock/tree diff before committing. No global skill installation or runtime dependency is required.

| Skill                     | Upstream source                              |
| ------------------------- | -------------------------------------------- |
| accessibility             | addyosmani/web-quality-skills                |
| astro                     | astrolicious/agent-skills                    |
| frontend-design           | anthropics/skills                            |
| nodejs-backend-patterns   | wshobson/agents                              |
| nodejs-best-practices     | sickn33/antigravity-awesome-skills           |
| playwright-best-practices | currents-dev/playwright-best-practices-skill |
| seo                       | addyosmani/web-quality-skills                |
| tailwind-css-patterns     | giuseppe-trisciuoglio/developer-kit          |
| typescript-advanced-types | wshobson/agents                              |
| vite                      | antfu/skills                                 |

Use only relevant guidance. Root/app/shared instructions and the user's requests govern this theme. frontend-design is not permission to replace Ticker's approved design; Node/backend skills are references, not a requirement to add a backend. Apply accessibility/SEO evidence to rendered output, retaining intentional template noindex. Consult the installed Astro version's official API when implementing changes. The permanent root PageSpeed contract remains the performance policy.

When embedding the theme, merge useful skill trees and the lockfile with existing agent tooling rather than overwriting the target project's skills or instructions. Retain the theme's own package-site skill and PageSpeed policy alongside appropriate upstream references.

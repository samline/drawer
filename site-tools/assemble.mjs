import { mkdir } from 'node:fs/promises'
import { project } from '../shared/lib/project.mjs'
import { cp, readFile, writeFile } from 'node:fs/promises'
await cp(
  new URL('../docs/dist/', import.meta.url),
  new URL('../landing/dist/docs/', import.meta.url),
  { recursive: true }
)
const index = new URL('../landing/dist/sitemap-index.xml', import.meta.url)
const [landing, docs] = await Promise.all([
  readFile(index, 'utf8'),
  readFile(new URL('../docs/dist/sitemap-index.xml', import.meta.url), 'utf8'),
])
await writeFile(
  index,
  landing.replace(
    '</sitemapindex>',
    (docs.match(/<sitemap>.*?<\/sitemap>/g) ?? []).join('') + '</sitemapindex>'
  )
)
await writeFile(new URL('../landing/dist/.nojekyll', import.meta.url), '')
console.log('Combined landing, examples, docs, search, fonts and sitemap into landing/dist.')

const aliases = {
  'getting-started': 'getting-started',
  'guides/accessibility-and-focus': 'guides/accessibility-and-focus',
  'guides/lifecycle-and-state': 'guides/lifecycle-and-state',
  'guides/gestures-and-snap-points': 'guides/gestures-and-snap-points',
  reference: 'reference/api',
  'reference/api': 'reference/api',
  'reference/configuration': 'reference/configuration',
  'reference/controller': 'reference/controller',
  'reference/entrypoints': 'reference/entrypoints',
  'reference/browser': 'reference/browser',
  'reference/typescript': 'reference/typescript',
  'reference/css-styling': 'reference/css-styling',
  'reference/examples': 'guides/recipes',
  changelog: 'changelog',
  'docs/guides/accessibility': 'guides/accessibility-and-focus',
  'docs/reference/examples': 'guides/recipes',
  'docs/reference': 'reference/api',
}
const migration = JSON.parse(
  await readFile(new URL('./doc-migration.json', import.meta.url), 'utf8')
).starlight
for (const article of migration.articles) {
  if (article.legacyRoute) aliases[article.legacyRoute] = article.destination.replace(/\/$/, '')
}
for (const [old, route] of Object.entries(aliases)) {
  const target = project.docsBase + route + '/'
  const directory = new URL('../landing/dist/' + old + '/', import.meta.url)
  await mkdir(directory, { recursive: true })
  const historical = migration.articles.find(article => article.legacyRoute === old)
  const fragments = Object.fromEntries(
    (historical?.fragments ?? []).map(item => [
      '#' + item.source,
      project.docsBase + item.destination,
    ])
  )
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Drawer documentation</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${new URL(target, project.origin)}"></head><body><p>Continue to <a href="${target}">Drawer documentation</a>.</p><script>const fragments=${JSON.stringify(fragments)};location.replace(fragments[location.hash] || ${JSON.stringify(target)} + location.hash)</script></body></html>`
  await writeFile(new URL('index.html', directory), html)
}

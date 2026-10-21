import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
const root = process.env.DRAWER_MIGRATION_SOURCE_ROOT ?? new URL('../', import.meta.url)
const { starlight } = JSON.parse(
  await readFile(new URL('./doc-migration.json', import.meta.url), 'utf8')
)
for (const article of starlight.articles) {
  const historical = execFileSync('git', ['show', `${article.revision}:${article.source}`], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(
    createHash('sha256').update(historical).digest('hex'),
    article.sha256,
    article.source
  )
  assert.equal(article.reviewed, true)
  for (const item of article.fragments) {
    assert.equal(item.reviewed, true)
    const [route, fragment] = item.destination.split('#')
    const html = await readFile(new URL(`../docs/dist/${route}index.html`, import.meta.url), 'utf8')
    assert.ok(
      html.includes(`id="${fragment}"`),
      `${article.source}#${item.source} → ${item.destination}`
    )
  }
}
console.log(
  `Verified ${starlight.articles.length} historical articles and ${starlight.articles.reduce((n, article) => n + article.fragments.length, 0)} fragment destinations against Git evidence and built Docs.`
)

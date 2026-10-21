import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const reference = JSON.parse(
  await readFile(new URL('../design-reference.json', import.meta.url), 'utf8')
)
for (const item of reference.components) {
  const text = await readFile(new URL('../' + item.path, import.meta.url), 'utf8')
  const styles = item.kind
    ? text.split(/\s+/).filter(Boolean).join(' ')
    : [...text.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)]
        .map(match => match[1])
        .join(' ')
        .split(/\s+/)
        .filter(Boolean)
        .join(' ')
  assert.equal(
    createHash('sha256').update(styles).digest('hex'),
    item.styleSha256,
    `${item.path}: visual drift from ${reference.repository}/blob/${reference.commit}/${item.sourcePath}; inspect SITE.md before changing the fingerprint`
  )
}
console.log(
  `Visual style contract verified for ${reference.components.length} extracted components.`
)

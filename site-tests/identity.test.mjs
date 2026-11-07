import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { documentTitle, footerCredit } from '../shared/lib/site-identity.mjs'
import { checkReadme, checkPageIdentity } from '../site-tools/lib/identity-checks.mjs'

const source = await readFile(
  new URL('../site-tools/package-readme-template.md', import.meta.url),
  'utf8'
)
const options = { npmName: '@example/widget', siteUrl: 'https://example.com/widget/', cdn: false }
const fixture = () =>
  source.replace('<!-- package-site:starter-readme -->\n', '').replace(
    /\{\{(\w+)\}\}/g,
    (_, key) =>
      ({
        npmName: options.npmName,
        siteUrl: options.siteUrl,
        name: 'Widget',
        skill: 'widget',
        description: 'A package used to verify the public README convention.',
        license: 'MIT',
        cdnToc: '',
        cdnSection: '',
      })[key] ?? ''
  )

test('a generated package README preserves the common roles and source/download links', () => {
  assert.deepEqual(checkReadme(fixture(), options), [])
})

for (const [name, change] of [
  ['wrong TOC target', text => text.replace('(#quick-start)', '(#different)')],
  [
    'missing package-manager installation',
    text => text.replace('pnpm add @example/widget', 'pnpm install'),
  ],
  ['divergent table roles', text => text.replace('| API | Purpose |', '| Group | API |')],
  [
    'missing entrypoint explanation',
    text => text.replace('### Entrypoints', '### Optional details'),
  ],
  ['missing skill source', text => text.replace('(skills/widget/SKILL.md)', '(elsewhere.md)')],
  [
    'wrong resource target',
    text =>
      text.replace(
        '[Examples](https://example.com/widget/examples/)',
        '[Examples](https://example.com/other/)'
      ),
  ],
  ['unfinished starter', text => '<!-- package-site:starter-readme -->\n' + text],
])
  test(`README validation rejects ${name}`, () => {
    assert.ok(checkReadme(change(fixture()), options).length > 0)
  })

test('headings inside backtick and tilde examples do not change README structure', () => {
  const example = '\n```md\n## Not a section\n```\n\n~~~md\n## Also an example\n~~~\n'
  assert.deepEqual(
    checkReadme(fixture().replace('## Capabilities', example + '\n## Capabilities'), options),
    []
  )
})

test('metadata composes the package name once and footer credit ignores author aliases', () => {
  assert.equal(
    documentTitle('  Configuration options  ', '@example/widget'),
    'Configuration options — @example/widget'
  )
  assert.equal(footerCredit(' samline '), 'samline · Made for the open web.')
  assert.throws(() => documentTitle('Configuration — @example/widget', '@example/widget'))
  assert.throws(() => documentTitle('', '@example/widget'))
  assert.throws(() => footerCredit(''))
})

test('built document and social titles agree and the footer uses explicit site credit', () => {
  const html =
    '<title>Examples — @example/widget</title>' +
    '<meta property="og:title" content="Examples — @example/widget">' +
    '<meta name="twitter:title" content="Examples — @example/widget">' +
    '<meta property="og:site_name" content="@example/widget">' +
    '<footer><p>© 2026 samline · Made for the open web.</p></footer>'
  const identity = { npmName: '@example/widget', credit: 'samline', footer: true }
  assert.deepEqual(checkPageIdentity(html, identity), [])
  assert.ok(
    checkPageIdentity(
      html.replace('name="twitter:title" content="Examples', 'name="twitter:title" content="Other'),
      identity
    ).length
  )
  assert.ok(checkPageIdentity(html.replace('2026 samline', '2026 Samuel Olvera'), identity).length)
  assert.ok(
    checkPageIdentity(
      html.replaceAll('Examples — @example/widget', '@example/widget: Examples'),
      identity
    ).length
  )
})

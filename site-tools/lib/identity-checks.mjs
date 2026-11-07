export const README_SECTIONS = [
  'Table of contents',
  'Installation',
  'Quick start',
  'HTML / CDN',
  'Capabilities',
  'API at a glance',
  'Documentation',
  'Changelog',
  'AI agent skill',
  'License',
]

// Fences may contain headings or links that are examples rather than document structure.
export const proseLines = markdown => {
  let fence = null
  return markdown.split('\n').filter(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) fence = marker[1]
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null
      return false
    }
    return !fence
  })
}

const anchor = heading =>
  heading
    .toLowerCase()
    .replace(/[^\w -]/g, '')
    .replaceAll(' ', '-')
const tableHeader = text =>
  text
    .split('\n')
    .find(line => line.trim().startsWith('|'))
    ?.split('|')
    .slice(1, -1)
    .map(cell => cell.trim())

const readmeSections = markdown => {
  const sections = {}
  let current = null
  let fence = null
  for (const line of markdown.split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) fence = marker[1]
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null
    }
    if (!fence && !marker && line.startsWith('## ')) {
      current = line.slice(3).trim()
      sections[current] = ''
    } else if (current) sections[current] += line + '\n'
  }
  return sections
}

export function checkReadme(markdown, { npmName, siteUrl, cdn = false, template = false }) {
  const problems = []
  if (markdown.includes('<!-- package-site:starter-readme -->'))
    problems.push('README: replace the generated starter with verified package content.')
  const lines = proseLines(markdown)
  const headings = lines.filter(line => /^## /.test(line)).map(line => line.slice(3).trim())
  const expected = README_SECTIONS.filter(name => name !== 'HTML / CDN' || (!template && cdn))
  if (JSON.stringify(headings) !== JSON.stringify(expected))
    problems.push(
      'README: use the canonical H2 sections and order, with HTML / CDN only when supported.'
    )
  const sections = readmeSections(markdown)
  const toc = proseLines(sections['Table of contents'] ?? '')
    .map(line => line.match(/^- \[([^\]]+)\]\(#([^)]+)\)$/))
    .filter(Boolean)
    .map(([, label, target]) => [label, target])
  const wantedToc = expected.slice(1).map(name => [name, anchor(name)])
  if (JSON.stringify(toc) !== JSON.stringify(wantedToc))
    problems.push(
      'README: table of contents must match the canonical section names, order and anchors.'
    )
  for (const [section, wanted] of [
    ['API at a glance', ['API', 'Purpose']],
    ['Documentation', ['Guide', 'What it covers']],
  ])
    if (JSON.stringify(tableHeader(sections[section] ?? '')) !== JSON.stringify(wanted))
      problems.push(`README: ${section} starts with a ${wanted.join(' / ')} table.`)
  if (!/\[CHANGELOG\.md\]\(CHANGELOG\.md\)/.test(sections.Changelog ?? ''))
    problems.push('README: Changelog links the single CHANGELOG.md source.')
  if (!/\[LICENSE\.md\]\(LICENSE\.md\)/.test(sections.License ?? ''))
    problems.push('README: License links LICENSE.md.')
  if (template) return problems
  if (lines.find(line => /^# /.test(line)) !== `# ${npmName}`)
    problems.push('README: H1 is the exact npm package name.')
  const introduction = markdown.split(/^## /m)[0]
  const resources = [...introduction.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map(([, label, url]) => [
    label,
    url,
  ])
  const base = siteUrl.replace(/\/?$/, '/')
  const wantedResources = [
    ['Demo', base],
    ['Examples', base + 'examples/'],
    ['Documentation', base + 'docs/'],
    ['Changelog', 'CHANGELOG.md'],
  ]
  if (JSON.stringify(resources) !== JSON.stringify(wantedResources))
    problems.push(
      'README: introduction uses Demo / Examples / Documentation / Changelog resource links.'
    )
  for (const command of [`npm install ${npmName}`, `pnpm add ${npmName}`, `bun add ${npmName}`])
    if (!(sections.Installation ?? '').includes('```sh\n' + command + '\n```'))
      problems.push(`README: Installation includes a separate sh block for ${command}.`)
  if (!(sections['API at a glance'] ?? '').includes('### Entrypoints\n'))
    problems.push('README: API at a glance includes the Entrypoints subsection.')
  else if (
    JSON.stringify(tableHeader(sections['API at a glance'].split('### Entrypoints\n')[1])) !==
    JSON.stringify(['Entrypoint', 'When to use'])
  )
    problems.push('README: Entrypoints uses the Entrypoint / When to use table roles.')
  const skill = npmName.replace(/^@[^/]+\//, '')
  const agent = sections['AI agent skill'] ?? ''
  if (!agent.includes(`](skills/${skill}/SKILL.md)`))
    problems.push('README: AI agent skill links the maintained repository source.')
  if (!agent.includes(base + `skills/${skill}/SKILL.md`))
    problems.push('README: AI agent skill includes its website download URL.')
  return problems
}

export const decodeHtml = value =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')

export const metaContent = (html, key, attribute = 'name') => {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = Object.fromEntries(
      [...tag[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name,
        decodeHtml(value),
      ])
    )
    if (attrs[attribute] === key) return attrs.content ?? ''
  }
  return ''
}

export function checkPageIdentity(html, { npmName, credit, footer = false, subject }) {
  const problems = []
  const title = decodeHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '').trim()
  const suffix = ` — ${npmName}`
  if (!title.endsWith(suffix) || !title.slice(0, -suffix.length).trim())
    problems.push('document title must be <subject> — <npm package name>.')
  if (subject && title !== subject + suffix)
    problems.push(`this route's title subject must be ${subject}.`)
  for (const [key, attribute] of [
    ['og:title', 'property'],
    ['twitter:title', 'name'],
  ])
    if (metaContent(html, key, attribute) !== title)
      problems.push(`${key} must match the document title.`)
  if (metaContent(html, 'og:site_name', 'property') !== npmName)
    problems.push('og:site_name must be the npm package name.')
  if (footer) {
    const markup = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i)?.[1] ?? ''
    const text = decodeHtml(markup.replace(/<[^>]*>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
    if (!text.includes(`${credit} · Made for the open web.`) || !/© \d{4} /.test(text))
      problems.push('footer must use the configured credit and the shared copyright convention.')
  }
  return problems
}

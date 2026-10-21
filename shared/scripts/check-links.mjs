import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'

const decode = value =>
  value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const name = entity.slice(1, -1).toLowerCase()
    if (name.startsWith('#x')) return String.fromCodePoint(parseInt(name.slice(2), 16))
    if (name.startsWith('#')) return String.fromCodePoint(Number(name.slice(1)))
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[name]
  })

// Inspect generated static markup, excluding inert templates and script/style contents.
function markup(html) {
  const tags = []
  const live = html.replace(/<(template|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  for (const match of live.matchAll(/<([a-z][\w:-]*)\b([^<>]*?)>/gi)) {
    const attrs = Object.fromEntries(
      [...match[2].matchAll(/(?:^|\s)([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(attr => [
        attr[1].toLowerCase(),
        decode(attr[2] ?? attr[3]),
      ])
    )
    tags.push({ tag: match[1].toLowerCase(), attrs })
  }
  return tags
}

export async function checkLinks({ directory, site, externalPaths = [] }) {
  site = new URL(site)
  const pages = new Map()
  async function visit(folder) {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = new URL(item.name + (item.isDirectory() ? '/' : ''), folder)
      if (item.isDirectory()) await visit(path)
      else if (item.name.endsWith('.html')) {
        const tags = markup(await readFile(path, 'utf8'))
        const ids = tags.flatMap(({ attrs }) => (attrs.id ? [attrs.id] : []))
        assert.equal(ids.length, new Set(ids).size, `Duplicate DOM ID: ${path.pathname}`)
        pages.set(path.href, { tags, ids: new Set(ids) })
      }
    }
  }
  await visit(directory)
  const external = new Set()
  let links = 0
  async function destination(url, from, seen = new Set()) {
    if (url.origin !== site.origin) {
      external.add(url.href)
      return
    }
    if (externalPaths.includes(url.pathname)) return
    assert.ok(url.pathname.startsWith(site.pathname), `Outside deployment base: ${url} in ${from}`)
    let path = new URL(decodeURIComponent(url.pathname.slice(site.pathname.length)), directory)
    const info = await stat(path).catch(() =>
      assert.fail(`Broken local destination: ${url} in ${from}`)
    )
    if (info.isDirectory()) path = new URL(`${path.href.replace(/\/$/, '')}/index.html`)
    await stat(path).catch(() => assert.fail(`Missing index: ${url} in ${from}`))
    const page = pages.get(path.href)
    const refresh = page?.tags.find(
      ({ tag, attrs }) => tag === 'meta' && attrs['http-equiv']?.toLowerCase() === 'refresh'
    )?.attrs.content
    if (refresh) {
      assert.ok(!seen.has(path.href), `Redirect loop: ${url} in ${from}`)
      seen.add(path.href)
      const target = refresh.match(/(?:^|;)\s*url\s*=\s*(.+)$/i)?.[1]
      assert.ok(target, `Invalid redirect: ${url}`)
      const redirected = new URL(target, url)
      if (!redirected.hash) redirected.hash = url.hash
      return destination(redirected, from, seen)
    }
    if (url.hash)
      assert.ok(
        page?.ids.has(decodeURIComponent(url.hash.slice(1))),
        `Missing fragment: ${url} in ${from}`
      )
  }
  for (const [path, { tags }] of pages) {
    const relative = path.slice(directory.href.length).replace(/index\.html$/, '')
    const current = new URL(relative, site)
    for (const { tag, attrs } of tags) {
      for (const attribute of ['href', 'src']) {
        if (!(attribute in attrs)) continue
        const value = attrs[attribute].trim()
        if (tag === 'a' && attribute === 'href') {
          links++
          assert.ok(value && value !== '#', `Empty link in ${current}`)
          assert.ok(
            !/^(?:javascript|data):/i.test(value),
            `Invalid link action in ${current}: ${value}`
          )
        }
        if (/^(?:mailto|tel|data):/i.test(value)) continue
        const url = new URL(value, current)
        assert.ok(/^https?:$/.test(url.protocol), `Unsupported URL: ${url} in ${current}`)
        await destination(url, current)
      }
    }
    const refresh = tags.find(
      ({ tag, attrs }) => tag === 'meta' && attrs['http-equiv']?.toLowerCase() === 'refresh'
    )
    if (refresh) await destination(current, current)
  }
  return { pages: pages.size, links, external: [...external].sort() }
}

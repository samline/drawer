// Keep overflow regions reachable before JavaScript loads. Code blocks are focusable
// themselves; a table stays a plain table inside a labelled, focusable scroll region.
// Region labels are unique per page so assistive tech can tell them apart.
const headings = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const textOf = node =>
  node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('')
export default function accessibleOverflow() {
  return function visit(root) {
    // Latest heading in document order, whatever its parent (lists, blockquotes, ...).
    let heading = ''
    const perKey = new Map()
    const used = new Set()
    const label = table => {
      const caption = table.children?.find(child => child.tagName === 'caption')
      const text = caption ? textOf(caption).trim() : ''
      const key = text || heading
      const count = (perKey.get(key) ?? 0) + 1
      perKey.set(key, count)
      let result = text
        ? count > 1
          ? `${text} (${count})`
          : text
        : `Table${count > 1 ? ` ${count}` : ''}${heading ? `: ${heading}` : ''}`
      for (let n = count; used.has(result); n++) result = `${result} (${n + 1})`
      used.add(result)
      return result
    }
    const walk = node => {
      const children = node.children
      if (!children) return
      for (const [index, child] of children.entries()) {
        if (child.type !== 'element') continue
        if (headings.has(child.tagName)) heading = textOf(child).trim()
        if (child.tagName === 'pre') child.properties = { ...child.properties, tabIndex: 0 }
        if (child.tagName === 'table') {
          children[index] = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              role: 'region',
              tabIndex: 0,
              ariaLabel: label(child),
            },
            children: [child],
          }
          continue
        }
        walk(child)
      }
    }
    walk(root)
  }
}

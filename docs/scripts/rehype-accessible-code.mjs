// Keep overflow regions reachable before JavaScript loads, including native tables.
export default function accessibleOverflow() {
  return function visit(node) {
    if (node.type === 'element' && (node.tagName === 'pre' || node.tagName === 'table'))
      node.properties = { ...node.properties, tabIndex: 0 }
    for (const child of node.children ?? []) visit(child)
  }
}

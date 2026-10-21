type Cleanup = () => void
type Setup = (element: HTMLElement) => Cleanup | void

// Processed Astro scripts run once. Keep each matching element's state in its
// setup closure and release it when that element leaves the document.
const registrations: Array<{
  selector: string
  setup: Setup
  mounted: Map<HTMLElement, Cleanup | void>
}> = []

const mount = (root: ParentNode) => {
  for (const { selector, setup, mounted } of registrations) {
    const elements = [...root.querySelectorAll<HTMLElement>(selector)]
    if (root instanceof HTMLElement && root.matches(selector)) elements.unshift(root)
    for (const element of elements) {
      if (!element.isConnected || mounted.has(element)) continue
      mounted.set(element, undefined)
      mounted.set(element, setup(element))
      element.dataset.mounted = 'true'
    }
  }
}

const observer = new MutationObserver(records => {
  const removed = records.flatMap(record => [...record.removedNodes])
  for (const { mounted } of registrations) {
    for (const [element, cleanup] of mounted) {
      // A root can leave and reenter in the same DOM operation. It still needs
      // cleanup (for example an open Drawer must release its scroll lock).
      if (element.isConnected && !removed.some(node => node.contains(element))) continue
      cleanup?.()
      mounted.delete(element)
      delete element.dataset.mounted
    }
  }
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node instanceof Element) mount(node)
    }
  }
})

export const mountElements = (selector: string, setup: Setup) => {
  registrations.push({ selector, setup, mounted: new Map() })
  mount(document)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

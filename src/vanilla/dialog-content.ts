import type { VanillaCloseButtonOptions, VanillaDrawerOptions, VanillaRenderable } from './render'

interface ContentSlots {
  title: HTMLDivElement | null
  description: HTMLDivElement | null
  body: HTMLDivElement | null
}

const VISUALLY_HIDDEN_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0'
} as const

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | number | boolean | null | undefined>,
  children?: Array<Node | string | null | undefined>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue
      if (value === true) element.setAttribute(name, '')
      else element.setAttribute(name, String(value))
    }
  }
  if (children) {
    for (const child of children) {
      if (child === null || child === undefined) continue
      if (typeof child === 'string') element.appendChild(document.createTextNode(child))
      else element.appendChild(child)
    }
  }
  return element
}

export function setStyle(element: HTMLElement, styles: Record<string, string>) {
  for (const [key, value] of Object.entries(styles)) {
    element.style.setProperty(key, value)
  }
}

export function resolveRenderable(value: VanillaRenderable | undefined): {
  text?: string
  element?: HTMLElement
  container?: HTMLDivElement
} {
  if (value === null || value === undefined) return {}
  if (typeof value === 'string' || typeof value === 'number') {
    return { text: String(value) }
  }
  if (typeof value === 'function') {
    const produced = value()
    if (produced instanceof HTMLElement) return { element: produced }
    return {}
  }
  if (value instanceof HTMLElement) return { element: value }
  return {}
}

export function buildTitleContent(state: ContentSlots, options: VanillaDrawerOptions) {
  // The title slot only exists when the consumer passed an
  // explicit `title` (the mount block skips creating it in
  // the proxy / minimalist cases — `aria-label` is the
  // accessible name there). The function fills the visible
  // title and applies the `titleVisuallyHidden` opt-out.
  if (!state.title) return
  const title = state.title
  title.innerHTML = ''

  const resolved = resolveRenderable(options.title)
  if (resolved.text !== undefined) {
    title.appendChild(document.createTextNode(resolved.text))
  } else if (resolved.element) {
    title.appendChild(resolved.element)
  } else if (resolved.container) {
    title.appendChild(resolved.container)
  }

  // `titleVisuallyHidden: true` is the escape hatch for
  // consumers who want a visible title in their own `content`
  // HTML but still need the runtime to mount the slot for the
  // `aria-labelledby` reference.
  if (options.titleVisuallyHidden === true) {
    setStyle(title, VISUALLY_HIDDEN_STYLE)
  }
}

export function buildDescriptionContent(state: ContentSlots, options: VanillaDrawerOptions) {
  // The description slot only exists when the consumer passed
  // an explicit `description` (the mount block skips creating
  // it in the no-description case — `aria-describedby` is
  // omitted entirely there). The slot is auto-hidden by
  // default; `descriptionVisuallyHidden: false` is the escape
  // hatch for consumers who want a visible description.
  if (!state.description) return
  const desc = state.description
  desc.innerHTML = ''

  const resolved = resolveRenderable(options.description)
  if (resolved.text !== undefined) {
    desc.appendChild(document.createTextNode(resolved.text))
  } else if (resolved.element) {
    desc.appendChild(resolved.element)
  } else if (resolved.container) {
    desc.appendChild(resolved.container)
  }

  if (options.descriptionVisuallyHidden !== false) {
    setStyle(desc, VISUALLY_HIDDEN_STYLE)
  }
}

/**
 * Resolve `options.closeButton` into a normalized options object,
 * or `false` if the close button is not requested. Centralizes
 * the `boolean | { className, icon, ariaLabel }` contract so the
 * mount path can stay short.
 */
export function normalizeCloseButtonOptions(
  options: boolean | VanillaCloseButtonOptions | undefined
): false | { className: string; icon: string | HTMLElement; ariaLabel: string } {
  if (!options) return false
  if (options === true) {
    return { className: 'drawer-close-button', icon: 'xmark', ariaLabel: 'Close' }
  }
  return {
    className: options.className ?? 'drawer-close-button',
    icon: options.icon ?? 'xmark',
    ariaLabel: options.ariaLabel ?? 'Close'
  }
}

/**
 * Build the close button DOM and wire its `click` to
 * `callbacks.onOpenChange(false)`. The button's `click` event
 * `stopPropagation()`s so it does not bubble to the drawer's
 * content (e.g. a form submit handler).
 *
 * Returns the button element. The caller is responsible for
 * appending it to the dialog tree and storing it on
 * `state.closeButton` so `teardownMount` can remove it.
 *
 * The icon is rendered as a `<span aria-hidden="true">` so
 * screen readers only announce the button's `aria-label`.
 */
export function buildCloseButton(
  options: { className: string; icon: string | HTMLElement; ariaLabel: string },
  callbacks: { onOpenChange: (open: boolean) => void }
): HTMLButtonElement {
  const button = createEl('button', {
    type: 'button',
    'data-drawer-close': '',
    'aria-label': options.ariaLabel
  }) as HTMLButtonElement
  button.className = options.className
  if (options.icon instanceof HTMLElement) {
    const iconSpan = createEl('span', { 'data-drawer-close-icon': '', 'aria-hidden': 'true' })
    iconSpan.appendChild(options.icon)
    button.appendChild(iconSpan)
  } else {
    button.appendChild(createEl('span', { 'data-drawer-close-icon': '', 'aria-hidden': 'true' }, [options.icon]))
  }
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    callbacks.onOpenChange(false)
  })
  return button
}

export function buildBodyContent(
  state: ContentSlots,
  options: VanillaDrawerOptions,
  resolvedContent = resolveRenderable(options.content)
) {
  if (!state.body) return
  const body = state.body
  // Clear only the consumer-content children, NOT the title
  // and description slots that now live inside the body.
  // The slots are managed by `buildTitleContent` (which runs
  // first) and must survive this pass.
  for (const child of Array.from(body.children)) {
    if (child !== state.title && child !== state.description) {
      body.removeChild(child)
    }
  }
  if (options.content === undefined) return
  if (resolvedContent.text !== undefined) {
    body.appendChild(document.createTextNode(resolvedContent.text))
  } else if (resolvedContent.element) {
    body.appendChild(resolvedContent.element)
  } else if (resolvedContent.container) {
    body.appendChild(resolvedContent.container)
  }
}

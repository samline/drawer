import type { VanillaDrawerOptions } from './render'

interface OpenDialog {
  content: HTMLDivElement | null
  openOrder: number
}

const openDialogStack: OpenDialog[] = []
let fallbackOpenOrder = 0
export const resolveOpenDialogOrder = (order?: number | null, current = 0) => order ?? (current || ++fallbackOpenOrder)

interface ModalIsolationSnapshot {
  ariaHidden: string | null
  inert: boolean
}

const modalIsolationOwners: Array<{ state: OpenDialog; host: HTMLElement }> = []
const modalIsolationSnapshots = new Map<HTMLElement, ModalIsolationSnapshot>()

function getModalIsolationTargets(host: HTMLElement) {
  const targets = new Set<HTMLElement>()
  let current: HTMLElement | null = host
  while (current?.parentElement) {
    for (const sibling of current.parentElement.children) {
      if (sibling !== current && sibling instanceof HTMLElement) targets.add(sibling)
    }
    if (current.parentElement === document.body) break
    current = current.parentElement
  }
  return targets
}

function updateModalIsolation() {
  const topOwner = modalIsolationOwners[modalIsolationOwners.length - 1]
  const targets = topOwner ? getModalIsolationTargets(topOwner.host) : new Set<HTMLElement>()

  for (const [element, snapshot] of modalIsolationSnapshots) {
    if (targets.has(element)) continue
    if (snapshot.ariaHidden === null) element.removeAttribute('aria-hidden')
    else element.setAttribute('aria-hidden', snapshot.ariaHidden)
    element.inert = snapshot.inert
    modalIsolationSnapshots.delete(element)
  }

  for (const element of targets) {
    if (!modalIsolationSnapshots.has(element)) {
      modalIsolationSnapshots.set(element, {
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: Boolean(element.inert)
      })
    }
    element.setAttribute('aria-hidden', 'true')
    element.inert = true
  }
}

export function acquireModalIsolation(state: OpenDialog, host: HTMLElement) {
  const existingIndex = modalIsolationOwners.findIndex((owner) => owner.state === state)
  if (existingIndex !== -1) modalIsolationOwners.splice(existingIndex, 1)
  modalIsolationOwners.push({ state, host })
  updateModalIsolation()

  let released = false
  return () => {
    if (released) return
    released = true
    const index = modalIsolationOwners.findIndex((owner) => owner.state === state)
    if (index !== -1) modalIsolationOwners.splice(index, 1)
    updateModalIsolation()
  }
}

export function removeFromOpenDialogStack(state: OpenDialog) {
  const index = openDialogStack.indexOf(state)
  if (index !== -1) openDialogStack.splice(index, 1)
}

export function registerOpenDialog(state: OpenDialog, openOrder?: number | null) {
  removeFromOpenDialogStack(state)
  state.openOrder = openOrder ?? ++fallbackOpenOrder
  const insertionIndex = openDialogStack.findIndex((candidate) => candidate.openOrder > state.openOrder)
  if (insertionIndex === -1) openDialogStack.push(state)
  else openDialogStack.splice(insertionIndex, 0, state)
}

function getFocusableElements(content: HTMLElement) {
  return Array.from(
    content.querySelectorAll<HTMLElement>(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (element) =>
      !(element instanceof HTMLInputElement && element.type === 'hidden') &&
      !element.closest('[hidden], [aria-hidden="true"], [inert]')
  )
}

export function focusFirstElement(content: HTMLElement) {
  const first = getFocusableElements(content)[0]
  if (first instanceof HTMLElement) {
    first.focus()
  } else {
    content.tabIndex = -1
    content.focus()
  }
}

function trapFocus(content: HTMLElement, event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const focusables = getFocusableElements(content)
  if (focusables.length === 0) {
    event.preventDefault()
    content.focus()
    return
  }
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement
  if (!active || !content.contains(active)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

const handledEscapeEvents = new WeakSet<Event>()
export const getTopOpenContent = () => openDialogStack[openDialogStack.length - 1]?.content ?? null

export const handleDialogKeyDown = (
  state: OpenDialog,
  content: HTMLElement,
  options: VanillaDrawerOptions,
  event: KeyboardEvent,
  onOpenChange: (open: boolean) => void
) => {
  if (openDialogStack[openDialogStack.length - 1] !== state) return
  if (event.key === 'Escape' && options.dismissible !== false) {
    if (handledEscapeEvents.has(event)) return
    handledEscapeEvents.add(event)
    event.preventDefault()
    onOpenChange(false)
  } else if (event.key === 'Tab' && options.modal !== false) trapFocus(content, event)
}

/**
 * iOS Safari body-scroll prevention + position:fixed body trick.
 *
 * 1:1 port of vaul upstream's `usePreventScroll.ts` (Adobe
 * react-spectrum) and `usePositionFixed.ts`, with React hooks
 * replaced by plain function calls and module-level refs.
 *
 * Two pieces:
 *
 * - `preventScrollMobileSafari()` — the 6-step Mobile Safari
 *   workaround. Prevents page scroll while a drawer is open
 *   without breaking the user's scroll position. See the
 *   comment block inside for the details.
 *
 * - `setPositionFixed({ isOpen, modal, noBodyStyles })` — toggles
 *   `position: fixed` on `<body>` so the page itself does not
 *   move when the drawer opens on Safari (where several bugs are
 *   avoided only with this trick; see vaul#435, vaul#433).
 *
 * Both pieces are gated on feature detection (`isIOS`,
 * `isSafari`) so they no-op on platforms that don't need them.
 *
 * The legacy `lockBodyScroll()` / `unlockBodyScroll()` pair is
 * kept for non-Safari browsers and is the desktop baseline.
 */
import { isIOS, isSafari } from './browser'
import { chain } from '../helpers'

// Visual viewport used by the focus-input pipeline. May be
// undefined in jsdom / SSR; the focus handler short-circuits.
const visualViewport =
  typeof document !== 'undefined' && typeof window !== 'undefined' ? window.visualViewport : undefined

// Buffer added to the keyboard height so the focused input is
// scrolled into view above the iOS software keyboard. Matches the
// upstream constant.
const KEYBOARD_BUFFER = 24

// HTML input types that do not cause the software keyboard to
// appear. Used by `isInput` below.
const nonTextInputTypes = new Set<string>([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'image',
  'button',
  'submit',
  'reset'
])

// The number of active `preventScrollMobileSafari` calls. Used to
// determine whether to revert back to the original page style /
// scroll position when the LAST drawer unmounts.
let preventScrollCount = 0
let mobileSafariRestore: (() => void) | null = null

// Saved body position from `setPositionFixed`. `null` when no
// drawer has set `position: fixed` on the body yet.
let previousBodyPosition: Record<string, string> | null = null
let savedScrollY = 0

/**
 * Lock the page scroll. Returns a function that REVERTS the lock
 * when called.
 *
 * 1:1 with vaul upstream's `usePreventScroll` gates. The lock is
 * suppressed when ANY of the following is true:
 * - `isDisabled: true` — short-circuit. Caller can also pass
 *   `disablePreventScroll: true` (the legacy alias).
 * - `!isOpen` — closed drawer.
 * - `isDragging` — user is currently dragging the drawer. vaul
 *   releases the lock so the user can scroll content inside the
 *   drawer mid-drag.
 * - `!modal` — non-modal drawer, no lock.
 * - `justReleased` — drag was released < 200ms ago, no lock
 *   (avoids focus-input race).
 * - `!hasBeenOpened` — never opened, no lock (skip on initial
 *   mount with `defaultOpen: true`).
 * - `!repositionInputs` — consumer opted out of input repositioning.
 * - `!disablePreventScroll` — consumer disabled, no lock.
 *
 * On `isIOS()`, takes the 6-step Mobile Safari workaround
 * regardless of the gates (the gate only controls whether to
 * invoke the iOS pipeline at all).
 */
export function preventBodyScroll(
  options: {
    disablePreventScroll?: boolean
    isOpen?: boolean
    isDragging?: boolean
    modal?: boolean
    justReleased?: boolean
    hasBeenOpened?: boolean
    repositionInputs?: boolean
  } = {}
): () => void {
  const isDisabled =
    options.disablePreventScroll === true ||
    options.isOpen === false ||
    options.isDragging === true ||
    options.modal === false ||
    options.justReleased === true ||
    options.hasBeenOpened === false ||
    options.repositionInputs === false

  if (isDisabled) {
    return () => {}
  }

  if (isIOS() === true) {
    preventScrollCount++
    if (preventScrollCount === 1) {
      mobileSafariRestore = preventScrollMobileSafari()
    }
    return () => {
      preventScrollCount--
      if (preventScrollCount === 0) {
        mobileSafariRestore?.()
        mobileSafariRestore = null
      }
    }
  }

  // Desktop / Android baseline. Same as the legacy lockBodyScroll
  // implementation: overflow hidden + padding-right to compensate
  // for the scrollbar disappearing.
  return lockBodyScrollDesktop()
}

function lockBodyScrollDesktop(): () => void {
  if (typeof document === 'undefined') return () => {}

  const body = document.body
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  const overflowBackup = body.style.overflow
  const paddingRightBackup = body.style.paddingRight

  if (overflowBackup !== 'hidden') {
    body.style.overflow = 'hidden'
  }
  if (scrollbar > 0) {
    const existing = window.getComputedStyle(body).paddingRight
    body.style.paddingRight = `${parseFloat(existing || '0') + scrollbar}px`
  }

  return () => {
    body.style.overflow = overflowBackup
    body.style.paddingRight = paddingRightBackup
  }
}

/**
 * The 6-step Mobile Safari workaround.
 *
 * Even with `overflow: hidden`, Mobile Safari still scrolls the
 * page in many situations:
 *
 * 1. When the bottom toolbar / address bar collapse, page scrolling
 *    is always allowed.
 * 2. When the keyboard is visible, the viewport does NOT resize —
 *    the keyboard covers part of it and the covered part becomes
 *    scrollable.
 * 3. When tapping on an input, the page always scrolls so that the
 *    input is centered in the visual viewport. This may cause even
 *    `position: fixed` elements to scroll off the screen.
 * 4. When using the next/previous keyboard buttons to navigate
 *    between inputs, the WHOLE page always scrolls, even if the
 *    input is inside a nested scrollable element.
 *
 * The fix:
 * 1. `touchmove` `preventDefault` on the window when the touch
 *    is not in a scrollable element.
 * 2. `touchmove` `preventDefault` inside a scrollable element when
 *    the scroll position is at the top or bottom (to avoid the
 *    whole page scrolling instead — disables bounce scrolling at
 *    the edges, which is the best we can do).
 * 3. `touchend` `preventDefault` on input elements + handle
 *    focusing the element ourselves.
 * 4. When focusing an input, apply a `transform: translateY(-2000px)`
 *    to trick Safari into thinking the input is at the top of the
 *    page. After focus, scroll the element into view ourselves
 *    (without scrolling the whole page).
 * 5. Offset the body by the scroll position using a negative
 *    `padding-right` adjustment and `scrollTo(0, 0)`. This makes
 *    the actual scroll position always zero, which is required
 *    for the rest of this to work.
 * 6. As a last resort, handle window `scroll` events and scroll
 *    back to the top. This can happen when navigating to an input
 *    outside a modal with the next/previous keyboard buttons.
 */
function preventScrollMobileSafari(): () => void {
  let scrollable: Element | undefined
  let lastY = 0

  const onTouchStart = (e: TouchEvent) => {
    // Store the nearest scrollable parent element from the
    // element that the user touched.
    scrollable = getScrollParent(e.target as Element)
    if (scrollable === document.documentElement && scrollable === document.body) {
      return
    }
    const touch = e.changedTouches[0]
    if (touch) lastY = touch.pageY
  }

  const onTouchMove = (e: TouchEvent) => {
    // Prevent scrolling the window.
    if (
      !scrollable ||
      scrollable === document.documentElement ||
      scrollable === document.body
    ) {
      e.preventDefault()
      return
    }

    // Prevent scrolling up when at the top and scrolling down
    // when at the bottom of a nested scrollable area, otherwise
    // Mobile Safari will start scrolling the window instead.
    const touch = e.changedTouches[0]
    if (!touch) return
    const y = touch.pageY
    const scrollTop = scrollable.scrollTop
    const bottom = scrollable.scrollHeight - scrollable.clientHeight

    if (bottom === 0) return

    if ((scrollTop <= 0 && y > lastY) || (scrollTop >= bottom && y < lastY)) {
      e.preventDefault()
    }
    lastY = y
  }

  const onTouchEnd = (e: TouchEvent) => {
    const target = e.target as HTMLElement
    if (isInput(target) && target !== document.activeElement) {
      e.preventDefault()
      // Apply a transform to trick Safari into thinking the input
      // is at the top of the page so it doesn't try to scroll it
      // into view. When tapping on an input, this needs to be
      // done BEFORE the `focus` event, so we focus the element
      // ourselves.
      target.style.transform = 'translateY(-2000px)'
      target.focus()
      requestAnimationFrame(() => {
        target.style.transform = ''
      })
    }
  }

  const onFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement
    if (isInput(target)) {
      // Transform also needs to be applied in the focus event in
      // cases where focus moves other than tapping on an input
      // directly, e.g. the next/previous buttons in the software
      // keyboard.
      target.style.transform = 'translateY(-2000px)'
      requestAnimationFrame(() => {
        target.style.transform = ''

        // This will have prevented the browser from scrolling the
        // focused element into view, so we need to do this
        // ourselves in a way that doesn't cause the whole page
        // to scroll.
        if (visualViewport) {
          if (visualViewport.height < window.innerHeight) {
            // If the keyboard is already visible, do this after
            // one additional frame to wait for the transform to
            // be removed.
            requestAnimationFrame(() => {
              scrollIntoView(target)
            })
          } else {
            // Otherwise, wait for the visual viewport to resize
            // before scrolling so we can measure the correct
            // position to scroll to.
            visualViewport.addEventListener('resize', () => scrollIntoView(target), { once: true })
          }
        }
      })
    }
  }

  const onWindowScroll = () => {
    // Last resort. If the window scrolled, scroll it back to the
    // top. It should always be at the top because the body will
    // have a negative margin (see below).
    window.scrollTo(0, 0)
  }

  // Record the original scroll position so we can restore it.
  // Then apply a negative margin to the body to offset it by the
  // scroll position. This will enable us to scroll the window to
  // the top, which is required for the rest of this to work.
  const scrollX = window.pageXOffset
  const scrollY = window.pageYOffset

  const restoreStyles = chain(
    setStyle(document.documentElement, 'paddingRight', `${window.innerWidth - document.documentElement.clientWidth}px`)
  )

  // Scroll to the top. The negative margin on the body will make
  // this appear the same.
  window.scrollTo(0, 0)

  const removeEvents = chain(
    addEvent(document, 'touchstart', onTouchStart, { passive: false, capture: true }),
    addEvent(document, 'touchmove', onTouchMove, { passive: false, capture: true }),
    addEvent(document, 'touchend', onTouchEnd, { passive: false, capture: true }),
    addEvent(document, 'focus', onFocus, true),
    addEvent(window, 'scroll', onWindowScroll)
  )

  return () => {
    // Restore styles and scroll the page back to where it was.
    restoreStyles()
    removeEvents()
    window.scrollTo(scrollX, scrollY)
  }
}

/**
 * Set `position: fixed` on `<body>` so the page itself does not
 * move when the drawer opens on Safari. This is the body-level
 * piece of the iOS-Safari workaround — separate from
 * `preventBodyScroll()` because they target different bugs.
 *
 * `setPositionFixed({ isOpen: true, ... })` saves the current
 * `<body>` position styles, applies `position: fixed` with
 * `top: -scrollY` (so the user-visible position does not jump),
 * and stores the current scroll Y in module-level state.
 *
 * `setPositionFixed({ isOpen: false, ... })` restores the
 * original styles and scrolls the page back to where it was.
 *
 * No-op when not on Safari. No-op when `noBodyStyles: true`.
 */
export function setPositionFixed(options: {
  isOpen: boolean
  modal: boolean
  noBodyStyles: boolean
}): void {
  if (isSafari() !== true) return

  if (options.isOpen) {
    if (previousBodyPosition === null && !options.noBodyStyles) {
      previousBodyPosition = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        height: document.body.style.height
      }

      // Update the DOM inside an animation frame
      const scrollX = window.pageXOffset ?? window.scrollX
      const innerHeight = window.innerHeight

      document.body.style.setProperty('position', 'fixed', 'important')
      Object.assign(document.body.style, {
        top: `${-savedScrollY}px`,
        left: `${-scrollX}px`,
        right: '0px',
        height: 'auto'
      })

      // Attempt to check if the bottom bar appeared due to the
      // position change. After 300 ms (the toolbar collapse
      // animation), check if the bottom bar appeared and adjust
      // the top offset so it doesn't hide the content.
      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          const bottomBarHeight = innerHeight - window.innerHeight
          if (bottomBarHeight && savedScrollY >= innerHeight) {
            // Move the content further up so the bottom bar
            // doesn't hide it.
            document.body.style.top = `${-(savedScrollY + bottomBarHeight)}px`
          }
        })
      }, 300)
    }
  } else {
    if (previousBodyPosition !== null && !options.noBodyStyles) {
      // Convert the position from "px" to Int
      const y = -parseInt(document.body.style.top, 10)
      const x = -parseInt(document.body.style.left, 10)

      // Restore styles
      Object.assign(document.body.style, previousBodyPosition)

      window.requestAnimationFrame(() => {
        window.scrollTo(x, y)
      })

      previousBodyPosition = null
    }
  }
}

/**
 * Track the current scroll Y so `setPositionFixed({ isOpen: true,
 * ... })` can apply `top: -scrollY` to preserve the user's scroll
 * position. Call this once on mount (in `dialog.ts`).
 */
export function trackScrollPosition(): () => void {
  if (typeof window === 'undefined') return () => {}
  savedScrollY = window.scrollY
  const onScroll = () => {
    savedScrollY = window.scrollY
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    window.removeEventListener('scroll', onScroll)
  }
}

/* ---------------------------------------------------------------- *
 * Pure helpers used by the two pipelines above.                    *
 * ---------------------------------------------------------------- */

function setStyle(
  element: HTMLElement,
  style: string,
  value: string
): () => void {
  const styleRecord = element.style as unknown as Record<string, string>
  const cur = styleRecord[style] ?? ''
  styleRecord[style] = value
  return () => {
    styleRecord[style] = cur
  }
}

function addEvent<K extends keyof GlobalEventHandlersEventMap>(
  target: EventTarget,
  event: K,
  handler: (ev: GlobalEventHandlersEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  // Cast through `unknown` because the typed overload above is
  // not strict enough for the runtime call.
  target.addEventListener(event, handler as EventListener, options)
  return () => {
    target.removeEventListener(event, handler as EventListener, options)
  }
}

function scrollIntoView(target: Element): void {
  const root = document.scrollingElement || document.documentElement
  let current: Element | null = target
  while (current && current !== root) {
    // Find the parent scrollable element and adjust the scroll
    // position if the target is not already in view.
    const scrollable = getScrollParent(current)
    if (
      scrollable !== document.documentElement &&
      scrollable !== document.body &&
      scrollable !== current
    ) {
      const scrollableTop = scrollable.getBoundingClientRect().top
      const targetTop = (current as HTMLElement).getBoundingClientRect().top
      const targetBottom = (current as HTMLElement).getBoundingClientRect().bottom
      const keyboardHeight = scrollable.getBoundingClientRect().bottom + KEYBOARD_BUFFER

      if (targetBottom > keyboardHeight) {
        scrollable.scrollTop += targetTop - scrollableTop
      }
    }
    current = scrollable.parentElement
  }
}

function isScrollable(node: Element): boolean {
  const style = window.getComputedStyle(node)
  return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY)
}

function getScrollParent(node: Element): Element {
  if (isScrollable(node)) {
    node = node.parentElement as HTMLElement
  }
  while (node && !isScrollable(node)) {
    node = node.parentElement as HTMLElement
  }
  return node || document.scrollingElement || document.documentElement
}

function isInput(target: Element): boolean {
  return (
    (target instanceof HTMLInputElement && !nonTextInputTypes.has(target.type)) ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

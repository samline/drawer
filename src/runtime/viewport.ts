/**
 * Pure mobile-keyboard + visualViewport math. Wired by
 * `vanilla/dialog.ts#attachListeners` (Phase E): the dialog attaches
 * a `window.visualViewport.resize` listener when `repositionInputs`
 * or `fixed` is set, and calls `getViewportDrivenDrawerLayout` to
 * produce the inline `style.height` / `style.bottom` writes that
 * keep the drawer usable while the mobile keyboard is open.
 *
 * `isMobileFirefox` is inlined at the call site because the runtime
 * helper would otherwise pull a UA string into the pure-math path.
 * Extracting it to a shared helper is a follow-up.
 */

export function getKeyboardOpenState({
  previousDiffFromInitial,
  diffFromInitial,
  keyboardIsOpen,
  threshold = 60
}: {
  previousDiffFromInitial: number
  diffFromInitial: number
  keyboardIsOpen: boolean
  threshold?: number
}) {
  if (Math.abs(previousDiffFromInitial - diffFromInitial) > threshold) {
    return !keyboardIsOpen
  }

  return keyboardIsOpen
}

export function getViewportDrivenDrawerLayout({
  visualViewportHeight,
  totalHeight,
  drawerHeight,
  offsetFromTop,
  fixed,
  previousDiffFromInitial,
  keyboardIsOpen,
  initialDrawerHeight,
  activeSnapPointOffset,
  isMobileFirefox,
  windowTopOffset
}: {
  visualViewportHeight: number
  totalHeight: number
  drawerHeight: number
  offsetFromTop: number
  fixed?: boolean
  previousDiffFromInitial: number
  keyboardIsOpen: boolean
  initialDrawerHeight: number
  activeSnapPointOffset?: number
  isMobileFirefox: boolean
  windowTopOffset: number
}) {
  let diffFromInitial = totalHeight - visualViewportHeight
  const isTallEnough = drawerHeight > totalHeight * 0.8
  const nextInitialDrawerHeight = initialDrawerHeight || drawerHeight

  if (typeof activeSnapPointOffset === 'number') {
    diffFromInitial += activeSnapPointOffset
  }

  const nextKeyboardIsOpen = getKeyboardOpenState({
    previousDiffFromInitial,
    diffFromInitial,
    keyboardIsOpen
  })

  let height: string | null = null

  if (drawerHeight > visualViewportHeight || nextKeyboardIsOpen) {
    let newDrawerHeight = drawerHeight

    if (drawerHeight > visualViewportHeight) {
      newDrawerHeight = visualViewportHeight - (isTallEnough ? offsetFromTop : windowTopOffset)
    }

    height = fixed
      ? `${drawerHeight - Math.max(diffFromInitial, 0)}px`
      : `${Math.max(newDrawerHeight, visualViewportHeight - offsetFromTop)}px`
  } else if (!isMobileFirefox) {
    height = `${nextInitialDrawerHeight}px`
  }

  const bottom =
    activeSnapPointOffset !== undefined && !nextKeyboardIsOpen ? '0px' : `${Math.max(diffFromInitial, 0)}px`

  return {
    diffFromInitial,
    nextKeyboardIsOpen,
    nextInitialDrawerHeight,
    height,
    bottom
  }
}

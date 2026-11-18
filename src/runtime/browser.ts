/**
 * Browser / platform detection helpers. Mirrors vaul upstream's
 * `src/browser.ts` 1:1 — the only difference is dropping the React
 * types and the `useEffect` wrapper.
 *
 * All helpers are safe to call in any JS environment (they no-op
 * when `window` / `navigator` are undefined, e.g. during SSR or
 * in a non-DOM jsdom setup).
 */

export const isMobileFirefox = (): boolean | undefined => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return undefined
  }
  const userAgent = navigator.userAgent
  return (
    (/Firefox/.test(userAgent) && /Mobile/.test(userAgent)) || // Android Firefox
    /FxiOS/.test(userAgent) // iOS Firefox
  )
}

export const isMac = (): boolean | undefined => {
  return testPlatform(/^Mac/)
}

export const isIPhone = (): boolean | undefined => {
  return testPlatform(/^iPhone/)
}

export const isSafari = (): boolean | undefined => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return undefined
  }
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

export const isIPad = (): boolean | undefined => {
  return (
    testPlatform(/^iPad/) ||
    // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
    (isMac() === true && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
  )
}

export const isIOS = (): boolean | undefined => {
  return isIPhone() === true || isIPad() === true
}

export const testPlatform = (re: RegExp): boolean | undefined => {
  if (typeof window === 'undefined' || window.navigator == null) {
    return undefined
  }
  return re.test(window.navigator.platform)
}

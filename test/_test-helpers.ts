/**
 * Shared test helpers for the `@samline/drawer` test suite.
 * Currently houses the `browserModuleMocks` helper which mocks the
 * `runtime/browser.ts` exports so tests can flip `isSafari` /
 * `isIOS` without a real user-agent detection.
 */
import { vi } from 'vitest'

import * as browser from '../src/runtime/browser'

const isSafariSpy = vi.spyOn(browser, 'isSafari')
const isIOSSpy = vi.spyOn(browser, 'isIOS')

function reset() {
  isSafariSpy.mockReset()
  isIOSSpy.mockReset()
}

export const browserModuleMocks = {
  reset,
  get isSafariSpy() {
    return isSafariSpy
  },
  get isIOSSpy() {
    return isIOSSpy
  }
}

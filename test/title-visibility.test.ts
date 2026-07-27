import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression tests for the title-slot visibility contract.
 *
 * The `[data-drawer-title]` slot has two roles:
 *
 * - **Visible title**: the consumer passed an explicit `title`
 *   option. The slot renders visibly at the top of the drawer
 *   body.
 * - **Accessibility target**: the consumer did NOT pass `title`
 *   but did pass `ariaLabel`. The package auto-promotes the
 *   `ariaLabel` value into the title slot so the
 *   `aria-labelledby` reference points to real text. In that
 *   case the slot is only an a11y target, not visual content,
 *   so the package auto-hides it (matches the
 *   `descriptionVisuallyHidden` treatment of the description
 *   slot).
 *
 * Consumers can opt out of the auto-hide with an explicit
 * `titleVisuallyHidden: false` (escape hatch for unusual
 * flows).
 *
 * See `.agents/recommendations/2026-07-25-auto-hide-title-slot-when-promoted-from-ariaLabel.md`
 * for the design rationale and
 * `.agents/issues/2026-07-25-modal-drawers-title-leak-open-parpadeo-and-close-button.md`
 * for the original bug report.
 */

function getTitleEl(): HTMLDivElement | null {
  return document.querySelector('[data-drawer-title]')
}

describe('title slot visibility (proxy from ariaLabel vs explicit title)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('hides the title slot when only ariaLabel is provided (proxy case)', () => {
    createDrawer({
      id: 'proxy-only',
      ariaLabel: 'Accessibility-only title',
      content: 'body'
    })

    const title = getTitleEl()
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Accessibility-only title')
    // Matches the VISUALLY_HIDDEN_STYLE contract used by the
    // description slot. Asserting the key fields keeps the
    // test stable if the package tweaks the clip / overflow
    // details in a follow-up.
    expect(title!.style.position).toBe('absolute')
    expect(title!.style.width).toBe('1px')
    expect(title!.style.height).toBe('1px')
    expect(title!.style.overflow).toBe('hidden')
  })

  it('does NOT hide the title slot when an explicit title is provided', () => {
    createDrawer({
      id: 'visible-title',
      title: 'Visible title',
      content: 'body'
    })

    const title = getTitleEl()
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Visible title')
    // No inline style.position means the consumer's CSS positions
    // the visible title.
    expect(title!.style.position).toBe('')
    expect(title!.style.width).toBe('')
  })

  it('does NOT hide the title slot when both title and ariaLabel are provided (explicit title wins)', () => {
    createDrawer({
      id: 'both-provided',
      title: 'Visible title',
      ariaLabel: 'A11y label',
      content: 'body'
    })

    const title = getTitleEl()
    expect(title).not.toBeNull()
    // The visible title is rendered, not the proxy.
    expect(title!.textContent).toBe('Visible title')
    expect(title!.style.position).toBe('')
  })

  it('respects titleVisuallyHidden: true even with an explicit title', () => {
    createDrawer({
      id: 'force-hidden',
      title: 'Visible title (forced hidden)',
      titleVisuallyHidden: true,
      content: 'body'
    })

    const title = getTitleEl()
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Visible title (forced hidden)')
    expect(title!.style.position).toBe('absolute')
    expect(title!.style.width).toBe('1px')
  })

  it('overrides the auto-hide with titleVisuallyHidden: false (proxy + opt-out)', () => {
    createDrawer({
      id: 'opt-out',
      ariaLabel: 'A11y label visible by opt-out',
      titleVisuallyHidden: false,
      content: 'body'
    })

    const title = getTitleEl()
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('A11y label visible by opt-out')
    // The explicit `false` overrides the proxy auto-hide.
    expect(title!.style.position).toBe('')
  })
})

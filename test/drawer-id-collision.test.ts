import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression tests for the drawer-id / descendant-id collision.
 *
 * Bug (v3.0.0-beta.3 → stable): the runtime used to place the
 * drawer's `id` on the `[data-drawer]` content element for "CSS/JS
 * selector compat". That created an id collision when the
 * consumer's content HTML contained any element with the same id
 * (the most common case: a `<form id="myDrawer">` rendered inside
 * the drawer). HTML's `getElementById` returns the FIRST element
 * with the id in tree order, so the form controller (and any other
 * consumer code that looked up the form by id) found the drawer's
 * content `<div>` instead of the form, and the form's
 * initialization silently failed.
 *
 * Fix: the runtime id is now placed on the host element (the
 * top-level container — `<div data-drawer-vanilla-root="...">`)
 * rather than on the content. The content gets a `data-drawer-id`
 * attribute alias so CSS / JS can still target it by id-equivalent.
 * The form (or any other descendant with the same id) is now
 * uniquely findable via `document.getElementById` because no
 * ancestor element has the colliding id.
 *
 * jsdom does not run CSS animations or layout, so these tests are
 * static-source assertions: each one constructs a drawer with a
 * content subtree that contains an element with the drawer's id
 * and verifies the form (or descendant) is the one the DOM
 * resolves, not the drawer's content wrapper.
 */

describe('drawer id collision', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('does not place the drawer id on the [data-drawer] content element', () => {
    // The drawer is identified by the `data-drawer` attribute
    // (and the new `data-drawer-id` alias). The element `id` is
    // intentionally NOT used to avoid collisions with descendant
    // elements that share the same id.
    const drawer = createDrawer({
      id: 'contact-form-drawer',
      direction: 'bottom',
      title: 'Contact form',
      content: 'Body'
    })
    drawer.setOpen(true)

    const content = document.querySelector('[data-drawer]') as HTMLElement
    const host = document.querySelector('[data-drawer-vanilla-root]') as HTMLElement | null

    expect(content).not.toBeNull()
    expect(host).not.toBeNull()
    expect(content.id).not.toBe('contact-form-drawer')
    expect(host?.id).not.toBe('contact-form-drawer')
  })

  it('exposes the drawer id as a data-drawer-id attribute on the content', () => {
    // The `data-drawer-id` attribute is the replacement for the
    // removed `id` selector-compat. CSS / JS can use
    // `[data-drawer-id="myDrawer"]` to target the content.
    const drawer = createDrawer({
      id: 'contact-form-drawer',
      direction: 'bottom',
      title: 'Contact form',
      content: 'Body'
    })
    drawer.setOpen(true)

    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content.getAttribute('data-drawer-id')).toBe('contact-form-drawer')
  })

  it('preserves the inner form id when the form and the drawer share the same id', () => {
    // The whole point of the fix: a consumer-supplied form with
    // `id="contact-form-drawer"` (the same id as the drawer) is
    // the unique element resolved by `document.getElementById`.
    // The form controller (in the consumer's stack) can now
    // successfully bind to the form with no id collision.
    const formEl = document.createElement('form')
    formEl.id = 'contact-form-drawer'
    const input = document.createElement('input')
    input.name = 'email'
    input.type = 'email'
    formEl.appendChild(input)

    const drawer = createDrawer({
      id: 'contact-form-drawer',
      direction: 'bottom',
      title: 'Contact form',
      content: formEl
    })
    drawer.setOpen(true)

    const resolved = document.getElementById('contact-form-drawer')
    expect(resolved).not.toBeNull()
    expect(resolved?.tagName).toBe('FORM')
    expect(resolved?.querySelector('input[name="email"]')).not.toBeNull()
  })

  it('preserves a consumer-provided mountElement id (does not overwrite)', () => {
    // Defensive: a consumer-provided `mountElement` may already
    // carry an id. The runtime must not overwrite it with the
    // drawer's id, because the consumer's id is meaningful to the
    // page-level DOM.
    const mountEl = document.createElement('div')
    mountEl.id = 'consumer-provided-id'
    document.body.appendChild(mountEl)

    const drawer = createDrawer({
      id: 'contact-form-drawer',
      direction: 'bottom',
      title: 'Contact form',
      content: 'Body',
      mountElement: mountEl
    })
    drawer.setOpen(true)

    expect(mountEl.id).toBe('consumer-provided-id')
  })

  it('does not break when the content subtree has the same id as another drawer (nested ids)', () => {
    // Multiple drawers with the same id are also a footgun. The
    // drawer is now identified by the `data-drawer` attribute
    // (which is unique per drawer because the runtime rejects
    // duplicate ids in the registry) and the `data-drawer-vanilla-root`
    // attribute on the host. Different drawers with the same id
    // are out of scope (the runtime rejects them) but this case
    // verifies the inner subtree is reachable via
    // `[data-drawer=""]` (the content attribute) regardless.
    const nestedEl = document.createElement('div')
    nestedEl.id = 'shared-id'
    nestedEl.textContent = 'Nested element with the same id'

    const drawer = createDrawer({
      id: 'shared-id',
      direction: 'bottom',
      title: 'Shared id',
      content: nestedEl
    })
    drawer.setOpen(true)

    const content = document.querySelector('[data-drawer]') as HTMLElement
    const nested = content.querySelector('#shared-id')
    expect(nested).not.toBeNull()
    expect(nested?.textContent).toContain('Nested element')
    // The content wrapper itself does NOT have id="shared-id" (the
    // bug fix).
    expect(content.id).not.toBe('shared-id')
  })
})

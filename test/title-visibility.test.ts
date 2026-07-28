import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression tests for the title-slot and description-slot
 * lifecycle and the default-props accessibility wiring.
 *
 * Title slot (`[data-drawer-title]`) contract:
 *
 * - The slot is mounted ONLY when the consumer passes an
 *   explicit `title` (a visible heading). In that case the
 *   slot is the `aria-labelledby` target and renders
 *   visibly, unless `titleVisuallyHidden: true` is set.
 * - The slot is NOT mounted in the proxy (`ariaLabel` only)
 *   or minimalist (no `title` / `description` / `ariaLabel`)
 *   cases. Those cases rely on `aria-label` for the
 *   accessible name and don't need a slot.
 *
 * Description slot (`[data-drawer-description]`) contract:
 *
 * - The slot is mounted ONLY when the consumer passes an
 *   explicit `description`. In that case the slot is the
 *   `aria-describedby` target and is auto-hidden (the
 *   description is an a11y reference, not visual content).
 *   `descriptionVisuallyHidden: false` is the escape hatch.
 * - The slot is NOT mounted in the no-description case. The
 *   `aria-describedby` attribute is OMITTED entirely (rather
 *   than pointing at a non-existent target).
 *
 * Minimalist case (no `title`, no `description`, no
 * `ariaLabel`): the package auto-assigns `ariaLabel = id`
 * and the dialog has `aria-label = id` and no `aria-labelledby`
 * / `aria-describedby` / slots.
 */

function getTitleEl(): HTMLDivElement | null {
  return document.querySelector('[data-drawer-title]')
}

function getDescriptionEl(): HTMLDivElement | null {
  return document.querySelector('[data-drawer-description]')
}

function getContentEl(): HTMLDivElement | null {
  return document.querySelector('[data-drawer]')
}

function getBodyEl(): HTMLDivElement | null {
  return document.querySelector('[data-drawer-body]')
}

describe('title slot — only mounts when the consumer passes an explicit title', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('renders the title slot when the consumer passes an explicit title', () => {
    createDrawer({
      id: 'visible-title',
      open: true,
      title: 'Visible title',
      content: 'body'
    })

    const title = getTitleEl()
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Visible title')
    // Visible by default — no inline `position: absolute`.
    expect(title!.style.position).toBe('')
    expect(title!.style.width).toBe('')
  })

  it('hides the title slot when titleVisuallyHidden: true is set with an explicit title', () => {
    createDrawer({
      id: 'force-hidden',
      open: true,
      title: 'Visible title (forced hidden)',
      titleVisuallyHidden: true,
      content: 'body'
    })

    const title = getTitleEl()
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Visible title (forced hidden)')
    // Escape hatch for consumers who want a visible heading
    // in their `content` HTML but still need the slot for
    // the `aria-labelledby` reference.
    expect(title!.style.position).toBe('absolute')
    expect(title!.style.width).toBe('1px')
  })

  it('does NOT mount the title slot when only ariaLabel is provided (proxy case)', () => {
    createDrawer({
      id: 'proxy-only',
      open: true,
      ariaLabel: 'Accessibility-only title',
      content: 'body'
    })

    // The accessible name comes from `aria-label`, not from
    // an `aria-labelledby` reference. The title slot would
    // be dead weight here.
    expect(getTitleEl()).toBeNull()
    const content = getContentEl()
    expect(content).not.toBeNull()
    expect(content!.getAttribute('aria-label')).toBe('Accessibility-only title')
    expect(content!.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('does NOT mount the title slot when both title and ariaLabel are provided — but it still does not render the ariaLabel text in the slot', () => {
    // The consumer provides BOTH `title` and `ariaLabel`.
    // The visible title wins: the title slot is mounted with
    // the visible title text, and `aria-label` is also set
    // (parallel reference). The visible title text is what
    // appears in the slot.
    createDrawer({
      id: 'both-provided',
      open: true,
      title: 'Visible title',
      ariaLabel: 'A11y label',
      content: 'body'
    })

    const title = getTitleEl()
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('Visible title')
    expect(title!.style.position).toBe('')
    const content = getContentEl()
    expect(content!.getAttribute('aria-label')).toBe('A11y label')
  })
})

describe('description slot — only mounts when the consumer passes an explicit description', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('renders the description slot when the consumer passes an explicit description', () => {
    createDrawer({
      id: 'with-description',
      open: true,
      title: 'Title',
      description: 'A helpful description',
      content: 'body'
    })

    const desc = getDescriptionEl()
    expect(desc).not.toBeNull()
    expect(desc!.textContent).toBe('A helpful description')
    // Description is an a11y target, not visual content.
    expect(desc!.style.position).toBe('absolute')
    expect(desc!.style.width).toBe('1px')
  })

  it('does NOT mount the description slot when no description is provided', () => {
    createDrawer({
      id: 'no-description',
      open: true,
      ariaLabel: 'Some label',
      content: 'body'
    })

    expect(getDescriptionEl()).toBeNull()
    const content = getContentEl()
    expect(content).not.toBeNull()
    // `aria-describedby` is OMITTED (not pointed at a
    // non-existent target).
    expect(content!.hasAttribute('aria-describedby')).toBe(false)
  })

  it('keeps the description slot visible when descriptionVisuallyHidden: false is set', () => {
    createDrawer({
      id: 'visible-description',
      open: true,
      title: 'Title',
      description: 'Visible description text',
      descriptionVisuallyHidden: false,
      content: 'body'
    })

    const desc = getDescriptionEl()
    expect(desc).not.toBeNull()
    expect(desc!.textContent).toBe('Visible description text')
    // Escape hatch opt-out — the slot renders visibly.
    expect(desc!.style.position).toBe('')
  })
})

describe('default-props accessibility wiring (minimalist case)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('auto-assigns ariaLabel = id when no title/ariaLabel/description is provided', () => {
    createDrawer({
      id: 'minimalist-drawer',
      open: true,
      content: 'body'
    })

    const content = getContentEl()
    expect(content).not.toBeNull()
    // The minimalist fallback sets `aria-label = id` so the
    // dialog always has an accessible name. No `aria-labelledby`
    // (no title slot) and no `aria-describedby` (no
    // description slot).
    expect(content!.getAttribute('aria-label')).toBe('minimalist-drawer')
    expect(content!.hasAttribute('aria-labelledby')).toBe(false)
    expect(content!.hasAttribute('aria-describedby')).toBe(false)
  })

  it('does NOT mount title or description slots in the minimalist case', () => {
    createDrawer({
      id: 'all-hidden',
      open: true,
      content: 'body'
    })

    // The minimalist case has nothing to render in the title
    // and description slots, so the slots are not mounted.
    expect(getTitleEl()).toBeNull()
    expect(getDescriptionEl()).toBeNull()
  })
})

describe('simplified body tree (no data-drawer-vanilla-node, renamed body)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('does not render the legacy [data-drawer-vanilla-node] wrapper', () => {
    createDrawer({
      id: 'no-node',
      open: true,
      title: 'Visible',
      content: 'body'
    })

    expect(document.querySelector('[data-drawer-vanilla-node]')).toBeNull()
  })

  it('uses [data-drawer-body] as the inner body wrapper', () => {
    createDrawer({
      id: 'body-rename',
      open: true,
      title: 'Visible',
      content: 'body'
    })

    const body = getBodyEl()
    expect(body).not.toBeNull()
    // The legacy attribute name is gone.
    expect(document.querySelector('[data-drawer-vanilla-body]')).toBeNull()
    // The title slot lives inside the body when present.
    const title = document.querySelector('[data-drawer-body] > [data-drawer-title]')
    expect(title).not.toBeNull()
  })

  it('has no title/description children in the body when neither option is provided', () => {
    createDrawer({
      id: 'body-empty',
      open: true,
      content: 'body'
    })

    const body = getBodyEl()
    expect(body).not.toBeNull()
    expect(body!.querySelector('[data-drawer-title]')).toBeNull()
    expect(body!.querySelector('[data-drawer-description]')).toBeNull()
  })
})

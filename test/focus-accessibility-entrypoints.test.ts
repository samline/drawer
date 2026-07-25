import { beforeEach, describe, expect, it, vi } from 'vitest'

import { destroyDrawers } from '../src'

async function flushTimers() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 20))
}

function getVanillaTrigger(id: string) {
  const root = document.querySelector(`[data-drawer-vanilla-root="${id}"]`)
  if (!root) {
    throw new Error(`Missing vanilla root for drawer ${id}`)
  }
  const trigger = root.querySelector('[data-drawer-vanilla-trigger]') as HTMLElement | null
  if (!trigger) {
    throw new Error(`Missing built-in vanilla trigger element for drawer ${id}`)
  }
  return trigger
}

describe('focus accessibility across entrypoints', () => {
  beforeEach(() => {
    destroyDrawers()
    // jsdom keeps the document body across tests; the vanilla host
    // root and built-in trigger persist between tests otherwise.
    document.body.innerHTML = ''
  })

  it('releases focus before programmatic open in the vanilla root entry', async () => {
    vi.resetModules()
    const vanillaEntry = await import('../src')

    vanillaEntry.destroyDrawers()
    const drawer = vanillaEntry.createDrawer({
      id: 'vanilla-focus',
      triggerText: 'Open drawer',
      title: 'Vanilla focus',
      content: 'Drawer body',
      autoFocus: false
    })

    await flushTimers()

    const trigger = getVanillaTrigger('vanilla-focus')
    trigger.focus()

    expect(document.activeElement).toBe(trigger)

    drawer.setOpen(true)
    await flushTimers()

    expect(vanillaEntry.getDrawer('vanilla-focus')?.getSnapshot().state.isOpen).toBe(true)
    expect(document.activeElement).not.toBe(trigger)
  })

  it('releases focus before programmatic open in the browser entry', async () => {
    vi.resetModules()
    const browserEntry = await import('../src/browser/global')

    browserEntry.Drawer.destroyDrawers()
    const drawer = browserEntry.Drawer.createDrawer({
      id: 'browser-focus',
      triggerText: 'Open drawer',
      title: 'Browser focus',
      content: 'Drawer body',
      autoFocus: false
    })

    await flushTimers()

    const trigger = getVanillaTrigger('browser-focus')
    trigger.focus()

    expect(document.activeElement).toBe(trigger)

    drawer.setOpen(true)
    await flushTimers()

    expect(browserEntry.Drawer.getDrawer('browser-focus')?.getSnapshot().state.isOpen).toBe(true)
    expect(document.activeElement).not.toBe(trigger)
  })

  it('releases focus before built-in trigger open in the vanilla root entry', async () => {
    vi.resetModules()
    const vanillaEntry = await import('../src')

    vanillaEntry.destroyDrawers()
    const drawer = vanillaEntry.createDrawer({
      id: 'vanilla-trigger-focus',
      triggerText: 'Open drawer',
      title: 'Vanilla trigger focus',
      content: 'Drawer body',
      autoFocus: false
    })

    await flushTimers()

    const trigger = getVanillaTrigger('vanilla-trigger-focus')
    trigger.focus()

    expect(document.activeElement).toBe(trigger)

    trigger.click()
    await flushTimers()

    expect(drawer.getSnapshot().state.isOpen).toBe(true)
    expect(document.activeElement).not.toBe(trigger)
  })

  it('releases focus before built-in trigger open in the browser entry', async () => {
    vi.resetModules()
    const browserEntry = await import('../src/browser/global')

    browserEntry.Drawer.destroyDrawers()
    const drawer = browserEntry.Drawer.createDrawer({
      id: 'browser-trigger-focus',
      triggerText: 'Open drawer',
      title: 'Browser trigger focus',
      content: 'Drawer body',
      autoFocus: false
    })

    await flushTimers()

    const trigger = getVanillaTrigger('browser-trigger-focus')
    trigger.focus()

    expect(document.activeElement).toBe(trigger)

    trigger.click()
    await flushTimers()

    expect(drawer.getSnapshot().state.isOpen).toBe(true)
    expect(document.activeElement).not.toBe(trigger)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'

import { createDrawerController } from '../src/core'

describe('drawer core controller', () => {
  beforeEach(() => {
    // No shared singleton state yet.
  })

  it('creates a closed drawer snapshot by default', () => {
    const controller = createDrawerController()
    const snapshot = controller.getSnapshot()

    expect(snapshot.state.isOpen).toBe(false)
    expect(snapshot.state.direction).toBe('bottom')
    expect(snapshot.state.snapPoints).toEqual([])
    expect(snapshot.state.activeSnapPoint).toBe(null)
  })

  it('tracks open state updates', () => {
    const controller = createDrawerController()

    controller.setOpen(true)

    expect(controller.getSnapshot().state.isOpen).toBe(true)
  })

  it('tracks snap points and active snap point', () => {
    const controller = createDrawerController({
      snapPoints: ['120px', 0.5, 1],
      activeSnapPoint: 0.5
    })

    expect(controller.getSnapshot().state.snapPoints).toEqual(['120px', 0.5, 1])
    expect(controller.getSnapshot().state.activeSnapPoint).toBe(0.5)

    controller.setActiveSnapPoint(1)

    expect(controller.getSnapshot().state.activeSnapPoint).toBe(1)
  })

  it('publishes snapshots to subscribers', () => {
    const controller = createDrawerController()
    const states: boolean[] = []
    const unsubscribe = controller.subscribe((snapshot) => {
      states.push(snapshot.state.isOpen)
    })

    controller.setOpen(true)
    controller.setOpen(false)
    unsubscribe()

    expect(states).toEqual([false, true, false])
  })

  it('patches partial options', () => {
    const controller = createDrawerController({ direction: 'bottom', dismissible: true })

    controller.patch({ direction: 'left', dismissible: false, modal: false })

    expect(controller.getSnapshot().state.direction).toBe('left')
    expect(controller.getSnapshot().state.dismissible).toBe(false)
    expect(controller.getSnapshot().state.modal).toBe(false)
  })
})

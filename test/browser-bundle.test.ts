import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { DrawerApi } from '../src/browser/global'
import * as entry from '../src/browser'

describe('browser IIFE bundle', () => {
  it('also exposes a real module entrypoint', () => {
    expect('default' in entry).toBe(false)
    expect(entry.Drawer.createDrawer).toBeTypeOf('function')
  })

  it('exposes the direct API on window.Drawer', () => {
    const source = readFileSync(resolve(__dirname, '../dist/browser/drawer.global.js'), 'utf8')
    const previousDrawer = window.Drawer

    try {
      delete window.Drawer
      expect(source).not.toContain('SamlineDrawerBundle')
      new Function(source)()

      const drawer = window.Drawer as DrawerApi | undefined
      expect(drawer?.createDrawer).toBeTypeOf('function')
      expect(drawer?.getDrawers).toBeTypeOf('function')
      expect((drawer as unknown as { Drawer?: unknown }).Drawer).toBeUndefined()
    } finally {
      if (previousDrawer) window.Drawer = previousDrawer
      else delete window.Drawer
    }
  })
})

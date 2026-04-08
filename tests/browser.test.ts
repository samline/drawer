import { describe, expect, it, vi } from 'vitest';

describe('browser entry', () => {
  it('can be imported without a window object', async () => {
    const browserEntry = await import('../src/browser/index');

    expect(browserEntry.Drawer.openDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.closeDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.toggleDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.updateDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.createDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.getDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.getDrawers).toBeTypeOf('function');
    expect(browserEntry.Drawer.destroyDrawers).toBeTypeOf('function');
  });

  it('assigns the Drawer namespace to window when available', async () => {
    vi.resetModules();
    vi.stubGlobal('window', {});

    const browserEntry = await import('../src/browser/index');

    expect((globalThis as { window?: { Drawer?: unknown } }).window?.Drawer).toBe(browserEntry.Drawer);

    vi.unstubAllGlobals();
  });

  it('supports multiple named drawers through the browser namespace', async () => {
    const browserEntry = await import('../src/browser/index');

    browserEntry.Drawer.destroyDrawers();
    browserEntry.Drawer.createDrawer({ id: 'browser-a', direction: 'left' });
    browserEntry.Drawer.createDrawer({ id: 'browser-b', direction: 'right' });

    expect(browserEntry.Drawer.getDrawer('browser-a')?.getSnapshot().state.direction).toBe('left');
    expect(browserEntry.Drawer.getDrawer('browser-b')?.getSnapshot().state.direction).toBe('right');

    browserEntry.Drawer.openDrawer('browser-a');
    browserEntry.Drawer.updateDrawer('browser-b', { modal: false });
    browserEntry.Drawer.toggleDrawer('browser-b');

    expect(browserEntry.Drawer.getDrawer('browser-a')?.getSnapshot().state.isOpen).toBe(true);
    expect(browserEntry.Drawer.getDrawer('browser-b')?.getSnapshot().state.modal).toBe(false);
    expect(browserEntry.Drawer.getDrawer('browser-b')?.getSnapshot().state.isOpen).toBe(true);
  });
});
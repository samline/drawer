import { describe, expect, it, vi } from 'vitest';

describe('browser entry', () => {
  it('can be imported without a window object', async () => {
    const browserEntry = await import('../src/browser/index');

    expect(browserEntry.Drawer.createDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.getDrawer).toBeTypeOf('function');
  });

  it('assigns the Drawer namespace to window when available', async () => {
    vi.resetModules();
    vi.stubGlobal('window', {});

    const browserEntry = await import('../src/browser/index');

    expect((globalThis as { window?: { Drawer?: unknown } }).window?.Drawer).toBe(browserEntry.Drawer);

    vi.unstubAllGlobals();
  });
});
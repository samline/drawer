import { describe, expect, it } from 'vitest';

describe('framework entrypoints', () => {
  it('exposes a Vue wrapper surface', async () => {
    const vueEntry = await import('../src/vue/index');

    expect(vueEntry.DrawerRoot).toBeTruthy();
    expect(vueEntry.DrawerPlugin).toBeTruthy();
    expect(vueEntry.createDrawer).toBeTypeOf('function');
  });

  it('exposes a Svelte wrapper surface', async () => {
    const svelteEntry = await import('../src/svelte/index');

    expect(svelteEntry.drawer).toBeTypeOf('function');
    expect(svelteEntry.DrawerRoot).toBe(svelteEntry.drawer);
    expect(svelteEntry.mountDrawer).toBeTypeOf('function');
  });
});
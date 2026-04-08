import { beforeEach, describe, expect, it } from 'vitest';

import { destroyDrawers } from '../src';

describe('framework entrypoints', () => {
  beforeEach(() => {
    destroyDrawers();
  });

  it('exposes a Vue wrapper surface', async () => {
    const vueEntry = await import('../src/vue/index');

    expect(vueEntry.DrawerRoot).toBeTruthy();
    expect(vueEntry.DrawerPlugin).toBeTruthy();
    expect(vueEntry.openDrawer).toBeTypeOf('function');
    expect(vueEntry.closeDrawer).toBeTypeOf('function');
    expect(vueEntry.toggleDrawer).toBeTypeOf('function');
    expect(vueEntry.updateDrawer).toBeTypeOf('function');
    expect(vueEntry.createDrawer).toBeTypeOf('function');
    expect(vueEntry.configureDrawer).toBeTypeOf('function');
    expect(vueEntry.createDrawerController).toBeTypeOf('function');
    expect(vueEntry.getDrawers).toBeTypeOf('function');
    expect(vueEntry.destroyDrawers).toBeTypeOf('function');
  });

  it('exposes a Svelte wrapper surface', async () => {
    const svelteEntry = await import('../src/svelte/index');

    expect(svelteEntry.drawer).toBeTypeOf('function');
    expect(svelteEntry.DrawerRoot).toBe(svelteEntry.drawer);
    expect(svelteEntry.mountDrawer).toBeTypeOf('function');
    expect(svelteEntry.openDrawer).toBeTypeOf('function');
    expect(svelteEntry.closeDrawer).toBeTypeOf('function');
    expect(svelteEntry.toggleDrawer).toBeTypeOf('function');
    expect(svelteEntry.updateDrawer).toBeTypeOf('function');
    expect(svelteEntry.configureDrawer).toBeTypeOf('function');
    expect(svelteEntry.createDrawerController).toBeTypeOf('function');
    expect(svelteEntry.getDrawers).toBeTypeOf('function');
    expect(svelteEntry.destroyDrawers).toBeTypeOf('function');
  });

  it('allows wrappers to target independent ids through the shared runtime', async () => {
    const vueEntry = await import('../src/vue/index');
    const svelteEntry = await import('../src/svelte/index');

    const onDragChange = () => {};
    const onReleaseChange = () => {};

    vueEntry.createDrawer({ id: 'vue-drawer', direction: 'left', onDragChange, onReleaseChange });
    svelteEntry.mountDrawer({ id: 'svelte-drawer', direction: 'right', onDragChange, onReleaseChange });

    expect(vueEntry.getDrawer('vue-drawer')?.getSnapshot().state.direction).toBe('left');
    expect(svelteEntry.getDrawer('svelte-drawer')?.getSnapshot().state.direction).toBe('right');
    expect(svelteEntry.mountDrawer({ id: 'svelte-mounted', direction: 'bottom' })?.id).toBe('svelte-mounted');
    expect(vueEntry.getDrawer('vue-drawer')?.options.onDragChange).toBe(onDragChange);
    expect(svelteEntry.getDrawer('svelte-drawer')?.options.onReleaseChange).toBe(onReleaseChange);

    vueEntry.openDrawer('vue-drawer');
    svelteEntry.toggleDrawer('svelte-drawer');

    expect(vueEntry.getDrawer('vue-drawer')?.getSnapshot().state.isOpen).toBe(true);
    expect(svelteEntry.getDrawer('svelte-drawer')?.getSnapshot().state.isOpen).toBe(true);
  });
});
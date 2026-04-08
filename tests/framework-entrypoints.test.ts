import { beforeEach, describe, expect, it } from 'vitest';

import { destroyDrawers } from '../src';

describe('framework entrypoints', () => {
  beforeEach(() => {
    destroyDrawers();
  });

  it('exposes the shared imperative surface from the React entry', async () => {
    const reactEntry = await import('../src/react/index');

    expect(reactEntry.openDrawer).toBeTypeOf('function');
    expect(reactEntry.closeDrawer).toBeTypeOf('function');
    expect(reactEntry.toggleDrawer).toBeTypeOf('function');
    expect(reactEntry.updateDrawer).toBeTypeOf('function');
    expect(reactEntry.getParentDrawer).toBeTypeOf('function');
    expect(reactEntry.getChildDrawers).toBeTypeOf('function');
    expect(reactEntry.createDrawer).toBeTypeOf('function');
    expect(reactEntry.getDrawer).toBeTypeOf('function');
  });

  it('exposes a Vue wrapper surface', async () => {
    const vueEntry = await import('../src/vue/index');

    expect(vueEntry.DrawerRoot).toBeTruthy();
    expect(vueEntry.DrawerPlugin).toBeTruthy();
    expect(vueEntry.getParentDrawer).toBeTypeOf('function');
    expect(vueEntry.getChildDrawers).toBeTypeOf('function');
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
    expect(svelteEntry.getParentDrawer).toBeTypeOf('function');
    expect(svelteEntry.getChildDrawers).toBeTypeOf('function');
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
    svelteEntry.mountDrawer({ id: 'svelte-drawer', direction: 'right', onDragChange, onReleaseChange, parentId: 'vue-drawer' });

    expect(vueEntry.getDrawer('vue-drawer')?.getSnapshot().state.direction).toBe('left');
    expect(svelteEntry.getDrawer('svelte-drawer')?.getSnapshot().state.direction).toBe('right');
    expect(svelteEntry.mountDrawer({ id: 'svelte-mounted', direction: 'bottom' })?.id).toBe('svelte-mounted');
    expect(vueEntry.getDrawer('vue-drawer')?.options.onDragChange).toBe(onDragChange);
    expect(svelteEntry.getDrawer('svelte-drawer')?.options.onReleaseChange).toBe(onReleaseChange);
    expect(svelteEntry.getParentDrawer('svelte-drawer')?.id).toBe('vue-drawer');
    expect(vueEntry.getChildDrawers('vue-drawer').map((drawer) => drawer.id)).toEqual(['svelte-drawer']);

    vueEntry.openDrawer('vue-drawer');
    svelteEntry.toggleDrawer('svelte-drawer');

    expect(vueEntry.getDrawer('vue-drawer')?.getSnapshot().state.isOpen).toBe(true);
    expect(svelteEntry.getDrawer('svelte-drawer')?.getSnapshot().state.isOpen).toBe(true);
  });

  it('opens the full ancestor chain across wrappers', async () => {
    const vueEntry = await import('../src/vue/index');
    const svelteEntry = await import('../src/svelte/index');

    vueEntry.createDrawer({ id: 'wrapper-grandparent', open: false });
    vueEntry.createDrawer({ id: 'wrapper-parent', parentId: 'wrapper-grandparent', open: false });
    svelteEntry.mountDrawer({ id: 'wrapper-child', parentId: 'wrapper-parent', open: true });

    expect(vueEntry.getDrawer('wrapper-grandparent')?.getSnapshot().state.isOpen).toBe(true);
    expect(vueEntry.getDrawer('wrapper-parent')?.getSnapshot().state.isOpen).toBe(true);
    expect(svelteEntry.getDrawer('wrapper-child')?.getSnapshot().state.isOpen).toBe(true);
  });

  it('keeps snap point state and release callbacks aligned across wrappers', async () => {
    const vueEntry = await import('../src/vue/index');
    const svelteEntry = await import('../src/svelte/index');

    const vueRelease = () => {};
    const svelteRelease = () => {};

    vueEntry.createDrawer({
      id: 'wrapper-snap-vue',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      onReleaseChange: vueRelease,
    });
    svelteEntry.mountDrawer({
      id: 'wrapper-snap-svelte',
      snapPoints: ['100px', '280px', 1],
      activeSnapPoint: '100px',
      onReleaseChange: svelteRelease,
    });

    expect(vueEntry.getDrawer('wrapper-snap-vue')?.getSnapshot().state.activeSnapPoint).toBe('120px');
    expect(svelteEntry.getDrawer('wrapper-snap-svelte')?.getSnapshot().state.activeSnapPoint).toBe('100px');
    expect(vueEntry.getDrawer('wrapper-snap-vue')?.options.onReleaseChange).toBe(vueRelease);
    expect(svelteEntry.getDrawer('wrapper-snap-svelte')?.options.onReleaseChange).toBe(svelteRelease);

    vueEntry.getDrawer('wrapper-snap-vue')?.setActiveSnapPoint(1);
    svelteEntry.updateDrawer('wrapper-snap-svelte', { activeSnapPoint: '280px' });

    expect(vueEntry.getDrawer('wrapper-snap-vue')?.getSnapshot().state.activeSnapPoint).toBe(1);
    expect(svelteEntry.getDrawer('wrapper-snap-svelte')?.getSnapshot().state.activeSnapPoint).toBe('280px');
  });
});
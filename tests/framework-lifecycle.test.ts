import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';

import { destroyDrawers } from '../src';

function installDomGlobals(window: ReturnType<typeof parseHTML>['window']) {
  const visualViewportListeners = {
    addCount: 0,
    removeCount: 0,
  };

  const visualViewport = {
    height: window.innerHeight,
    addEventListener(type: string) {
      if (type === 'resize') {
        visualViewportListeners.addCount += 1;
      }
    },
    removeEventListener(type: string) {
      if (type === 'resize') {
        visualViewportListeners.removeCount += 1;
      }
    },
  };

  vi.stubGlobal('window', window);
  vi.stubGlobal('document', window.document);
  vi.stubGlobal('navigator', window.navigator);
  vi.stubGlobal('HTMLElement', window.HTMLElement);
  vi.stubGlobal('Element', window.Element);
  vi.stubGlobal('Node', window.Node);
  vi.stubGlobal('Text', window.Text);
  vi.stubGlobal('Event', window.Event);
  vi.stubGlobal('CustomEvent', window.CustomEvent);
  vi.stubGlobal('MouseEvent', window.MouseEvent);
  vi.stubGlobal('SVGElement', window.HTMLElement);
  vi.stubGlobal('MutationObserver', class {
    observe() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  });
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue() {
      return '';
    },
    overflow: 'visible',
    overflowX: 'visible',
    overflowY: 'visible',
    transform: 'matrix(1, 0, 0, 1, 0, 0)',
  }));
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }));

  window.requestAnimationFrame = ((callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 16)) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((handle: number) => clearTimeout(handle)) as typeof window.cancelAnimationFrame;
  window.location = new URL('https://example.com/') as never;
  window.history = {
    state: null,
    pushState() {},
    replaceState() {},
    back() {},
    forward() {},
    go() {},
  } as never;
  window.innerWidth = 400;
  window.innerHeight = 800;
  window.visualViewport = visualViewport as never;

  return visualViewportListeners;
}

async function flushTimers() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe('framework lifecycle cleanup', () => {
  beforeEach(() => {
    destroyDrawers();
    vi.unstubAllGlobals();
  });

  it('unmounts React drawers without leaving registry state or visualViewport listeners behind', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body><div id="app"></div></body></html>');
    const visualViewportListeners = installDomGlobals(window);
    const host = window.document.getElementById('app');

    if (!host) {
      throw new Error('Missing React host container');
    }

    try {
      const React = await import('react');
      const { createRoot } = await import('react-dom/client');
      const reactEntry = await import('../src/react/index');

      const root = createRoot(host);

      root.render(
        React.createElement(
          reactEntry.Drawer.Root,
          {
            open: true,
            onOpenChange: () => {},
            modal: true,
            snapPoints: ['120px', 1],
            activeSnapPoint: '120px',
            setActiveSnapPoint: () => {},
          },
          React.createElement(
            reactEntry.Drawer.Portal,
            null,
            React.createElement(reactEntry.Drawer.Overlay, null),
            React.createElement(
              reactEntry.Drawer.Content,
              null,
              React.createElement(reactEntry.Drawer.Title, null, 'React drawer'),
              React.createElement(reactEntry.Drawer.Description, null, 'Lifecycle cleanup'),
            ),
          ),
        ),
      );

      await flushTimers();

      expect(visualViewportListeners.addCount).toBeGreaterThan(0);

      root.unmount();
      await flushTimers();

      expect(visualViewportListeners.removeCount).toBe(visualViewportListeners.addCount);
      expect(Object.keys(reactEntry.getDrawers())).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('destroys the previous Vue-owned runtime instance when the id changes and on unmount', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body><div id="app"></div></body></html>');
    installDomGlobals(window);
    const host = window.document.getElementById('app');

    if (!host) {
      throw new Error('Missing Vue host container');
    }

    try {
      const { createApp, defineComponent, h, nextTick, ref } = await import('vue');
      const vueEntry = await import('../src/vue/index');

      const drawerId = ref('vue-first');
      const App = defineComponent({
        setup() {
          return () =>
            h(vueEntry.DrawerRoot, {
              id: drawerId.value,
              open: true,
              title: 'Vue drawer',
              content: 'Lifecycle cleanup',
            });
        },
      });

      const app = createApp(App);
      app.mount(host);
      await nextTick();
      await flushTimers();

      expect(vueEntry.getDrawer('vue-first')).not.toBeNull();

      drawerId.value = 'vue-second';
      await nextTick();
      await flushTimers();

      expect(vueEntry.getDrawer('vue-first')).toBeNull();
      expect(vueEntry.getDrawer('vue-second')).not.toBeNull();

      app.unmount();
      await nextTick();
      await flushTimers();

      expect(vueEntry.getDrawer('vue-second')).toBeNull();
      expect(Object.keys(vueEntry.getDrawers())).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('destroys the previous Svelte-owned runtime instance on update and destroy', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);

    try {
      const svelteEntry = await import('../src/svelte/index');
      const node = window.document.createElement('span');
      window.document.body.appendChild(node);

      const action = svelteEntry.drawer(node, {
        id: 'svelte-first',
        open: true,
        title: 'Svelte drawer',
        content: 'Lifecycle cleanup',
      });

      await flushTimers();
      expect(svelteEntry.getDrawer('svelte-first')).not.toBeNull();

      action.update({
        id: 'svelte-second',
        open: true,
        title: 'Svelte drawer',
        content: 'Lifecycle cleanup',
      });

      await flushTimers();
      expect(svelteEntry.getDrawer('svelte-first')).toBeNull();
      expect(svelteEntry.getDrawer('svelte-second')).not.toBeNull();

      action.destroy();
      await flushTimers();

      expect(svelteEntry.getDrawer('svelte-second')).toBeNull();
      expect(Object.keys(svelteEntry.getDrawers())).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';

import { destroyDrawers } from '../src';

function installDomGlobals(window: ReturnType<typeof parseHTML>['window']) {
  const visualViewport = {
    height: window.innerHeight,
    addEventListener() {},
    removeEventListener() {},
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
  window.document.hasFocus = () => true;
}

function installFocusTracking(window: ReturnType<typeof parseHTML>['window']) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window.document, 'activeElement');
  const originalFocus = window.HTMLElement.prototype.focus;
  const originalBlur = window.HTMLElement.prototype.blur;
  let activeElement = window.document.body as HTMLElement;

  Object.defineProperty(window.document, 'activeElement', {
    configurable: true,
    get() {
      return activeElement;
    },
  });

  window.HTMLElement.prototype.focus = function () {
    activeElement = this;
  };

  window.HTMLElement.prototype.blur = function () {
    if (activeElement === this) {
      activeElement = window.document.body as HTMLElement;
    }
  };

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window.document, 'activeElement', originalDescriptor);
    } else {
      delete (window.document as Document & { activeElement?: Element | null }).activeElement;
    }

    window.HTMLElement.prototype.focus = originalFocus;
    window.HTMLElement.prototype.blur = originalBlur;
  };
}

async function flushTimers() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 20));
}

function getVanillaTrigger(window: ReturnType<typeof parseHTML>['window']) {
  const trigger = window.document.querySelector('[data-drawer-vanilla-trigger]') as HTMLElement | null;

  if (!trigger) {
    throw new Error('Missing built-in vanilla trigger element');
  }

  return trigger;
}

describe('focus accessibility across entrypoints', () => {
  beforeEach(() => {
    destroyDrawers();
    vi.unstubAllGlobals();
  });

  it('releases focus before programmatic open in the vanilla root entry', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);
    const restoreFocusTracking = installFocusTracking(window);

    try {
      const vanillaEntry = await import('../src');

      vanillaEntry.destroyDrawers();
      const drawer = vanillaEntry.createDrawer({
        id: 'vanilla-focus',
        triggerText: 'Open drawer',
        title: 'Vanilla focus',
        content: 'Drawer body',
        autoFocus: false,
      });

      await flushTimers();

      const trigger = getVanillaTrigger(window);
      trigger.focus();

      expect(window.document.activeElement).toBe(trigger);

      drawer.setOpen(true);
      await flushTimers();

      expect(vanillaEntry.getDrawer('vanilla-focus')?.getSnapshot().state.isOpen).toBe(true);
      expect(window.document.activeElement).not.toBe(trigger);

      vanillaEntry.destroyDrawers();
      await flushTimers();
    } finally {
      restoreFocusTracking();
      vi.unstubAllGlobals();
    }
  });

  it('releases focus before programmatic open in the browser entry', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);
    const restoreFocusTracking = installFocusTracking(window);

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();
      const drawer = browserEntry.Drawer.createDrawer({
        id: 'browser-focus',
        triggerText: 'Open drawer',
        title: 'Browser focus',
        content: 'Drawer body',
        autoFocus: false,
      });

      await flushTimers();

      const trigger = getVanillaTrigger(window);
      trigger.focus();

      expect(window.document.activeElement).toBe(trigger);

      drawer.setOpen(true);
      await flushTimers();

      expect(browserEntry.Drawer.getDrawer('browser-focus')?.getSnapshot().state.isOpen).toBe(true);
      expect(window.document.activeElement).not.toBe(trigger);

      browserEntry.Drawer.destroyDrawers();
      await flushTimers();
    } finally {
      restoreFocusTracking();
      vi.unstubAllGlobals();
    }
  });

  it('releases focus before programmatic open in the Vue entry', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);
    const restoreFocusTracking = installFocusTracking(window);

    try {
      const vueEntry = await import('../src/vue/index');

      const drawer = vueEntry.createDrawer({
        id: 'vue-focus',
        triggerText: 'Open drawer',
        title: 'Vue focus',
        content: 'Drawer body',
        autoFocus: false,
      });
      await flushTimers();

      const trigger = getVanillaTrigger(window);
      trigger.focus();

      expect(window.document.activeElement).toBe(trigger);

      drawer.setOpen(true);
      await flushTimers();

      expect(vueEntry.getDrawer('vue-focus')?.getSnapshot().state.isOpen).toBe(true);
      expect(window.document.activeElement).not.toBe(trigger);

      vueEntry.destroyDrawers();
      await flushTimers();
    } finally {
      restoreFocusTracking();
      vi.unstubAllGlobals();
    }
  });

  it('releases focus before action-driven open in the Svelte entry', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);
    const restoreFocusTracking = installFocusTracking(window);

    try {
      const svelteEntry = await import('../src/svelte/index');
      const node = window.document.createElement('span');
      window.document.body.appendChild(node);

      const action = svelteEntry.drawer(node, {
        id: 'svelte-focus',
        open: false,
        autoFocus: false,
        triggerText: 'Open drawer',
        title: 'Svelte focus',
        content: 'Drawer body',
      });

      await flushTimers();

      const trigger = getVanillaTrigger(window);
      trigger.focus();

      expect(window.document.activeElement).toBe(trigger);

      action.update({
        id: 'svelte-focus',
        open: true,
        autoFocus: false,
        triggerText: 'Open drawer',
        title: 'Svelte focus',
        content: 'Drawer body',
      });
      await flushTimers();

      expect(svelteEntry.getDrawer('svelte-focus')?.getSnapshot().state.isOpen).toBe(true);
      expect(window.document.activeElement).not.toBe(trigger);

      action.destroy();
      await flushTimers();
    } finally {
      restoreFocusTracking();
      vi.unstubAllGlobals();
    }
  });

  it('releases focus before controlled open in the React entry', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body><div id="app"></div></body></html>');
    installDomGlobals(window);
    const restoreFocusTracking = installFocusTracking(window);
    const host = window.document.getElementById('app');

    if (!host) {
      throw new Error('Missing React host container');
    }

    try {
      const React = await import('react');
      const { createRoot } = await import('react-dom/client');
      const reactEntry = await import('../src/react/index');
      const root = createRoot(host);

      const renderDrawer = (open: boolean) => {
        root.render(
          React.createElement(
            reactEntry.Drawer.Root,
            {
              open,
              onOpenChange: () => {},
              modal: true,
              autoFocus: false,
            },
            React.createElement(
              reactEntry.Drawer.Trigger,
              { asChild: true },
              React.createElement('button', { id: 'react-trigger', type: 'button' }, 'Open drawer'),
            ),
            React.createElement(
              reactEntry.Drawer.Portal,
              null,
              React.createElement(reactEntry.Drawer.Overlay, null),
              React.createElement(
                reactEntry.Drawer.Content,
                null,
                React.createElement(reactEntry.Drawer.Title, null, 'React focus'),
                React.createElement(reactEntry.Drawer.Description, null, 'Drawer body'),
              ),
            ),
          ),
        );
      };

      renderDrawer(false);
      await flushTimers();

      const trigger = window.document.getElementById('react-trigger') as HTMLElement | null;

      if (!trigger) {
        throw new Error('Missing React trigger button');
      }

      trigger.focus();
      expect(window.document.activeElement).toBe(trigger);

      renderDrawer(true);
      await flushTimers();

      expect(window.document.activeElement).not.toBe(trigger);

      root.unmount();
      await flushTimers();
    } finally {
      restoreFocusTracking();
      vi.unstubAllGlobals();
    }
  });
});
import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';

function installDomGlobals(window: ReturnType<typeof parseHTML>['window']) {
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
}

describe('browser entry', () => {
  it('can be imported without a window object', async () => {
    const browserEntry = await import('../src/browser/index');

    expect(browserEntry.Drawer.openDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.closeDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.toggleDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.updateDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.getParentDrawer).toBeTypeOf('function');
    expect(browserEntry.Drawer.getChildDrawers).toBeTypeOf('function');
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
    browserEntry.Drawer.createDrawer({ id: 'browser-child', parentId: 'browser-a', open: true });

    expect(browserEntry.Drawer.getDrawer('browser-a')?.getSnapshot().state.isOpen).toBe(true);
    expect(browserEntry.Drawer.getDrawer('browser-b')?.getSnapshot().state.modal).toBe(false);
    expect(browserEntry.Drawer.getDrawer('browser-b')?.getSnapshot().state.isOpen).toBe(true);
    expect(browserEntry.Drawer.getParentDrawer('browser-child')?.id).toBe('browser-a');
    expect(browserEntry.Drawer.getChildDrawers('browser-a').map((drawer) => drawer.id)).toEqual(['browser-child']);
  });

  it('keeps snap point state and release callbacks observable through the browser namespace', async () => {
    const browserEntry = await import('../src/browser/index');
    const onReleaseChange = vi.fn();

    browserEntry.Drawer.destroyDrawers();
    browserEntry.Drawer.createDrawer({
      id: 'browser-snap',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      onReleaseChange,
    });

    expect(browserEntry.Drawer.getDrawer('browser-snap')?.getSnapshot().state.activeSnapPoint).toBe('120px');
    expect(browserEntry.Drawer.getDrawer('browser-snap')?.options.onReleaseChange).toBe(onReleaseChange);

    browserEntry.Drawer.getDrawer('browser-snap')?.setActiveSnapPoint('320px');
    expect(browserEntry.Drawer.getDrawer('browser-snap')?.getSnapshot().state.activeSnapPoint).toBe('320px');

    browserEntry.Drawer.updateDrawer('browser-snap', { activeSnapPoint: 1 });
    expect(browserEntry.Drawer.getDrawer('browser-snap')?.getSnapshot().state.activeSnapPoint).toBe(1);
  });

  it('stores non-React handle options through the browser namespace', async () => {
    const browserEntry = await import('../src/browser/index');

    browserEntry.Drawer.destroyDrawers();
    browserEntry.Drawer.createDrawer({
      id: 'browser-handle-options',
      showHandle: true,
      handleClassName: 'browser-handle',
    });

    expect(browserEntry.Drawer.getDrawer('browser-handle-options')?.options.showHandle).toBe(true);
    expect(browserEntry.Drawer.getDrawer('browser-handle-options')?.options.handleClassName).toBe('browser-handle');
  });

  it('opens from a real trigger element and mounts a host when DOM is available', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body><button id="trigger">Open</button></body></html>');
    const trigger = window.document.getElementById('trigger') as HTMLElement | null;

    if (!trigger) {
      throw new Error('Missing trigger element for browser DOM test');
    }

    installDomGlobals(window);

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();
      browserEntry.Drawer.createDrawer({
        id: 'browser-dom',
        triggerElement: trigger,
        showHandle: true,
        handleClassName: 'browser-dom-handle',
        title: 'DOM drawer',
        content: 'Body',
      });

      trigger.dispatchEvent(new window.Event('click'));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(browserEntry.Drawer.getDrawer('browser-dom')?.getSnapshot().state.isOpen).toBe(true);
      expect(window.document.querySelector('[data-drawer-vanilla-root="browser-dom"]')).not.toBeNull();
        expect(browserEntry.Drawer.getDrawer('browser-dom')?.options.showHandle).toBe(true);
        expect(browserEntry.Drawer.getDrawer('browser-dom')?.options.handleClassName).toBe('browser-dom-handle');

      browserEntry.Drawer.destroyDrawers();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('opens every ancestor in a deep nested browser chain', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();
      browserEntry.Drawer.createDrawer({ id: 'browser-grandparent', open: false });
      browserEntry.Drawer.createDrawer({ id: 'browser-parent', parentId: 'browser-grandparent', open: false });
      browserEntry.Drawer.createDrawer({ id: 'browser-child', parentId: 'browser-parent', open: true });

      expect(browserEntry.Drawer.getDrawer('browser-grandparent')?.getSnapshot().state.isOpen).toBe(true);
      expect(browserEntry.Drawer.getDrawer('browser-parent')?.getSnapshot().state.isOpen).toBe(true);
      expect(browserEntry.Drawer.getDrawer('browser-child')?.getSnapshot().state.isOpen).toBe(true);

      browserEntry.Drawer.destroyDrawers();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
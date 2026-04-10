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

function collectConsoleMessages(spies: Array<ReturnType<typeof vi.spyOn>>) {
  return spies
    .flatMap((spy) => spy.mock.calls)
    .flat()
    .map((entry) => String(entry))
    .join('\n');
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

  it('blurs the focused built-in trigger before a modal vanilla drawer opens without autoFocus', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);

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

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();

      const drawer = browserEntry.Drawer.createDrawer({
        id: 'browser-focus-release',
        triggerText: 'Open drawer',
        title: 'Focus release',
        content: 'Drawer body',
        autoFocus: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const trigger = window.document.querySelector('[data-drawer-vanilla-trigger]') as HTMLElement | null;

      if (!trigger) {
        throw new Error('Missing built-in trigger element for focus test');
      }

      trigger.focus();
      expect(window.document.activeElement).toBe(trigger);

      drawer.setOpen(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(browserEntry.Drawer.getDrawer('browser-focus-release')?.getSnapshot().state.isOpen).toBe(true);
      expect(window.document.activeElement).not.toBe(trigger);

      browserEntry.Drawer.destroyDrawers();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      window.HTMLElement.prototype.focus = originalFocus;
      window.HTMLElement.prototype.blur = originalBlur;
      vi.unstubAllGlobals();
    }
  });

  it('prevents built-in trigger focus on mouse down when modal focus release is required', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);

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

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();
      const drawer = browserEntry.Drawer.createDrawer({
        id: 'browser-built-in-trigger-listener',
        triggerText: 'Open drawer',
        title: 'Built-in trigger listener',
        content: 'Drawer body',
        autoFocus: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const trigger = window.document.querySelector('[data-drawer-vanilla-trigger]') as HTMLElement | null;

      if (!trigger) {
        throw new Error('Missing built-in trigger element for mouse down test');
      }

      const mouseDown = new window.Event('mousedown', { bubbles: true, cancelable: true });
      const mouseDownDispatched = trigger.dispatchEvent(mouseDown);

      expect(mouseDownDispatched).toBe(false);
      expect(mouseDown.defaultPrevented).toBe(true);

      for (let index = 0; index < 3; index += 1) {
        trigger.focus();
        expect(window.document.activeElement).toBe(trigger);

        const nextMouseDown = new window.Event('mousedown', { bubbles: true, cancelable: true });
        trigger.dispatchEvent(nextMouseDown);
        trigger.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(window.document.activeElement).not.toBe(trigger);
      }

      expect(drawer.getSnapshot().state.isOpen).toBe(true);

      browserEntry.Drawer.destroyDrawers();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window.document, 'activeElement', originalDescriptor);
      } else {
        delete (window.document as Document & { activeElement?: Element | null }).activeElement;
      }

      window.HTMLElement.prototype.focus = originalFocus;
      window.HTMLElement.prototype.blur = originalBlur;
      vi.unstubAllGlobals();
    }
  });

  it('rebinds trigger listeners when the same browser id is updated with a new trigger element', async () => {
    vi.resetModules();

    const { window } = parseHTML(
      '<!doctype html><html><head></head><body><button id="trigger-a">A</button><button id="trigger-b">B</button></body></html>',
    );
    installDomGlobals(window);

    const triggerA = window.document.getElementById('trigger-a') as HTMLElement | null;
    const triggerB = window.document.getElementById('trigger-b') as HTMLElement | null;

    if (!triggerA || !triggerB) {
      throw new Error('Missing trigger elements for trigger rebinding test');
    }

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();
      browserEntry.Drawer.createDrawer({
        id: 'browser-trigger-rebind',
        triggerElement: triggerA,
        title: 'Trigger rebind',
        content: 'Body',
      });

      browserEntry.Drawer.closeDrawer('browser-trigger-rebind');
      browserEntry.Drawer.updateDrawer('browser-trigger-rebind', { triggerElement: triggerB });

      triggerA.dispatchEvent(new window.Event('click'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(browserEntry.Drawer.getDrawer('browser-trigger-rebind')?.getSnapshot().state.isOpen).toBe(false);

      triggerB.dispatchEvent(new window.Event('click'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(browserEntry.Drawer.getDrawer('browser-trigger-rebind')?.getSnapshot().state.isOpen).toBe(true);

      browserEntry.Drawer.destroyDrawers();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('balances trigger click listeners across repeated browser create, update, and destroy cycles', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);

    const originalAddEventListener = window.HTMLElement.prototype.addEventListener;
    const originalRemoveEventListener = window.HTMLElement.prototype.removeEventListener;
    let clickAddCount = 0;
    let clickRemoveCount = 0;

    window.HTMLElement.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (type === 'click' && this instanceof window.HTMLElement && this.dataset.triggerBalance === 'true') {
        clickAddCount += 1;
      }

      return originalAddEventListener.call(this, type, listener, options);
    };

    window.HTMLElement.prototype.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) {
      if (type === 'click' && this instanceof window.HTMLElement && this.dataset.triggerBalance === 'true') {
        clickRemoveCount += 1;
      }

      return originalRemoveEventListener.call(this, type, listener, options);
    };

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();

      for (let index = 0; index < 20; index += 1) {
        const triggerA = window.document.createElement('button');
        const triggerB = window.document.createElement('button');

        triggerA.dataset.triggerBalance = 'true';
        triggerB.dataset.triggerBalance = 'true';

        window.document.body.appendChild(triggerA);
        window.document.body.appendChild(triggerB);

        browserEntry.Drawer.createDrawer({
          id: `browser-balance-${index}`,
          triggerElement: triggerA,
          title: `Balance ${index}`,
          content: `Body ${index}`,
        });

        browserEntry.Drawer.updateDrawer(`browser-balance-${index}`, {
          triggerElement: triggerB,
        });

        browserEntry.Drawer.destroyDrawer(`browser-balance-${index}`);
      }

      expect(clickAddCount).toBe(40);
      expect(clickRemoveCount).toBe(clickAddCount);
      expect(Object.keys(browserEntry.Drawer.getDrawers())).toHaveLength(0);
    } finally {
      window.HTMLElement.prototype.addEventListener = originalAddEventListener;
      window.HTMLElement.prototype.removeEventListener = originalRemoveEventListener;
      vi.unstubAllGlobals();
    }
  });

  it('does not emit Radix accessibility warnings when custom content provides labelled nodes', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();
      browserEntry.Drawer.createDrawer({
        id: 'browser-custom-a11y',
        open: true,
        ariaLabelledBy: 'styled-sheet-title',
        ariaDescribedBy: 'styled-sheet-description',
        content() {
          const wrapper = window.document.createElement('div');
          wrapper.innerHTML = [
            '<h2 id="styled-sheet-title">A controlled drawer.</h2>',
            '<p id="styled-sheet-description">Accessible custom content.</p>',
          ].join('');
          return wrapper;
        },
      });

      const messages = collectConsoleMessages([errorSpy, warnSpy]);

      expect(messages).not.toContain('DialogContent requires a DialogTitle');
      expect(messages).not.toContain('Missing `Description`');

      browserEntry.Drawer.destroyDrawers();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
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

  it('leaves no browser runtime instances after repeated create and destroy cycles', async () => {
    vi.resetModules();

    const { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
    installDomGlobals(window);

    try {
      const browserEntry = await import('../src/browser/index');

      browserEntry.Drawer.destroyDrawers();

      for (let index = 0; index < 25; index += 1) {
        const trigger = window.document.createElement('button');
        trigger.id = `trigger-${index}`;
        window.document.body.appendChild(trigger);

        browserEntry.Drawer.createDrawer({
          id: `browser-cycle-${index}`,
          triggerElement: trigger,
          title: `Browser drawer ${index}`,
          content: `Body ${index}`,
          showHandle: index % 2 === 0,
        });

        trigger.dispatchEvent(new window.Event('click'));
        await new Promise((resolve) => setTimeout(resolve, 0));

        browserEntry.Drawer.destroyDrawer(`browser-cycle-${index}`);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      expect(Object.keys(browserEntry.Drawer.getDrawers())).toHaveLength(0);
      expect(window.document.querySelector('[data-drawer-vanilla-root]')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
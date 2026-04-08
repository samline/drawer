import { beforeEach, describe, expect, it } from 'vitest';

import { configureDrawer, createDrawer, destroyDrawer, getDrawer } from '../src';

describe('vanilla root entry', () => {
  beforeEach(() => {
    destroyDrawer();
  });

  it('creates and returns a shared drawer controller', () => {
    const drawer = createDrawer({ direction: 'left', dismissible: false });

    expect(drawer.getSnapshot().state.direction).toBe('left');
    expect(drawer.getSnapshot().state.dismissible).toBe(false);
    expect(getDrawer()).not.toBeNull();
  });

  it('updates the same shared controller via configureDrawer', () => {
    const drawer = createDrawer({ direction: 'bottom' });
    const updated = configureDrawer({ modal: false });

    expect(updated).toBeTruthy();
    expect(updated.getSnapshot().state.modal).toBe(false);
    expect(drawer.getSnapshot().state.modal).toBe(false);
  });

  it('destroys the shared vanilla controller', () => {
    createDrawer({ direction: 'bottom' });

    destroyDrawer();

    expect(getDrawer()).toBeNull();
  });

  it('stores vanilla-only render options on the shared controller', () => {
    const drawer = createDrawer({
      triggerText: 'Open drawer',
      title: 'Drawer title',
      description: 'Drawer description',
      content: 'Drawer content',
    });

    expect(drawer.options.triggerText).toBe('Open drawer');
    expect(drawer.options.title).toBe('Drawer title');
    expect(drawer.options.description).toBe('Drawer description');
    expect(drawer.options.content).toBe('Drawer content');
  });
});
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  closeDrawer,
  configureDrawer,
  createDrawer,
  destroyDrawer,
  destroyDrawers,
  getDrawer,
  getDrawers,
  openDrawer,
  toggleDrawer,
  updateDrawer,
} from '../src';

describe('vanilla root entry', () => {
  beforeEach(() => {
    destroyDrawers();
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

  it('creates multiple independent drawer instances when ids are provided', () => {
    const leftDrawer = createDrawer({ id: 'left', direction: 'left', dismissible: false });
    const rightDrawer = createDrawer({ id: 'right', direction: 'right', modal: false });

    expect(leftDrawer.id).toBe('left');
    expect(rightDrawer.id).toBe('right');
    expect(getDrawer('left')?.getSnapshot().state.direction).toBe('left');
    expect(getDrawer('right')?.getSnapshot().state.direction).toBe('right');
    expect(getDrawer('left')?.getSnapshot().state.modal).toBe(true);
    expect(getDrawer('right')?.getSnapshot().state.modal).toBe(false);
    expect(Object.keys(getDrawers())).toEqual(['left', 'right']);
  });

  it('destroys only the targeted drawer instance', () => {
    createDrawer({ id: 'alpha', direction: 'left' });
    createDrawer({ id: 'beta', direction: 'right' });

    destroyDrawer('alpha');

    expect(getDrawer('alpha')).toBeNull();
    expect(getDrawer('beta')).not.toBeNull();
  });

  it('notifies shared lifecycle callbacks for programmatic open and close changes', () => {
    vi.useFakeTimers();

    const onOpenChange = vi.fn();
    const onClose = vi.fn();
    const onAnimationEnd = vi.fn();
    const drawer = createDrawer({
      id: 'callbacks',
      onOpenChange,
      onClose,
      onAnimationEnd,
    });

    drawer.setOpen(true);
    drawer.setOpen(false);
    vi.runAllTimers();

    expect(onOpenChange).toHaveBeenNthCalledWith(1, true);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAnimationEnd).toHaveBeenNthCalledWith(1, true);
    expect(onAnimationEnd).toHaveBeenNthCalledWith(2, false);

    vi.useRealTimers();
  });

  it('supports imperative helpers for opening, closing, toggling, and updating by id', () => {
    openDrawer('helper-drawer');
    expect(getDrawer('helper-drawer')?.getSnapshot().state.isOpen).toBe(true);

    closeDrawer('helper-drawer');
    expect(getDrawer('helper-drawer')?.getSnapshot().state.isOpen).toBe(false);

    toggleDrawer('helper-drawer');
    expect(getDrawer('helper-drawer')?.getSnapshot().state.isOpen).toBe(true);

    updateDrawer('helper-drawer', { direction: 'left', modal: false });
    expect(getDrawer('helper-drawer')?.getSnapshot().state.direction).toBe('left');
    expect(getDrawer('helper-drawer')?.getSnapshot().state.modal).toBe(false);
  });
});
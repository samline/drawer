import {
  closeDrawer,
  configureDrawer,
  createDrawer,
  createDrawerController,
  destroyDrawer,
  destroyDrawers,
  getChildDrawers,
  getDrawer,
  getDrawers,
  getParentDrawer,
  openDrawer,
  toggleDrawer,
  updateDrawer,
} from '../index';
import type { VanillaDrawerController, VanillaDrawerOptions } from '../index';

export type SvelteDrawerOptions = VanillaDrawerOptions;

function syncDrawer(options?: SvelteDrawerOptions) {
  createDrawer(options ?? {});
}

function getDrawerInstanceId(options?: SvelteDrawerOptions) {
  return typeof options?.id === 'string' ? options.id : 'default';
}

export function drawer(node: HTMLElement, options?: SvelteDrawerOptions) {
  let currentDrawerId = getDrawerInstanceId(options);

  node.dataset.drawerSvelteRoot = '';
  node.hidden = true;
  node.setAttribute('aria-hidden', 'true');

  syncDrawer(options);

  return {
    update(nextOptions?: SvelteDrawerOptions) {
      const nextDrawerId = getDrawerInstanceId(nextOptions);

      if (currentDrawerId && currentDrawerId !== nextDrawerId) {
        destroyDrawer(currentDrawerId);
      }

      currentDrawerId = nextDrawerId;
      syncDrawer(nextOptions);
    },
    destroy() {
      destroyDrawer(currentDrawerId);
    },
  };
}

export const DrawerRoot = drawer;

export function mountDrawer(options?: SvelteDrawerOptions): VanillaDrawerController | null {
  syncDrawer(options);
  return getDrawer(getDrawerInstanceId(options));
}

export {
  getParentDrawer,
  getChildDrawers,
  closeDrawer,
  configureDrawer,
  createDrawer,
  createDrawerController,
  destroyDrawer,
  destroyDrawers,
  getDrawer,
  getDrawers,
  openDrawer,
  toggleDrawer,
  updateDrawer,
};
export type { VanillaDrawerController, VanillaDrawerOptions };
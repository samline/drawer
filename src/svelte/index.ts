import { createDrawer, destroyDrawer, getDrawer } from '../index';
import type { VanillaDrawerController, VanillaDrawerOptions } from '../index';

export type SvelteDrawerOptions = VanillaDrawerOptions;

function syncDrawer(options?: SvelteDrawerOptions) {
  createDrawer(options ?? {});
}

export function drawer(node: HTMLElement, options?: SvelteDrawerOptions) {
  node.dataset.drawerSvelteRoot = '';
  node.hidden = true;
  node.setAttribute('aria-hidden', 'true');

  syncDrawer(options);

  return {
    update(nextOptions?: SvelteDrawerOptions) {
      syncDrawer(nextOptions);
    },
    destroy() {
      destroyDrawer();
    },
  };
}

export const DrawerRoot = drawer;

export function mountDrawer(options?: SvelteDrawerOptions): VanillaDrawerController | null {
  syncDrawer(options);
  return getDrawer();
}

export { createDrawer, destroyDrawer, getDrawer };
export type { VanillaDrawerController, VanillaDrawerOptions };
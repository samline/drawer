import { configureDrawer, createDrawer, createDrawerController, destroyDrawer, getDrawer } from '../index';

export const Drawer = {
  createDrawer,
  configureDrawer,
  getDrawer,
  destroyDrawer,
  createDrawerController,
};

declare global {
  interface Window {
    Drawer?: typeof Drawer;
  }
}

if (typeof window !== 'undefined') {
  window.Drawer = Drawer;
}

export { configureDrawer, createDrawer, createDrawerController, destroyDrawer, getDrawer } from '../index';
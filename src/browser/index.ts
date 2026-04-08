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

export const Drawer = {
  getParentDrawer,
  getChildDrawers,
  openDrawer,
  closeDrawer,
  toggleDrawer,
  updateDrawer,
  createDrawer,
  configureDrawer,
  getDrawer,
  getDrawers,
  destroyDrawer,
  destroyDrawers,
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

export {
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
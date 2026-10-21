import {
  createDrawer,
  createDrawerController,
  destroyDrawers,
  getDrawer,
  getDrawers,
  getParentDrawer,
  getChildDrawers
} from '../index'

/** The standalone script and optional module namespace expose the same public API. */
export const Drawer = {
  createDrawer,
  createDrawerController,
  destroyDrawers,
  getDrawer,
  getDrawers,
  getParentDrawer,
  getChildDrawers
}
export type DrawerApi = typeof Drawer
export { createDrawer, createDrawerController, destroyDrawers, getDrawer, getDrawers, getParentDrawer, getChildDrawers }
export default Drawer

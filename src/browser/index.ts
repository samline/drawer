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
  updateDrawer
} from '../index'

export interface DrawerApi {
  getParentDrawer: typeof getParentDrawer
  getChildDrawers: typeof getChildDrawers
  openDrawer: typeof openDrawer
  closeDrawer: typeof closeDrawer
  toggleDrawer: typeof toggleDrawer
  updateDrawer: typeof updateDrawer
  createDrawer: typeof createDrawer
  configureDrawer: typeof configureDrawer
  getDrawer: typeof getDrawer
  getDrawers: typeof getDrawers
  destroyDrawer: typeof destroyDrawer
  destroyDrawers: typeof destroyDrawers
  createDrawerController: typeof createDrawerController
}

export const Drawer: DrawerApi = {
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
  createDrawerController
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
  updateDrawer
}

export default Drawer

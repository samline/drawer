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
import type { VanillaDrawerController, VanillaDrawerOptions } from '../index'

export interface NewDrawerInput {
  id: string
  html: string
  options?: Omit<VanillaDrawerOptions, 'id' | 'content'>
}

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
  newDrawer: (input: NewDrawerInput) => VanillaDrawerController | undefined
  readonly available: Readonly<Record<string, VanillaDrawerController>>
}

const newDrawer = ({ id, html, options }: NewDrawerInput) => {
  if (!id || !html) {
    console.error('Drawer ID and HTML content are required')
    return
  }

  return createDrawer({
    ...options,
    id,
    content: () => {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = html
      return wrapper
    }
  })
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
  createDrawerController,
  newDrawer,
  get available() {
    return getDrawers()
  }
}

// `browser` mirrors the convention used by @samline/forms and
// @samline/notify: bundlers and the IIFE consume the exact same singleton.
export const browser = Drawer

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

export { newDrawer }

export default Drawer

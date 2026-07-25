// Module barrel for the browser entrypoint.
//
// Pure re-exports — NO `globalThis` / `window` side-effects here. This
// module is the bundler-friendly entry; consumers who want `window.Drawer`
// should import `@samline/drawer/browser` (the IIFE bundle) instead.
//
// The IIFE bundle is produced from `./global.ts`, which is the single
// source of truth for the `window.Drawer` assignment.

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
} from '../index'

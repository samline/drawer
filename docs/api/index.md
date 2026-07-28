# API reference

The public API of `@samline/drawer`. Every entrypoint returns a `VanillaDrawerController` (from `createDrawer`) or a `CommonDrawerController` (from `createDrawerController`), or operates on the module-level registry without returning a controller.

The runtime is built around the `id` — calling any of these with the same `id` updates the same drawer rather than creating a second one.

Each id owns a dedicated host. Closed drawers keep only that host and an optional built-in trigger; overlay and dialog content are present while open or exiting. With multiple open drawers, closed-to-open order controls Escape handling, focus restoration, and shared scale ownership. Re-rendering an open drawer does not promote it.

---

## Factory

- [`createDrawer(options?)`](create-drawer.md) — create or update a named drawer instance and return its controller.
- [`configureDrawer(options?)`](configure-drawer.md) — alias of `createDrawer` kept for intent.

## Inspectors

- [`getDrawer(id?)`](get-drawer.md) — return the controller for a drawer, or `null` if it has not been created.
- [`getDrawers()`](get-drawers.md) — return every live drawer keyed by id.
- [`getParentDrawer(id?)`](get-parent-drawer.md) — return the parent of a nested drawer, or `null` for top-level drawers.
- [`getChildDrawers(id?)`](get-child-drawers.md) — return the children of a nested drawer.

## Mutators

- [`updateDrawer(idOrOptions?, options?)`](update-drawer.md) — merge new options into an existing drawer.
- [`openDrawer(id?)`](open-drawer.md) — open a drawer.
- [`closeDrawer(id?)`](close-drawer.md) — close a drawer.
- [`toggleDrawer(id?)`](toggle-drawer.md) — toggle a drawer's open state.
- [`destroyDrawer(id?)`](destroy-drawer.md) — destroy a single drawer and remove it from the registry.
- [`destroyDrawers()`](destroy-drawers.md) — destroy every live drawer.

## Headless

- [`createDrawerController(options?)`](create-drawer-controller.md) — create a controller without mounting a DOM host. Useful for tests, headless logic, or building a different renderer on top of the same observable state.

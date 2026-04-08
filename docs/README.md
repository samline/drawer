# Documentation

This package exposes one shared drawer runtime across multiple entrypoints. Start here if you want the overview, then jump into the guide for the adapter you plan to ship.

## Guides

- [API Reference](api.md)
- [Vanilla JS](vanilla.md)
- [Browser](browser.md)
- [React](react.md)
- [Vue](vue.md)
- [Svelte](svelte.md)

## What to Read First

1. [api.md](api.md) for the shared contracts, root controller API, and framework-specific exports.
2. The entrypoint guide you plan to use in production.
3. [README.md](../README.md) for the package overview and entrypoint selection.

## Shared Runtime Notes

- The root package manages named drawer instances. Omitting `id` targets the default instance.
- The browser, Vue, Svelte, and React imperative exports all target that same shared runtime rather than separate registries.
- Use `parentId` to relate drawers and query that graph with `getParentDrawer()` and `getChildDrawers()`.
- The `core` entry does not render anything. It only exposes shared controller contracts and state snapshots.

## Integration Notes

- React gives you direct component composition.
- Vanilla, browser, Vue, and Svelte configure the same drawer behavior through the mounted shared host.
- Outside React, `title`, `description`, and `content` use framework-agnostic render values instead of framework-native component trees.
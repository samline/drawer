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

- The root package manages one module-level drawer host, so repeated calls to `createDrawer()` or `configureDrawer()` reconfigure the same instance.
- The browser, Vue, and Svelte entries all drive that same shared host rather than creating independent runtimes.
- The `core` entry does not render anything. It only exposes shared controller contracts and state snapshots.
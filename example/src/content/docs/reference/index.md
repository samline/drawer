---
title: Reference
description: Authoritative documentation for every public symbol in @samline/drawer.
template: doc
sidebar:
  order: 1
---

This section documents the `@samline/drawer@3.0.0-beta.4` public surface and its current runtime behavior. Pages are grouped by configuration, API, types, browser usage, styling, and examples.

:::note
Each registered id owns a dedicated host. Overlay and dialog content use lazy Presence, while an optional built-in trigger persists when the drawer is closed. Closing preserves the registry entry; destroying releases it.
:::

## Sections in this reference

- [Configuration](/drawer/reference/configuration/) — every `CommonDrawerOptions` and `VanillaDrawerOptions` field, including beta.4 defaults and deprecated aliases.
- [API](/drawer/reference/api/) — signatures, registry behavior, lazy mount lifecycle, callbacks, and teardown.
- [TypeScript](/drawer/reference/typescript/) — root type exports, structural shapes, constants, and the browser-only API type.
- [Browser global](/drawer/reference/browser/) — separate CSS + JS CDN setup for `window.Drawer`.
- [CSS styling](/drawer/reference/css-styling/) — the full DOM/data-attribute contract, inline writes, and global effect ownership.
- [Examples](/drawer/reference/examples/) — end-to-end recipes for common real-world scenarios.

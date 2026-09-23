---
title: Reference
description: Authoritative documentation for every public symbol in @samline/drawer.
template: doc
sidebar:
  order: 1
---

This section documents the `@samline/drawer@4.0.1` public surface and its current runtime behavior. Start with configuration for accepted inputs, controller and registry for state ownership, or entrypoints for distribution choices.

:::note
Each registered id owns a dedicated host. Overlay and dialog content use lazy Presence, while an optional built-in trigger persists when the drawer is closed. Closing preserves the registry entry; destroying releases it.
:::

## Sections in this reference

- [Configuration](/drawer/reference/configuration/) — every `CommonDrawerOptions` and `VanillaDrawerOptions` field, including 4.0.1 defaults and deprecated aliases.
- [API](/drawer/reference/api/) — complete signatures and examples for every public function.
- [Controller and registry](/drawer/reference/controller/) — instance methods, id-based helpers, return values, headless state, and synchronization rules.
- [Entrypoints and module formats](/drawer/reference/entrypoints/) — ESM, CommonJS, browser namespace, IIFE, and stylesheet exports.
- [TypeScript](/drawer/reference/typescript/) — root type exports, structural shapes, constants, and the browser-only API type.
- [Browser / CDN](/drawer/reference/browser/) — browser namespace module plus separate CSS + JS CDN setup for `window.Drawer`.
- [CSS styling](/drawer/reference/css-styling/) — the full DOM/data-attribute contract, inline writes, and global effect ownership.
- [Recipes](/drawer/reference/examples/) — end-to-end patterns grouped by task.

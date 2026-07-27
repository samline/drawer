---
title: Reference
description: Authoritative documentation for every public symbol in @samline/drawer.
template: doc
sidebar:
  order: 1
---

This section documents the complete public surface of `@samline/drawer`. Pages are grouped by concept — configuration, API, types, browser usage, styling, and examples — so you can scan to what you need without diving into the source.

:::note
If you add a new page under `src/content/docs/reference/`, declare its `slug` inside the `sidebar` array in `site.config.mjs` to control its position.
:::

## Sections in this reference

- [Configuration](/drawer/reference/configuration/) — every `CommonDrawerOptions` and `VanillaDrawerOptions` field, with defaults and rationale.
- [API](/drawer/reference/api/) — method-by-method signatures, parameters, return shapes, and behaviour tables.
- [TypeScript](/drawer/reference/typescript/) — every exported type, callback signature, and helper return shape.
- [Browser global](/drawer/reference/browser/) — the `window.Drawer` IIFE for no-bundler setups (Shopify, WordPress, classic templates).
- [CSS styling](/drawer/reference/css-styling/) — recipes for the data-attribute contract the stylesheet reads.
- [Examples](/drawer/reference/examples/) — end-to-end recipes for common real-world scenarios.

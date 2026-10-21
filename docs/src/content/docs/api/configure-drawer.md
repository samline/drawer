---
locale: en
title: 'configureDrawer — removed in v5'
description: 'configureDrawer was removed in Drawer 5. Use the owned controller API; this historical URL explains its replacement.'
sidebar:
  hidden: true
  group: api
  order: 2
---

## Removed in version 5

`configureDrawer` is no longer exported. createDrawer(options) for creation; keep the returned controller and use drawer.update(options) for changes.

## Replacement

Use the [controller API](../../reference/controller/) and [registry inspection](../../reference/controller/#registry-inspection). The [changelog](../../changelog/) contains the complete v5 breaking changes.

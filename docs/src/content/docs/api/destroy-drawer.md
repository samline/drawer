---
locale: en
title: 'destroyDrawer — removed in v5'
description: 'destroyDrawer was removed in Drawer 5. Use the owned controller API; this historical URL explains its replacement.'
sidebar:
  hidden: true
  group: api
  order: 11
---

## Removed in version 5

`destroyDrawer` is no longer exported. getDrawer(id)?.destroy(), or keep the owned controller and call drawer.destroy().

## Replacement

Use the [controller API](../../reference/controller/) and [registry inspection](../../reference/controller/#registry-inspection). The [changelog](../../changelog/) contains the complete v5 breaking changes.

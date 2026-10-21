---
locale: en
title: 'openDrawer — removed in v5'
description: 'openDrawer was removed in Drawer 5. Use the owned controller API; this historical URL explains its replacement.'
sidebar:
  hidden: true
  group: api
  order: 3
---

## Removed in version 5

`openDrawer` is no longer exported. getDrawer(id)?.setOpen(true). Create a new instance explicitly with createDrawer().

## Replacement

Use the [controller API](../../reference/controller/) and [registry inspection](../../reference/controller/#registry-inspection). The [changelog](../../changelog/) contains the complete v5 breaking changes.

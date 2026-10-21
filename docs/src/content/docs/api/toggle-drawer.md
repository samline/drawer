---
locale: en
title: 'toggleDrawer — removed in v5'
description: 'toggleDrawer was removed in Drawer 5. Use the owned controller API; this historical URL explains its replacement.'
sidebar:
  hidden: true
  group: api
  order: 5
---

## Removed in version 5

`toggleDrawer` is no longer exported. Look up the controller, read getSnapshot().state.isOpen and pass its inverse to setOpen().

## Replacement

Use the [controller API](../../reference/controller/) and [registry inspection](../../reference/controller/#registry-inspection). The [changelog](../../changelog/) contains the complete v5 breaking changes.

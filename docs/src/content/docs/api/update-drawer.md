---
locale: en
title: 'updateDrawer — removed in v5'
description: 'updateDrawer was removed in Drawer 5. Use the owned controller API; this historical URL explains its replacement.'
sidebar:
  hidden: true
  group: api
  order: 6
---

## Removed in version 5

`updateDrawer` is no longer exported. getDrawer(id)?.update(options). Missing ids are not created.

## Replacement

Use the [controller API](../../reference/controller/) and [registry inspection](../../reference/controller/#registry-inspection). The [changelog](../../changelog/) contains the complete v5 breaking changes.

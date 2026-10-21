---
locale: en
title: 'closeDrawer — removed in v5'
description: 'closeDrawer was removed in Drawer 5. Use the owned controller API; this historical URL explains its replacement.'
sidebar:
  hidden: true
  group: api
  order: 4
---

## Removed in version 5

`closeDrawer` is no longer exported. getDrawer(id)?.setOpen(false). A missing id stays missing.

## Replacement

Use the [controller API](../../reference/controller/) and [registry inspection](../../reference/controller/#registry-inspection). The [changelog](../../changelog/) contains the complete v5 breaking changes.

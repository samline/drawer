---
locale: en
title: 'API reference'
titleAccent: 'reference'
description: 'The v5 public API: one drawer factory, owned controller methods, explicit registry queries, group cleanup and optional headless state.'
sidebar:
  group: reference
  order: 11
---

Start with `createDrawer()` and keep its controller. All loading modes expose this same API; a framework does not require a different factory.

<span id="createdraweroptions"></span>

## Factory

- [`createDrawer(options?)`](../../api/create-drawer/) creates one independent DOM drawer. An explicit id must be unique.

<span id="id-element-and-options"></span>
<span id="getsnapshot"></span>
<span id="setopenopen"></span>
<span id="setactivesnappointvalue"></span>
<span id="subscribelistener"></span>
<span id="updateoptions"></span>
<span id="destroy"></span>

## Controller

`setOpen`, `update`, `setActiveSnapPoint`, `getSnapshot`, `subscribe` and `destroy` cover the instance lifecycle. See [Controller and registry](../controller/) for their exact return values and cleanup.

<span id="getdrawerid"></span>
<span id="getdrawers"></span>
<span id="getparentdrawerid"></span>
<span id="getchilddrawersid"></span>

## Inspectors

- [`getDrawer(id)`](../../api/get-drawer/) returns the exact registered controller or null.
- [`getDrawers()`](../../api/get-drawers/) returns all registered controllers keyed by id.
- [`getParentDrawer(id)`](../../api/get-parent-drawer/) returns a parent or null.
- [`getChildDrawers(id)`](../../api/get-child-drawers/) returns child controllers.

<span id="destroydrawers"></span>

## Lifecycle contract

Creation registers an instance and mounts its persistent host. Opening mounts its visual subtree; closing releases modal effects and removes visual nodes after exit while preserving the instance. `destroy()` removes the instance, host, listeners and timers, clears subscriptions and makes the handle terminal. [`destroyDrawers()`](../../api/destroy-drawers/) disposes the complete registry. One controller's cleanup must not release another owner's modal effects.

<span id="common-headless-controller"></span>

<span id="createdrawercontrolleroptions"></span>

## Headless

[`createDrawerController(options?)`](../../api/create-drawer-controller/) creates observable state without a DOM or registry entry. Use it for an alternative renderer or state-only integration.

<span id="mutators"></span>
<span id="configuredraweroptions"></span>
<span id="updatedraweridoroptions-options"></span>
<span id="opendrawerid"></span>
<span id="closedrawerid"></span>
<span id="toggledrawerid"></span>
<span id="destroydrawerid"></span>
<span id="patchoptions"></span>

## Changes from v4

The aliases and implicit id-based mutators were removed. Look up an existing controller, then call its instance methods. [The changelog](../../changelog/) lists every breaking change and replacement. Historical method URLs remain migration notes.

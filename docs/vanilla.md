# Vanilla Guide

The package root is vanilla-first.

## Install

```bash
bun add @samline/drawer
```

## Import

```ts
import { createDrawer, getDrawer } from '@samline/drawer';
```

## Basic Example

```ts
import { createDrawer } from '@samline/drawer';

const drawer = createDrawer({
  direction: 'bottom',
  dismissible: true,
  triggerText: 'Open drawer',
  title: 'Drawer title',
  description: 'Drawer description',
  snapPoints: ['148px', '355px', 1],
  content: 'Drawer content',
});

drawer.setOpen(true);
```

## Current Scope

- The root entry mounts a shared drawer host automatically when a DOM is available.
- You can open the drawer either programmatically or through `triggerText` or `triggerElement`.
- `title`, `description`, and `content` accept strings, numbers, HTMLElements, or lazy functions returning HTMLElements.
- `mountElement` controls where the shared vanilla host is mounted.
- React remains the reference UI implementation that powers this first vanilla adapter.
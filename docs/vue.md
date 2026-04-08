# Vue Guide

The Vue entry is a thin wrapper over the root vanilla drawer host.

## Install

```bash
bun add @samline/drawer vue
```

## Import

```ts
import { DrawerRoot } from '@samline/drawer/vue'
```

## Basic Example

```ts
import { defineComponent, h } from 'vue'
import { DrawerRoot } from '@samline/drawer/vue'

export default defineComponent({
  setup() {
    return () =>
      h(DrawerRoot, {
        triggerText: 'Open drawer',
        title: 'Drawer title',
        description: 'Drawer description',
        content: 'Drawer content',
        direction: 'bottom'
      })
  }
})
```

## Current Scope

- Vue currently synchronizes the shared vanilla drawer host.
- The React adapter remains the canonical behavior target while runtime extraction continues.
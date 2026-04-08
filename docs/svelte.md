# Svelte Guide

The Svelte entry exposes an action-style wrapper over the shared vanilla drawer host.

## Install

```bash
bun add @samline/drawer svelte
```

## Import

```ts
import { drawer } from '@samline/drawer/svelte'
```

## Basic Example

```svelte
<script lang="ts">
  import { drawer } from '@samline/drawer/svelte'

  const options = {
    triggerText: 'Open drawer',
    title: 'Drawer title',
    description: 'Drawer description',
    content: 'Drawer content',
    direction: 'bottom'
  }
</script>

<span use:drawer={options} hidden aria-hidden="true" />
```

## Current Scope

- Svelte currently drives the shared vanilla drawer host.
- This keeps the package root authoritative while framework-specific adapters expand incrementally.
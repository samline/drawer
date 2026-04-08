# React Guide

React remains the reference UI implementation during the migration.

## Install

```bash
bun add @samline/drawer
```

## Import

```tsx
import { Drawer } from '@samline/drawer/react';
```

## Basic Example

```tsx
import { Drawer } from '@samline/drawer/react';

export function Example() {
  return (
    <Drawer.Root>
      <Drawer.Trigger>Open drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Title>Title</Drawer.Title>
          <Drawer.Description>Description</Drawer.Description>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

## Notes

- The package root is reserved for the vanilla-first API.
- The React adapter is the canonical behavior target for all future framework adapters.
- Existing drawer behaviors are preserved here first, then replicated elsewhere.
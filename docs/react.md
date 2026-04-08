# React

Use the React entry when you want the full component model with the original drawer composition API and the shared imperative helpers.

## Install

```bash
bun add @samline/drawer react react-dom
```

## Basic Usage

```tsx
import { Drawer, openDrawer } from '@samline/drawer/react';

export function Example() {
  return (
    <Drawer.Root>
      <Drawer.Trigger>Open drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Title>Filters</Drawer.Title>
          <Drawer.Description>Adjust the visible results.</Drawer.Description>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

openDrawer();
```

## Complete Example

```tsx
import { useState } from 'react';
import { Drawer } from '@samline/drawer/react';

export function FiltersDrawer() {
  const [open, setOpen] = useState(false);
  const [snapPoint, setSnapPoint] = useState<string | number | null>('155px');

  return (
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      snapPoints={['155px', '500px', 1]}
      activeSnapPoint={snapPoint}
      setActiveSnapPoint={setSnapPoint}
      shouldScaleBackground
      onRelease={(_, nextOpen) => {
        console.log('drawer open after release:', nextOpen);
      }}
    >
      <Drawer.Trigger>Open filters</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Handle />
          <Drawer.Title>Filters</Drawer.Title>
          <Drawer.Description>Adjust the visible results.</Drawer.Description>
          <button type="button" onClick={() => setSnapPoint(1)}>
            Expand
          </button>
          <Drawer.NestedRoot>
            <Drawer.Trigger>Open nested drawer</Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay />
              <Drawer.Content>
                <Drawer.Title>Nested drawer</Drawer.Title>
                <Drawer.Description>Secondary content.</Drawer.Description>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.NestedRoot>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

## Customization

`Drawer.Root` supports the shared drawer options plus React-specific hooks into the interaction lifecycle:

- `onOpenChange`
- `onDrag`
- `onRelease`
- `onClose`
- `container`
- `onAnimationEnd`
- `setActiveSnapPoint`

Use `handleOnly` together with `Drawer.Handle` when drag should start only from the handle.

## Notes

- `Drawer.NestedRoot` must be rendered inside another drawer.
- The React adapter is the canonical component implementation and the best choice when you need multiple independent drawers.
- The React entry also re-exports `createDrawer`, `getDrawer`, `getDrawers`, `getParentDrawer`, `getChildDrawers`, `updateDrawer`, `openDrawer`, `closeDrawer`, `toggleDrawer`, `destroyDrawer`, `destroyDrawers`, and `createDrawerController`.
- Use the root package only when you prefer the shared mounted-runtime API over direct component composition.
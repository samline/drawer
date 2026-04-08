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

## Component Surface

- `Drawer.Trigger` opens the drawer.
- `Drawer.Portal` portals overlay and content.
- `Drawer.Overlay` renders the backdrop.
- `Drawer.Content` renders the draggable surface.
- `Drawer.Handle` renders the handle and accepts `preventCycle` when clicking the handle should not advance snap points.
- `Drawer.Close` closes the drawer.
- `Drawer.Title` and `Drawer.Description` provide accessible labeling.
- `Drawer.NestedRoot` creates a nested drawer that coordinates transforms with its parent.

## Interaction Details

- `onDrag(event, percentageDragged)` and `onRelease(event, nextOpen)` are the React equivalents of the mounted-runtime callbacks `onDragChange` and `onReleaseChange`.
- `Drawer.Handle` cycles to the next snap point on click or tap. A long press cancels that cycle so dragging can begin. Set `preventCycle` when the handle should only drag.
- Add `data-drawer-no-drag` to a descendant inside `Drawer.Content` when that element should keep pointer gestures instead of starting a drawer drag.
- When `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the page shell element that should scale behind the drawer.

## Notes

- `Drawer.NestedRoot` must be rendered inside another drawer.
- Use the React entry when you want direct component composition and React-native control over the drawer tree.
- The React entry also re-exports `createDrawer`, `getDrawer`, `getDrawers`, `getParentDrawer`, `getChildDrawers`, `updateDrawer`, `openDrawer`, `closeDrawer`, `toggleDrawer`, `destroyDrawer`, `destroyDrawers`, and `createDrawerController`.
- Use the root package only when you prefer the shared mounted-runtime API over direct component composition.
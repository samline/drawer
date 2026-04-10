# React

Use the React entry when you want the full component model with the original drawer composition API and the shared imperative helpers.

## Install

```bash
bun add @samline/drawer react react-dom
```

## Basic Usage

```tsx
import '@samline/drawer/styles.css'
import { Drawer } from '@samline/drawer/react'

export function Example() {
  return (
    <Drawer.Root direction='bottom'>
      <Drawer.Trigger>Open drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Handle />
          <Drawer.Title>Drawer title</Drawer.Title>
          <Drawer.Description>Drawer description</Drawer.Description>
          <p>Drawer content</p>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

That is the same basic drawer used across the other entrypoints. If you want the polished bottom-sheet demo, keep the visual shell below unchanged and only swap the framework syntax.

## Styled Bottom Sheet Example

```css
.drawer-demo-trigger {
  appearance: none;
  background: #111827;
  border: 0;
  border-radius: 9999px;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  padding: 12px 18px;
}

.drawer-demo-overlay {
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.drawer-demo-content {
  background: #f3f4f6;
  border-radius: 40px 40px 0 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  height: fit-content;
  left: 0;
  margin-top: 6rem;
  outline: none;
  position: fixed;
  right: 0;
  z-index: 100;
}

.drawer-custom-handle {
  margin: 12px auto;
  height: 8px;
  width: 48px;
  border-radius: 9999px;
  background-color: #ec4899;
  cursor: pointer;
}

.drawer-demo-panel {
  background: #ffffff;
  border-radius: 40px 40px 0 0;
  flex: 1;
  padding: 40px 20px;
}

.drawer-inner-container {
  max-width: 28rem;
  margin: 0 auto;
}

.drawer-title {
  margin: 0 0 16px;
  font-size: 30px;
  line-height: 36px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #111827;
}

.drawer-description {
  margin: 0 0 16px;
  color: #4b5563;
  font-size: 16px;
  line-height: 28px;
}

.drawer-text {
  margin: 0 0 8px;
  color: #374151;
}

.drawer-demo-footer {
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
  padding: 20px;
}

.drawer-demo-links {
  display: flex;
  font-size: 12px;
  gap: 24px;
  justify-content: flex-end;
  margin: 0 auto;
  max-width: 28rem;
}

.drawer-demo-links a {
  color: #4b5563;
  text-decoration: none;
}
```

```tsx
import '@samline/drawer/styles.css'
import { Drawer } from '@samline/drawer/react'

export function StyledDrawerExample() {
  return (
    <div data-drawer-wrapper='' id='app-shell'>
      <main>App shell</main>
      <Drawer.Root direction='bottom' handleOnly>
        <Drawer.Trigger asChild>
          <button className='drawer-demo-trigger' type='button'>
            Open drawer
          </button>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className='drawer-demo-overlay' />
          <Drawer.Content className='drawer-demo-content' aria-labelledby='title' aria-describedby='description'>
            <Drawer.Handle className='drawer-custom-handle' />
            <div className='drawer-demo-panel'>
              <div className='drawer-inner-container'>
                <Drawer.Title className='drawer-title' id='title'>
                  A controlled drawer.
                </Drawer.Title>
                <Drawer.Description className='drawer-description' id='description'>
                  This mirrors the same bottom-sheet demo across every framework adapter.
                </Drawer.Description>
                <p className='drawer-text'>
                  Use the same overlay, panel, and handle styles so the drawer looks identical no matter which adapter
                  mounts it.
                </p>
                <p className='drawer-text'>
                  Only the integration syntax changes. The visible result, copy, and layout stay the same.
                </p>
              </div>
            </div>
            <div className='drawer-demo-footer'>
              <div className='drawer-demo-links'>
                <a href='https://github.com/samline/drawer' rel='noreferrer' target='_blank'>
                  GitHub
                </a>
                <a href='https://github.com/samline/drawer/issues' rel='noreferrer' target='_blank'>
                  Issues
                </a>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}
```

That example matches the same overlay, panel, handle, copy, and footer structure used in the other framework docs. The only difference is React's component composition API.

## Advanced Controlled Example

```tsx
import { useState } from 'react'
import { Drawer } from '@samline/drawer/react'

export function FiltersDrawer() {
  const [open, setOpen] = useState(false)
  const [snapPoint, setSnapPoint] = useState<string | number | null>('180px')

  return (
    <div data-drawer-wrapper='' id='app-shell'>
      <main>App shell</main>
      <Drawer.Root
        open={open}
        onOpenChange={setOpen}
        direction='bottom'
        snapPoints={['180px', '420px', 1]}
        activeSnapPoint={snapPoint}
        setActiveSnapPoint={setSnapPoint}
        shouldScaleBackground
        onRelease={(_, nextOpen) => {
          console.log('drawer open after release:', nextOpen)
        }}
      >
        <Drawer.Trigger>Open filters</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay />
          <Drawer.Content>
            <Drawer.Handle />
            <Drawer.Title>Filters</Drawer.Title>
            <Drawer.Description>Adjust the visible results.</Drawer.Description>
            <button type='button' onClick={() => setSnapPoint(1)}>
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
    </div>
  )
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

Pass `className` to `Drawer.Overlay`, `Drawer.Content`, `Drawer.Handle`, `Drawer.Title`, and `Drawer.Description` when you want React to match the same styled shell shown in the other docs.

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
- The React entry already pulls in the shared runtime styles internally. The explicit `@samline/drawer/styles.css` import in the examples is optional, but it keeps the cross-framework snippets visually aligned and makes the dependency obvious.
- The React entry also re-exports `createDrawer`, `getDrawer`, `getDrawers`, `getParentDrawer`, `getChildDrawers`, `updateDrawer`, `openDrawer`, `closeDrawer`, `toggleDrawer`, `destroyDrawer`, `destroyDrawers`, and `createDrawerController`.
- Use the root package only when you prefer the shared mounted-runtime API over direct component composition.

## Cleanup Guidance

Unmounting the React component tree cleans up the React-owned drawer lifecycle. If you also use the imperative helpers re-exported from the React entry, those helpers still target the shared runtime registry from the root package and follow the same explicit `destroyDrawer(id)` and `destroyDrawers()` cleanup rules as the vanilla API.

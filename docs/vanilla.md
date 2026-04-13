# Vanilla JS

Use the root entry when you want a programmatic API with named instances and shared runtime helpers.

## Install

```bash
bun add @samline/drawer
```

## Basic Usage

```ts
import '@samline/drawer/styles.css'
import { createDrawer } from '@samline/drawer'

document.querySelector('#app-shell')?.setAttribute('data-drawer-wrapper', '')

createDrawer({
  id: 'filters',
  triggerText: 'Open drawer',
  showHandle: true,
  direction: 'bottom',
  title: 'Drawer title',
  description: 'Drawer description',
  content: 'Drawer content'
})
```

That basic example proves the runtime, but it does not ship a finished bottom-sheet theme. `triggerText` renders a built-in button inside the mounted host, and when `mountElement` is omitted that host is appended to `document.body`. That is why the trigger can appear at the end of the page while the surface still looks mostly unstyled.

If you want the vanilla entry to look like a polished drawer demo, keep the runtime API and add your own shell styles with `triggerElement`, `overlayClassName`, and `contentClassName`.

In the styled example below, `showHandle` is omitted on purpose. The mounted host already renders the built-in handle when `handleOnly` is `true`, so adding `showHandle: true` there would be redundant. Keep `showHandle` for cases where you want the handle visible without restricting drag to the handle only.

## Styled Complete Example

```html
<div data-drawer-wrapper id="app-shell">
  <main>App shell</main>
  <button id="open-drawer" class="drawer-demo-trigger" type="button">Open drawer</button>
</div>
```

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

```ts
import '@samline/drawer/styles.css'
import { createDrawer } from '@samline/drawer'

const trigger = document.getElementById('open-drawer')
const drawerId = 'controlled-drawer'
const titleId = `${drawerId}-title`
const descriptionId = `${drawerId}-description`

if (!(trigger instanceof HTMLElement)) {
  throw new Error('Missing #open-drawer trigger element.')
}

const drawer = createDrawer({
  id: drawerId,
  triggerElement: trigger,
  direction: 'bottom',
  handleOnly: true,
  overlayClassName: 'drawer-demo-overlay',
  contentClassName: 'drawer-demo-content',
  handleClassName: 'drawer-custom-handle',
  ariaLabelledBy: titleId,
  ariaDescribedBy: descriptionId,
  content: function () {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
          <div class="drawer-demo-panel">
            <div class="drawer-inner-container">
              <h2 id="${titleId}" class="drawer-title">
                A controlled drawer.
              </h2>
              <p id="${descriptionId}" class="drawer-description">
                This mirrors the same bottom-sheet demo across every framework adapter.
              </p>
              <p class="drawer-text">
                Use the same overlay, panel, and handle styles so the drawer looks identical no matter which adapter mounts it.
              </p>
              <p class="drawer-text">
                Only the integration syntax changes. The visible result, copy, and layout stay the same.
              </p>
            </div>
          </div>
          <div class="drawer-demo-footer">
            <div class="drawer-demo-links">
              <a href="https://github.com/samline/drawer" target="_blank" rel="noreferrer">GitHub</a>
              <a href="https://github.com/samline/drawer/issues" target="_blank" rel="noreferrer">Issues</a>
            </div>
          </div>
        `
    return wrapper
  }
})

drawer.subscribe((snapshot) => {
  console.log(snapshot.state.isOpen, snapshot.state.activeSnapPoint)
})
```

If you later add `snapPoints` to a vanilla drawer, make sure the drawer shell is tall enough to reach those positions. Snap point offsets are measured from the viewport size, not from the content's natural height, so a short panel can end up fully off-screen while the overlay still opens.

## Common Patterns

- Pass `id` when you need more than the default runtime instance.
- Pass `parentId` when this drawer should follow another drawer's lifecycle.
- Pass `triggerText` to render a built-in button inside the mounted host.
- Pass `showHandle` to render the built-in handle in the mounted host.
- `showHandle` is optional when `handleOnly` is enabled. `handleOnly` already renders the built-in handle and also restricts dragging to that handle.
- Pass `triggerElement` when the trigger should stay in your own DOM tree.
- Pass `mountElement` when the host should live inside a specific DOM subtree instead of being appended to `document.body`.
- Pass `overlayClassName`, `contentClassName`, and `handleClassName` when you want a visible shell instead of only the shared runtime styles.
- If you enable `handleOnly`, the built-in handle is rendered automatically so the drawer keeps a visible drag affordance.
- Use `update()` or `updateDrawer()` when you want to merge new options into the same instance.

If `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the app shell element that should scale behind the drawer.

If a child node inside your rendered content should not start a drag gesture, add `data-drawer-no-drag` to that element.

Use `title` and `description` when a simple heading block above the body content is enough. If your drawer body defines its own card, panel, or header layout, render that heading block inside `content` so it stays inside the same visual shell.

If the surface should not render any top-level title or description at all, provide `ariaLabel` or `ariaLabelledBy` so the dialog still has an accessible name. Use `ariaDescribedBy` when the accessible description should come from an element inside your custom content. When description is omitted, the mounted host opts out of `aria-describedby` automatically unless you pass `ariaDescribedBy` yourself.

When you point `ariaLabelledBy` or `ariaDescribedBy` at custom content, make those ids unique per drawer instance. A good default is to derive them from the drawer `id`, as in the example above.

## Runtime Helpers

```ts
import { closeDrawer, createDrawer, getChildDrawers, getDrawers, openDrawer } from '@samline/drawer'

createDrawer({ id: 'account', title: 'Account', content: 'Primary drawer' })
createDrawer({ id: 'security', parentId: 'account', title: 'Security', content: 'Nested drawer' })

openDrawer('account')
console.log(Object.keys(getDrawers()))
console.log(getChildDrawers('account').map((drawer) => drawer.id))
closeDrawer('account')
```

## Lifecycle and Cleanup

```ts
import { createDrawer, destroyDrawer, getDrawer } from '@samline/drawer'

createDrawer({ title: 'Draft', content: 'Unsaved changes' })

getDrawer()?.setOpen(true)

destroyDrawer()
```

`destroyDrawer()` tears down the selected instance. Use `destroyDrawers()` when you want to clear the entire runtime registry.

Treat the vanilla API as an owned lifecycle. If an app creates drawers dynamically, swaps ids, or rebuilds sections of the page over time, the matching runtime instance should be destroyed explicitly so the shared registry can release it.

## Integration Notes

- `title`, `description`, and `content` accept strings, numbers, `HTMLElement`, functions returning `HTMLElement`, `null`, or `undefined`.
- Use `ariaLabel` or `ariaLabelledBy` for drawers like galleries or custom shells that should not render a top-level title node.
- `title` and `description` are rendered before `content` inside the shared vanilla content wrapper.
- `@samline/drawer/styles.css` provides the shared runtime animations, transforms, and handle styles. It does not provide a complete overlay or panel theme for your app.
- When `mountElement` is omitted, the vanilla host is created automatically and appended to `document.body`.
- The root entry exposes the mounted shared host through a programmatic API instead of framework-specific component composition.
- Reusing the same `id` updates the same runtime instance. It does not create a second drawer.

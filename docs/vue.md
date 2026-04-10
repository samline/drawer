# Vue

Use the Vue entry when you want Vue-friendly props and optional plugin installation while still targeting the shared runtime.

## Install

```bash
bun add @samline/drawer vue
```

## Basic Usage

```vue
<script setup lang="ts">
import '@samline/drawer/styles.css'
import { DrawerRoot } from '@samline/drawer/vue'
</script>

<template>
  <DrawerRoot
    trigger-text="Open drawer"
    :show-handle="true"
    direction="bottom"
    title="Drawer title"
    description="Drawer description"
    content="Drawer content"
  />
</template>
```

That is the same basic drawer used across the other entrypoints. If you want the polished bottom-sheet demo, keep the visual shell below unchanged and only swap the framework syntax.

## Styled Bottom Sheet Example

```vue
<script setup lang="ts">
import '@samline/drawer/styles.css'
import { ref } from 'vue'
import { DrawerRoot } from '@samline/drawer/vue'

const trigger = ref<HTMLButtonElement | null>(null)

function createStyledContent() {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = `
    <div class="drawer-demo-panel">
      <div class="drawer-inner-container">
        <h2 id="title" class="drawer-title">
          A controlled drawer.
        </h2>
        <p id="description" class="drawer-description">
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
</script>

<template>
  <div data-drawer-wrapper="" id="app-shell">
    <main>App shell</main>
    <button ref="trigger" class="drawer-demo-trigger" type="button">Open drawer</button>
  </div>

  <DrawerRoot
    id="controlled-drawer"
    :trigger-element="trigger"
    direction="bottom"
    :handle-only="true"
    overlay-class-name="drawer-demo-overlay"
    content-class-name="drawer-demo-content"
    handle-class-name="drawer-custom-handle"
    aria-labelled-by="title"
    aria-described-by="description"
    :content="createStyledContent"
  />
</template>

<style>
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
</style>
```

That example matches the same overlay, panel, handle, copy, and footer structure used in the other framework docs. The only difference is that Vue drives the mounted host through `DrawerRoot` props instead of rendering a separate component tree for the panel internals.

## Advanced Controlled Example

```vue
<script setup lang="ts">
import '@samline/drawer/styles.css'
import { onMounted } from 'vue'
import { DrawerRoot, getDrawer } from '@samline/drawer/vue'

function handleRelease(open: boolean) {
  console.log('drawer open after release:', open)
}

onMounted(() => {
  getDrawer('filters')?.subscribe((snapshot) => {
    console.log(snapshot.state.isOpen, snapshot.state.activeSnapPoint)
  })
})
</script>

<template>
  <div data-drawer-wrapper="" id="app-shell">
    <main>App shell</main>
  </div>

  <DrawerRoot
    id="filters"
    trigger-text="Open filters"
    direction="bottom"
    title="Filters"
    description="Adjust the visible results."
    content="Drawer content"
    :snap-points="['180px', '420px', 1]"
    :should-scale-background="true"
    :on-release-change="handleRelease"
  />
</template>
```

## Common Patterns

- Pass `id` when the Vue wrapper should own a specific runtime instance.
- Pass `parentId` when the wrapper should behave as a child of another drawer instance.
- Pass `triggerText` when the shared host should render the built-in button for you.
- Pass `triggerElement` when you want an external button and the same custom shell used in the styled example above.
- Pass `showHandle` when the shared host should render the built-in handle.
- Render `DrawerRoot` once near the part of the app that owns the selected drawer id.
- Install `DrawerPlugin` if you want `DrawerRoot` registered globally and access to `$drawer` or the `drawer:api` injection key.
- Update props reactively to reconfigure the same runtime instance.
- Pass `content` as a string, `HTMLElement`, or function returning `HTMLElement` when you need a custom panel layout.

If `handleOnly` is enabled, the shared host renders the built-in handle automatically.

If `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the app shell element that should scale behind the drawer.

If custom content includes controls that should keep their own pointer gestures, add `data-drawer-no-drag` to those elements.

Use `title` and `description` when the wrapper should render a simple accessible heading block above the body. If the visible panel needs its own internal header layout, include that header inside `content` instead.

If the Vue wrapper should not render any top-level title or description, pass `ariaLabel` or `ariaLabelledBy` so the dialog still has an accessible name. Use `ariaDescribedBy` when the description comes from an element inside custom content. When description is omitted, the mounted host opts out of `aria-describedby` automatically unless you pass `ariaDescribedBy` yourself.

## Lifecycle and Cleanup

- `DrawerRoot` synchronizes props into the shared runtime on mount and on prop updates.
- Unmounting `DrawerRoot` calls `destroyDrawer(id)`, so it should be treated as the owner of the selected runtime instance.
- Changing the `id` prop transfers ownership to the new runtime instance and destroys the previous one.

## Integration Notes

- Vue drives the shared mounted host through props instead of rendering a separate Vue-native drawer tree.
- `title` and `description` are rendered before `content` inside the shared vanilla content wrapper used by the mounted host.
- The styled example uses `content` as a function returning an `HTMLElement` so the panel markup can stay identical to the mounted-host demos in the other docs.
- Reusing the same `id` from multiple Vue wrappers intentionally targets the same instance, so ownership should stay clear at the app level.


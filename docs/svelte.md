# Svelte

Use the Svelte entry when you want a Svelte action or an imperative `mountDrawer()` helper over the shared runtime.

## Install

```bash
bun add @samline/drawer svelte
```

## Basic Usage

```svelte
<script lang="ts">
  import '@samline/drawer/styles.css'
  import { drawer } from '@samline/drawer/svelte'

  const options = {
    triggerText: 'Open drawer',
    showHandle: true,
    direction: 'bottom',
    title: 'Drawer title',
    description: 'Drawer description',
    content: 'Drawer content'
  }
</script>

<span use:drawer={options} hidden aria-hidden="true" />
```

That is the same basic drawer used across the other entrypoints. If you want the polished bottom-sheet demo, keep the visual shell below unchanged and only swap the framework syntax.

In the styled example below, `showHandle` is omitted on purpose. The Svelte action forwards to the mounted host, and that host already renders the built-in handle when `handleOnly` is `true`, so adding `showHandle: true` there would be redundant. Keep `showHandle` for cases where you want the handle visible without restricting drag to the handle only.

## Styled Bottom Sheet Example

```svelte
<script lang="ts">
  import '@samline/drawer/styles.css'
  import { drawer } from '@samline/drawer/svelte'

  let trigger: HTMLButtonElement | null = null
  const drawerId = 'controlled-drawer'
  const titleId = `${drawerId}-title`
  const descriptionId = `${drawerId}-description`

  function createStyledContent() {
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

  $: options = {
    id: drawerId,
    triggerElement: trigger,
    direction: 'bottom',
    handleOnly: true,
    overlayClassName: 'drawer-demo-overlay',
    contentClassName: 'drawer-demo-content',
    handleClassName: 'drawer-custom-handle',
    ariaLabelledBy: titleId,
    ariaDescribedBy: descriptionId,
    content: createStyledContent
  }
</script>

<div data-drawer-wrapper="" id="app-shell">
  <main>App shell</main>
  <button bind:this={trigger} class="drawer-demo-trigger" type="button">
    Open drawer
  </button>
</div>

<span use:drawer={options} hidden aria-hidden="true" />

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

That example matches the same overlay, panel, handle, copy, and footer structure used in the other framework docs. The only difference is that Svelte uses an action to drive the mounted host.

## Advanced Controlled Example

```svelte
<script lang="ts">
  import '@samline/drawer/styles.css'
  import { onMount } from 'svelte'
  import { drawer, getDrawer, mountDrawer } from '@samline/drawer/svelte'

  const options = {
    id: 'filters',
    triggerText: 'Open filters',
    direction: 'bottom',
    title: 'Filters',
    description: 'Adjust the visible results.',
    content: 'Drawer content',
    snapPoints: ['180px', '420px', 1],
    shouldScaleBackground: true,
    onReleaseChange(open: boolean) {
      console.log('drawer open after release:', open)
    }
  }

  function openFromCode() {
    mountDrawer(options)
    getDrawer('filters')?.setOpen(true)
  }

  onMount(() => {
    return getDrawer('filters')?.subscribe((snapshot) => {
      console.log(snapshot.state.isOpen, snapshot.state.activeSnapPoint)
    })
  })
</script>

<div data-drawer-wrapper="" id="app-shell">
  <main>App shell</main>
</div>

<button type="button" on:click={openFromCode}>Open from code</button>
<span use:drawer={options} hidden aria-hidden="true" />
```

## Common Patterns

- Pass `id` when the Svelte component should own a specific runtime instance.
- Pass `parentId` when the action should behave as a child drawer.
- Pass `triggerText` when the shared host should render the built-in button for you.
- Pass `triggerElement` when you want an external button and the same custom shell used in the styled example above.
- Pass `showHandle` when the shared host should render the built-in handle.
- `showHandle` is optional when `handleOnly` is enabled. `handleOnly` already renders the built-in handle and also restricts dragging to that handle.
- Use the `drawer` action when the Svelte component should own the selected drawer lifecycle.
- Use `mountDrawer()` when you want to mount or refresh the same instance imperatively.
- Use `getDrawer()` to read the current controller and open or reconfigure it from event handlers.
- Pass `content` as a string, `HTMLElement`, or function returning `HTMLElement` when you need a custom panel layout.

If `handleOnly` is enabled, the shared host renders the built-in handle automatically.

If `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the app shell element that should scale behind the drawer.

If custom content includes controls that should keep their own pointer gestures, add `data-drawer-no-drag` to those elements.

Use `title` and `description` when you want the shared host to render a simple heading block above the body content. If the drawer needs a custom internal header or panel shell, render that heading block inside `content` instead.

If the Svelte wrapper should not render any top-level title or description, pass `ariaLabel` or `ariaLabelledBy` so the dialog still has an accessible name. Use `ariaDescribedBy` when the description comes from an element inside custom content. When description is omitted, the mounted host opts out of `aria-describedby` automatically unless you pass `ariaDescribedBy` yourself.

When you point those props at custom content, make the referenced ids unique per drawer instance. Deriving them from the drawer `id` is the safest default.

## Lifecycle and Cleanup

- The action calls `createDrawer()` immediately and updates the selected runtime instance when its value changes.
- Destroying the action calls `destroyDrawer(id)`, which tears down that instance.
- Updating the action to a different `id` destroys the previously owned runtime instance before creating the next one.

## Integration Notes

- The Svelte entry drives the shared mounted host through an action or `mountDrawer()` helper instead of rendering a separate Svelte-native drawer tree.
- `title` and `description` are rendered before `content` inside the shared vanilla content wrapper used by the mounted host.
- The styled example uses a content factory and a real `triggerElement` so the rendered shell can stay identical to the mounted-host demos in the other docs.
- As with Vue and the browser entry, it targets the same shared runtime used by the root package.


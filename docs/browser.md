# Browser Guide

The browser entry is the first non-React-facing migration layer. It exposes the package surface on `window.Drawer`.

## Import

```html
<script type="module">
  import '@samline/drawer/browser';

  console.log(window.Drawer);
</script>
```

## Current Scope

- Exposes the root vanilla API globally.
- Mirrors the package root surface in browser environments.
- Mounts the same shared vanilla drawer host used by the package root.
- The repository uses Bun and Vitest as the active tooling baseline.
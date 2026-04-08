# Drawer

A universal drawer package for React, Vue, Svelte, vanilla JS, and browser usage.

This repository is the home of `@samline/drawer`.

The root entry is vanilla-first. React lives in the explicit `@samline/drawer/react` adapter, matching the package surface strategy used by Notify.
Vue and Svelte currently ship as thin wrappers over the same shared vanilla drawer host.

## Installation

```bash
npm install @samline/drawer
```

```bash
bun add @samline/drawer
```

## Entrypoints

| Entrypoint | Purpose |
| --- | --- |
| `@samline/drawer` | Primary vanilla entry |
| `@samline/drawer/react` | Explicit React adapter |
| `@samline/drawer/browser` | Browser global entry that exposes the vanilla API on `window.Drawer` |
| `@samline/drawer/vue` | Vue wrapper over the shared vanilla drawer host |
| `@samline/drawer/svelte` | Svelte action-style wrapper over the shared vanilla drawer host |
| `@samline/drawer/core` | Shared drawer contracts and controller primitives |
| `@samline/drawer/styles.css` | Shared styles export |

## Current Status

Drawer now ships as a shared multi-entry package with a vanilla-first root and framework-specific secondary adapters.

- The root package is vanilla-first, as in Notify.
- React remains the canonical UI implementation while adapter parity continues to expand.
- The new `core` entry currently exposes shared contracts and a minimal controller.
- The new root entry exposes a shared controller-based vanilla API.
- The new `browser` entry exposes the vanilla API on `window.Drawer`.
- Vue and Svelte entrypoints now synchronize the same shared vanilla drawer host.
- The repo now targets Bun for package management and Vitest for automated tests.

## Vanilla Usage

```ts
import { createDrawer, getDrawer } from '@samline/drawer';

createDrawer({
	direction: 'bottom',
	dismissible: true,
	triggerText: 'Open drawer',
	title: 'Drawer title',
	description: 'Drawer description',
	content: 'Drawer content',
});

const drawer = getDrawer();
drawer?.setOpen(true);
```

## React Usage

```tsx
import { Drawer } from '@samline/drawer/react';

export function Example() {
	return (
		<Drawer.Root>
			<Drawer.Trigger>Open</Drawer.Trigger>
			<Drawer.Portal>
				<Drawer.Overlay />
				<Drawer.Content>Content</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}
```

## Vue Usage

```ts
import { defineComponent, h } from 'vue';
import { DrawerRoot } from '@samline/drawer/vue';

export default defineComponent({
	setup() {
		return () =>
			h(DrawerRoot, {
				triggerText: 'Open drawer',
				title: 'Drawer title',
				description: 'Drawer description',
				content: 'Drawer content',
				direction: 'bottom',
			});
	},
});
```

## Svelte Usage

```svelte
<script lang="ts">
	import { drawer } from '@samline/drawer/svelte';

	const options = {
		triggerText: 'Open drawer',
		title: 'Drawer title',
		description: 'Drawer description',
		content: 'Drawer content',
		direction: 'bottom',
	};
</script>

<span use:drawer={options} hidden aria-hidden="true" />
```

## Documentation

- [docs/README.md](docs/README.md)
- [docs/api.md](docs/api.md)
- [docs/vanilla.md](docs/vanilla.md)
- [docs/react.md](docs/react.md)
- [docs/browser.md](docs/browser.md)
- [docs/vue.md](docs/vue.md)
- [docs/svelte.md](docs/svelte.md)

## License

MIT


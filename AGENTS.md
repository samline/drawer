<!-- codebase-memory-mcp:start -->

For structural codebase exploration, use the installed `codebase-memory` skill.
<!-- codebase-memory-mcp:end -->

Website work: read [SITE-AGENTS.md](SITE-AGENTS.md), including its shared PageSpeed performance contract. Runtime build/test scripts stay independent of site tooling.

## Drawer 5 ownership and module boundaries

The user authorized a complete major API simplification. `createDrawer()` always creates an independent instance; explicit ids are unique, queries never create and updates never change identity. Keep the returned controller. Commands are `setOpen`, `setActiveSnapPoint` and one `update` method; they return snapshots. `destroy` is terminal and idempotent. Stale handles cannot affect a replacement using the same id. Headless controllers have the same state/update/disposal contract without registry or DOM.

Do not restore removed configure/open/close/toggle/update/destroy helpers, `patch`, browser/newDrawer/available aliases or `mountElement`. Use `container` for custom hosts. `/browser` and the IIFE expose the same seven functions as root, with an optional `Drawer` namespace. Preserve real runtime features: gestures, focus/isolation, nested ownership, snap points, keyboard viewport and scroll restoration. Complexity should stay behind the owned controller, not leak into beginner examples.

`vanilla/dialog.ts` coordinates presence and viewport lifecycle; `dialog-content` renders slots/controls, `dialog-focus` owns focus/modal isolation, `dialog-gestures` wires pointer/handle input, `dialog-layout` resolves geometry, and `dialog-background` owns scaling/restoration. `dialog-state` is type-only shared state; pure interaction math stays under runtime/. Preserve cleanup order and shared side-effect ownership when moving code. A smaller coordinator is an organization improvement, not a measured performance gain.

The v5 source, exact copied files, framework/CMS examples, root README, root changelog, docs collection, metadata and downloadable skills/drawer/SKILL.md are one release contract. Keep historical documentation fragments meaningful and removed helper pages out of current navigation. The package is prepared as 5.0.0; npm publication remains a separate maintainer action.

Lifecycle callbacks and immediate subscriptions may synchronously destroy their owner. Re-check runtime identity before rendering, notifying or scheduling timers after a consumer callback; never operate on a replacement that reuses the same id. Initial content factory failures must roll back both partial DOM and registry ownership. Regression coverage exercises these cases. TypeScript rejects unused imports/locals/parameters so extraction cannot leave abandoned plumbing behind.

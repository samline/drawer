# Bug: drawer follows the finger in the opposite of the close direction

**Filed**: 2026-07-26
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in this commit.
**Severity**: High (visibly wrong drag feel across every direction)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3`
**Fixed by**: restoring v2's logarithmic dampening (`dampenValue`),
and adding a direction check in `getDragPermission` for the
horizontal short-circuit.

---

## TL;DR

In v2 (vaul), dragging in the OPPOSITE of the close direction (e.g.
dragging a `direction: 'right'` drawer to the LEFT) was resisted with
a logarithmic dampening curve (`dampenValue(v) = 8 * (log(v + 1) - 2)`).
A 100 px drag in the wrong direction produced ~21 px of movement,
flatter than the gesture — the drawer visibly stayed near its rest
position.

v3.0.0-beta.3 replaced this with a linear `DRAG_RESISTANCE = 0.5`
factor. A 100 px drag in the wrong direction now moved the drawer
50 px in the wrong direction — half the gesture distance, the drawer
"followed the finger" across the viewport, a v2 regression the
consumer flagged immediately.

Worse, the drag-permission policy for horizontal directions
(`direction === 'left' || direction === 'right'`) returned
`{ allow: true }` unconditionally, so a drag was even allowed to
START in the wrong direction. With the v2 logarithmic curve the
wrong-direction gesture was already barely visible; in v3.0.0-beta.3
it was prominent enough to feel like a bug.

The fix restores v2 parity on two axes:
1. **`getDraggableOffset`** uses `dampenValue(magnitude) * sign * DRAG_RESISTANCE`
   (with `DRAG_RESISTANCE = 1` as the new multiplier; the logarithmic
   curve provides the actual elasticity).
2. **`getDragPermission`** honours the close-direction check for
   horizontal directions too (mirroring the existing bottom/top
   logic).

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.3` in any consumer.
2. Create a drawer with `direction: 'right'` (e.g. a settings sheet).
3. Open the drawer.
4. Drag the drawer to the LEFT (opposite of close).

**Expected**: the drawer barely moves (v2 vaul behaviour — rubber
band resistance, drawer visibly anchored to its rest position).
**Actual (pre-fix)**: the drawer slides 50 % of the gesture distance
to the left. A 250 px drag moves the drawer ~125 px to the left,
across most of the viewport.

---

## Root cause

### 1. `DRAG_RESISTANCE = 0.5` replaced `dampenValue(v)`

v2 helpers (`src/helpers.ts`):
```ts
export function dampenValue(v: number) {
  return 8 * (Math.log(v + 1) - 2)
}
```

v2 react-components:
```ts
const dampenedDraggedDistance = dampenValue(draggedDistance)
const translateValue = Math.min(
  dampenedDraggedDistance * -1,
  0
) * (direction === 'bottom' || direction === 'right' ? 1 : -1)
```

`dampenValue(100)` ≈ 20.92, `dampenValue(250)` ≈ 26.4. The curve
flattens quickly so large drags barely move further than medium drags.

v3 runtime/drag.ts:
```ts
export const DRAG_RESISTANCE = 0.5

export function getDraggableOffset({ direction, draggedDistance }) {
  const baseOffset =
    direction === 'bottom' || direction === 'right'
      ? -draggedDistance
      : draggedDistance
  const outOfBounds = !isDraggingInCloseDirection({ direction, draggedDistance })
  return outOfBounds ? baseOffset * DRAG_RESISTANCE : baseOffset
}
```

`baseOffset * 0.5` is linear. `100 px drag → 50 px movement`,
`250 px drag → 125 px movement`. Much more permissive than v2.

### 2. `getDragPermission` did not check direction for horizontal

`src/runtime/drag-policy.ts`:
```ts
if (direction === 'left' || direction === 'right') {
  return { allow: true, updatePreventedAt: false }
}
```

For bottom/top the policy explicitly checked
`isClosingSwipeOffset`; for left/right it short-circuited. This meant
the drag pipeline accepted a wrong-direction swipe as a valid drag.

Combined with the linear resistance, the wrong-direction drag became
the dominant symptom.

### 3. `isDraggingInCloseDirection` was inconsistent across directions

`src/runtime/drag.ts`:
```ts
return direction === 'bottom' || direction === 'right'
  ? draggedDistance < 0
  : draggedDistance > 0
```

For `left`/`top`, the function expected `draggedDistance > 0` to mean
"close". But `getDraggedDistance` computes `(pointerStart - currentPointer) * multiplier`,
and `(start - current)` is negative in the close direction for EVERY
direction (because the close direction reduces the drawer's visible
offset from its rest position). So the function correctly identified
close direction for `right`/`bottom`, but incorrectly flagged
`left`/`top` close-direction drags as out-of-bounds and applied
resistance. (The wrapper `getDraggableOffset` masked this bug for
horizontal directions because the linear `0.5` factor kept the wrong-
direction drag visible; the bug became obvious only after the
direction-policy check was also fixed.)

---

## Fix

### 1. Restore v2 logarithmic dampening (`src/runtime/drag.ts`)

```ts
/** Multiplier kept exported for the regression test. The actual
 *  elasticity now lives in `dampenValue`. */
export const DRAG_RESISTANCE = 1

export function dampenValue(distance: number): number {
  return 8 * (Math.log(distance + 1) - 2)
}

export function getDraggableOffset({ direction, draggedDistance }) {
  const baseOffset =
    direction === 'bottom' || direction === 'right' ? -draggedDistance : draggedDistance
  const outOfBounds = !isDraggingInCloseDirection({ direction, draggedDistance })
  if (!outOfBounds) return baseOffset
  const magnitude = dampenValue(Math.abs(baseOffset))
  return magnitude * Math.sign(baseOffset) * DRAG_RESISTANCE
}
```

A 100 px drag in the wrong direction now produces ~21 px of
movement; a 250 px drag produces ~26 px. v2 parity restored.

### 2. Direction check in the drag policy (`src/runtime/drag-policy.ts`)

```ts
if (direction === 'left' || direction === 'right') {
  // swipeAmount === null → fresh pointerdown, direction not yet known.
  // Allow the drag pipeline to start so the first pointermove can
  // decide.
  if (swipeAmount === null) {
    return { allow: true, updatePreventedAt: false }
  }
  // swipeAmount !== null → the runtime has a direction. Honour the
  // close-direction check, mirroring the bottom/top logic.
  const isClosingSwipeOffset =
    direction === 'right' ? swipeAmount < 0 : swipeAmount > 0
  if (isClosingSwipeOffset) {
    return { allow: true, updatePreventedAt: false }
  }
  return { allow: false, updatePreventedAt: false }
}
```

A wrong-direction swipe now bails out of the drag pipeline
immediately; the wrong-direction gesture falls through to the
content's own click listeners (close button, links, form inputs).

### 3. Consistent `isDraggingInCloseDirection` (`src/runtime/drag.ts`)

```ts
export function isDraggingInCloseDirection({ direction, draggedDistance }) {
  void direction
  return draggedDistance < 0
}
```

`draggedDistance < 0` is the close indicator for every direction
(documented in the function's docstring).

---

## Regression tests

### `test/drag-elastic-resistance.test.ts` (rewritten)

Pins the v2 logarithmic curve directly:

- `dampenValue(100)` ≈ 20.92 (±0.1)
- `dampenValue(200)` in (25, 30)
- `dampenValue(input) < input` for every `input >= 10`
- `dampenValue(0)` ≈ -16 (documented side effect of the curve)
- Wrong-direction drag resistance ratio at 100 px ∈ (0.15, 0.30)

Pins `getDraggableOffset` and `isDraggingInCloseDirection` for every
direction (top/bottom/left/right).

### `test/drag-direction-permission.test.ts` (new)

Pins the horizontal drag-permission policy:

- Fresh pointerdown (`swipeAmount === null`) → allow for every direction
- Close-direction swipe for `right` → allow
- Opposite-direction swipe for `right` → deny
- Close-direction swipe for `left` → allow
- Opposite-direction swipe for `left` → deny
- `data-drawer-no-drag` opt-out still denies regardless of direction

---

## Impact

- **Affected surface**: every drawer. v2 parity is a core contract;
  vaul's elastic-resistance curve is what users expect from a
  drawer.
- **Severity rationale**: the drawer visibly "following the finger"
  in the wrong direction is a regression a user feels immediately.
  The horizontal-policy bug compounded it: a swipe in the close
  direction was indistinguishable from a swipe in the opposite
  direction.
- **Detection**: open a `direction: 'right'` (or `'bottom'`)
  drawer, drag in the opposite direction by 100+ px. The drawer
  should barely move; in beta.3 it slid 50 % of the gesture.
- **Workaround before the fix**: in the consumer's CSS, add
  `transform-origin` and a fixed `transition: transform 0.5s` to mask
  the linear motion. Cosmetic only — the bug was visible during the
  drag, not just the snap-back.
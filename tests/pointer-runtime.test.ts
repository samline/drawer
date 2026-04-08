import { describe, expect, it } from 'vitest';

import { getSwipeIntent } from '../src/runtime/pointer';

describe('pointer runtime helpers', () => {
  it('preserves swipe allowance once intent boundary is reached', () => {
    expect(
      getSwipeIntent({
        delta: { x: 50, y: 2 },
        direction: 'right',
        threshold: 10,
        wasBeyondThePoint: true,
      }),
    ).toEqual({ isAllowed: true, reachedIntentBoundary: true });
  });

  it('allows early movement only in the configured axis', () => {
    expect(
      getSwipeIntent({
        delta: { x: 6, y: 1 },
        direction: 'right',
        threshold: 10,
        wasBeyondThePoint: false,
      }),
    ).toEqual({ isAllowed: true, reachedIntentBoundary: false });

    expect(
      getSwipeIntent({
        delta: { x: 1, y: 6 },
        direction: 'right',
        threshold: 10,
        wasBeyondThePoint: false,
      }),
    ).toEqual({ isAllowed: false, reachedIntentBoundary: false });
  });

  it('locks intent once the threshold is exceeded', () => {
    expect(
      getSwipeIntent({
        delta: { x: 0, y: 20 },
        direction: 'bottom',
        threshold: 10,
        wasBeyondThePoint: false,
      }),
    ).toEqual({ isAllowed: true, reachedIntentBoundary: true });
  });
});
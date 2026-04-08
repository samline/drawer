import { describe, expect, it } from 'vitest';

import { getNextHandleState } from '../src/runtime/handle';

describe('handle runtime helpers', () => {
  it('noops when interaction should not cycle', () => {
    expect(
      getNextHandleState({
        isDragging: true,
        preventCycle: false,
        shouldCancelInteraction: false,
        snapPoints: ['100px', '200px'],
        activeSnapPoint: '100px',
        dismissible: true,
      }),
    ).toEqual({ type: 'noop' });
  });

  it('closes when there are no snap points and the drawer is not dismissible', () => {
    expect(
      getNextHandleState({
        isDragging: false,
        preventCycle: false,
        shouldCancelInteraction: false,
        snapPoints: undefined,
        activeSnapPoint: null,
        dismissible: false,
      }),
    ).toEqual({ type: 'close' });
  });

  it('advances to the next snap point when available', () => {
    expect(
      getNextHandleState({
        isDragging: false,
        preventCycle: false,
        shouldCancelInteraction: false,
        snapPoints: ['100px', '200px'],
        activeSnapPoint: '100px',
        dismissible: true,
      }),
    ).toEqual({ type: 'snap', snapPoint: '200px' });
  });

  it('closes from the last snap point when dismissible', () => {
    expect(
      getNextHandleState({
        isDragging: false,
        preventCycle: false,
        shouldCancelInteraction: false,
        snapPoints: ['100px', '200px'],
        activeSnapPoint: '200px',
        dismissible: true,
      }),
    ).toEqual({ type: 'close' });
  });
});
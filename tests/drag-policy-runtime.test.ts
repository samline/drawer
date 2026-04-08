import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';

import { getDragPermission, getDragTargetMetadata } from '../src/runtime/drag-policy';

describe('drag policy runtime helpers', () => {
  it('blocks select elements and no-drag targets', () => {
    expect(
      getDragPermission({
        targetTagName: 'SELECT',
        hasNoDragAttribute: false,
        direction: 'bottom',
        timeSinceOpenMs: null,
        swipeAmount: null,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout: 100,
        isDraggingInDirection: false,
        ancestors: [],
      }),
    ).toEqual({ allow: false, updatePreventedAt: false });

    expect(
      getDragPermission({
        targetTagName: 'DIV',
        hasNoDragAttribute: true,
        direction: 'bottom',
        timeSinceOpenMs: null,
        swipeAmount: null,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout: 100,
        isDraggingInDirection: false,
        ancestors: [],
      }),
    ).toEqual({ allow: false, updatePreventedAt: false });
  });

  it('allows horizontal drawers immediately', () => {
    expect(
      getDragPermission({
        targetTagName: 'DIV',
        hasNoDragAttribute: false,
        direction: 'left',
        timeSinceOpenMs: null,
        swipeAmount: null,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout: 100,
        isDraggingInDirection: false,
        ancestors: [],
      }),
    ).toEqual({ allow: true, updatePreventedAt: false });
  });

  it('blocks when dragging in the expanded direction or during scroll lock', () => {
    expect(
      getDragPermission({
        targetTagName: 'DIV',
        hasNoDragAttribute: false,
        direction: 'bottom',
        timeSinceOpenMs: null,
        swipeAmount: 0,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: 50,
        scrollLockTimeout: 100,
        isDraggingInDirection: false,
        ancestors: [],
      }),
    ).toEqual({ allow: false, updatePreventedAt: true });

    expect(
      getDragPermission({
        targetTagName: 'DIV',
        hasNoDragAttribute: false,
        direction: 'bottom',
        timeSinceOpenMs: null,
        swipeAmount: 0,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout: 100,
        isDraggingInDirection: true,
        ancestors: [],
      }),
    ).toEqual({ allow: false, updatePreventedAt: true });
  });

  it('blocks when a scrollable ancestor is not at the top', () => {
    expect(
      getDragPermission({
        targetTagName: 'DIV',
        hasNoDragAttribute: false,
        direction: 'bottom',
        timeSinceOpenMs: null,
        swipeAmount: 0,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout: 100,
        isDraggingInDirection: false,
        ancestors: [{ scrollHeight: 500, clientHeight: 200, scrollTop: 20, role: null }],
      }),
    ).toEqual({ allow: false, updatePreventedAt: true });
  });

  it('allows when a dialog ancestor is the first eligible scroll container', () => {
    expect(
      getDragPermission({
        targetTagName: 'DIV',
        hasNoDragAttribute: false,
        direction: 'bottom',
        timeSinceOpenMs: null,
        swipeAmount: 0,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout: 100,
        isDraggingInDirection: false,
        ancestors: [{ scrollHeight: 500, clientHeight: 200, scrollTop: 0, role: 'dialog' }],
      }),
    ).toEqual({ allow: true, updatePreventedAt: false });
  });

  it('normalizes non-Element targets without throwing', () => {
    const { window } = parseHTML('<!doctype html><html><body><div></div></body></html>');

    expect(() => getDragTargetMetadata(window.document)).not.toThrow();
    expect(getDragTargetMetadata(window.document)).toEqual({
      targetTagName: '',
      hasNoDragAttribute: false,
      ancestors: [],
    });
  });

  it('detects no-drag metadata from the target or its ancestors', () => {
    const { window } = parseHTML(
      '<!doctype html><html><body><div data-drawer-no-drag=""><button id="trigger">Open</button></div></body></html>',
    );
    const target = window.document.getElementById('trigger');

    expect(getDragTargetMetadata(target)).toMatchObject({
      targetTagName: 'BUTTON',
      hasNoDragAttribute: true,
    });
    expect(getDragTargetMetadata(target).ancestors.length).toBeGreaterThan(0);
  });
});
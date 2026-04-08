import React from 'react';

import {
  createDrawerController,
  type CommonDrawerController,
  type CommonDrawerOptions,
  type CommonDrawerSnapshot,
} from '../core';

export type DrawerRuntimeOptions = CommonDrawerOptions;

export interface DrawerRuntimeState {
  controller: CommonDrawerController;
  snapshot: CommonDrawerSnapshot;
}

function isEqualArray(left: unknown[], right: unknown[]) {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

function isEqualOptionValue(left: unknown, right: unknown) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return isEqualArray(left, right);
  }

  return Object.is(left, right);
}

function areDrawerRuntimeOptionsEqual(left: DrawerRuntimeOptions, right: DrawerRuntimeOptions) {
  const leftKeys = Object.keys(left) as Array<keyof DrawerRuntimeOptions>;
  const rightKeys = Object.keys(right) as Array<keyof DrawerRuntimeOptions>;

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => isEqualOptionValue(left[key], right[key]));
}

export function useDrawerRuntime(options: DrawerRuntimeOptions): DrawerRuntimeState {
  const controllerRef = React.useRef<CommonDrawerController>();
  const appliedOptionsRef = React.useRef<DrawerRuntimeOptions>(options);

  if (!controllerRef.current) {
    controllerRef.current = createDrawerController(options);
  }

  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = React.useState<CommonDrawerSnapshot>(() => controller.getSnapshot());

  React.useEffect(() => controller.subscribe(setSnapshot), [controller]);

  React.useEffect(() => {
    if (areDrawerRuntimeOptionsEqual(appliedOptionsRef.current, options)) {
      return;
    }

    appliedOptionsRef.current = options;
    controller.patch(options);
  }, [controller, options]);

  return {
    controller,
    snapshot,
  };
}
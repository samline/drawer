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

export function useDrawerRuntime(options: DrawerRuntimeOptions): DrawerRuntimeState {
  const controllerRef = React.useRef<CommonDrawerController>();

  if (!controllerRef.current) {
    controllerRef.current = createDrawerController(options);
  }

  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = React.useState<CommonDrawerSnapshot>(() => controller.getSnapshot());

  React.useEffect(() => controller.subscribe(setSnapshot), [controller]);

  React.useEffect(() => {
    controller.patch(options);
  }, [controller, options]);

  return {
    controller,
    snapshot,
  };
}
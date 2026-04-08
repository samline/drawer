import { defineComponent, h, onBeforeUnmount, onMounted, watch } from 'vue';
import type { PropType, Plugin } from 'vue';

import {
  closeDrawer,
  configureDrawer,
  createDrawer,
  createDrawerController,
  destroyDrawer,
  destroyDrawers,
  getChildDrawers,
  getDrawer,
  getDrawers,
  getParentDrawer,
  openDrawer,
  toggleDrawer,
  updateDrawer,
} from '../index';
import type { VanillaDrawerController, VanillaDrawerOptions, VanillaRenderable } from '../index';
import type { CommonDrawerDirection, CommonDrawerSnapPoint } from '../core';

const drawerProps = {
  id: String,
  parentId: String,
  open: Boolean,
  defaultOpen: Boolean,
  onOpenChange: Function as PropType<(open: boolean) => void>,
  onClose: Function as PropType<() => void>,
  onAnimationEnd: Function as PropType<(open: boolean) => void>,
  onDragChange: Function as PropType<(percentageDragged: number) => void>,
  onReleaseChange: Function as PropType<(open: boolean) => void>,
  dismissible: Boolean,
  modal: Boolean,
  nested: Boolean,
  direction: String as PropType<CommonDrawerDirection>,
  snapPoints: Array as PropType<CommonDrawerSnapPoint[]>,
  fadeFromIndex: Number,
  activeSnapPoint: [String, Number, null] as PropType<CommonDrawerSnapPoint | null>,
  closeThreshold: Number,
  scrollLockTimeout: Number,
  shouldScaleBackground: Boolean,
  setBackgroundColorOnScale: Boolean,
  handleOnly: Boolean,
  fixed: Boolean,
  disablePreventScroll: Boolean,
  repositionInputs: Boolean,
  snapToSequentialPoint: Boolean,
  preventScrollRestoration: Boolean,
  noBodyStyles: Boolean,
  autoFocus: Boolean,
  mountElement: Object as PropType<HTMLElement | null>,
  triggerElement: Object as PropType<HTMLElement | null>,
  triggerText: String,
  showHandle: Boolean,
  handleClassName: String,
  title: [String, Number, Object, Function] as PropType<VanillaRenderable>,
  description: [String, Number, Object, Function] as PropType<VanillaRenderable>,
  content: [String, Number, Object, Function] as PropType<VanillaRenderable>,
  overlayClassName: String,
  contentClassName: String,
};

function cleanOptions(options: Record<string, unknown>) {
  const nextOptions: Record<string, unknown> = {};

  for (const key in options) {
    if (Object.prototype.hasOwnProperty.call(options, key) && options[key] !== undefined) {
      nextOptions[key] = options[key];
    }
  }

  return nextOptions as VanillaDrawerOptions;
}

function syncDrawer(options?: VanillaDrawerOptions) {
  createDrawer(options ?? {});
}

function getDrawerInstanceId(options: { id?: string } | undefined) {
  return typeof options?.id === 'string' ? options.id : 'default';
}

export const DrawerRoot = defineComponent({
  name: 'DrawerRoot',
  props: drawerProps,
  setup(props) {
    let mounted = false;
    let currentDrawerId = 'default';

    const sync = () => {
      const options = cleanOptions({
        id: props.id,
        parentId: props.parentId,
        open: props.open,
        defaultOpen: props.defaultOpen,
        onOpenChange: props.onOpenChange,
        onClose: props.onClose,
        onAnimationEnd: props.onAnimationEnd,
        onDragChange: props.onDragChange,
        onReleaseChange: props.onReleaseChange,
        dismissible: props.dismissible,
        modal: props.modal,
        nested: props.nested,
        direction: props.direction,
        snapPoints: props.snapPoints,
        fadeFromIndex: props.fadeFromIndex,
        activeSnapPoint: props.activeSnapPoint,
        closeThreshold: props.closeThreshold,
        scrollLockTimeout: props.scrollLockTimeout,
        shouldScaleBackground: props.shouldScaleBackground,
        setBackgroundColorOnScale: props.setBackgroundColorOnScale,
        handleOnly: props.handleOnly,
        fixed: props.fixed,
        disablePreventScroll: props.disablePreventScroll,
        repositionInputs: props.repositionInputs,
        snapToSequentialPoint: props.snapToSequentialPoint,
        preventScrollRestoration: props.preventScrollRestoration,
        noBodyStyles: props.noBodyStyles,
        autoFocus: props.autoFocus,
        mountElement: props.mountElement,
        triggerElement: props.triggerElement,
        triggerText: props.triggerText,
        showHandle: props.showHandle,
        handleClassName: props.handleClassName,
        title: props.title,
        description: props.description,
        content: props.content,
        overlayClassName: props.overlayClassName,
        contentClassName: props.contentClassName,
      });

      const nextDrawerId = getDrawerInstanceId(options);

      if (currentDrawerId && currentDrawerId !== nextDrawerId) {
        destroyDrawer(currentDrawerId);
      }

      syncDrawer(options);
      currentDrawerId = nextDrawerId;
    };

    onMounted(() => {
      mounted = true;
      sync();
    });

    watch(
      () => ({ ...props }),
      () => {
        if (!mounted) return;
        sync();
      },
      { deep: true },
    );

    onBeforeUnmount(() => {
      destroyDrawer(currentDrawerId);
      mounted = false;
      currentDrawerId = 'default';
    });

    return () => h('span', { 'data-drawer-vue-root': '', hidden: true, 'aria-hidden': 'true' });
  },
});

export const DrawerPlugin: Plugin = {
  install(app) {
    app.component('DrawerRoot', DrawerRoot);
    app.config.globalProperties.$drawer = {
      getParentDrawer,
      getChildDrawers,
      closeDrawer,
      configureDrawer,
      createDrawer,
      createDrawerController,
      destroyDrawer,
      destroyDrawers,
      getDrawer,
      getDrawers,
      openDrawer,
      toggleDrawer,
      updateDrawer,
    };
    app.provide('drawer:api', {
      getParentDrawer,
      getChildDrawers,
      closeDrawer,
      configureDrawer,
      createDrawer,
      createDrawerController,
      destroyDrawer,
      destroyDrawers,
      getDrawer,
      getDrawers,
      openDrawer,
      toggleDrawer,
      updateDrawer,
    });
  },
};

export {
  getParentDrawer,
  getChildDrawers,
  closeDrawer,
  configureDrawer,
  createDrawer,
  createDrawerController,
  destroyDrawer,
  destroyDrawers,
  getDrawer,
  getDrawers,
  openDrawer,
  toggleDrawer,
  updateDrawer,
};
export type { VanillaDrawerController, VanillaDrawerOptions };
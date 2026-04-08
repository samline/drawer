import { defineComponent, h, onBeforeUnmount, onMounted, watch } from 'vue';
import type { PropType, Plugin } from 'vue';

import { createDrawer, destroyDrawer, getDrawer } from '../index';
import type { VanillaDrawerController, VanillaDrawerOptions, VanillaRenderable } from '../index';
import type { CommonDrawerDirection, CommonDrawerSnapPoint } from '../core';

const drawerProps = {
  open: Boolean,
  defaultOpen: Boolean,
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
  triggerText: String,
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

export const DrawerRoot = defineComponent({
  name: 'DrawerRoot',
  props: drawerProps,
  setup(props) {
    let mounted = false;

    const sync = () => {
      const options = cleanOptions({
        open: props.open,
        defaultOpen: props.defaultOpen,
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
        triggerText: props.triggerText,
        title: props.title,
        description: props.description,
        content: props.content,
        overlayClassName: props.overlayClassName,
        contentClassName: props.contentClassName,
      });

      syncDrawer(options);
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
      destroyDrawer();
      mounted = false;
    });

    return () => h('span', { 'data-drawer-vue-root': '', hidden: true, 'aria-hidden': 'true' });
  },
});

export const DrawerPlugin: Plugin = {
  install(app) {
    app.component('DrawerRoot', DrawerRoot);
    app.config.globalProperties.$drawer = {
      createDrawer,
      destroyDrawer,
      getDrawer,
    };
    app.provide('drawer:api', { createDrawer, destroyDrawer, getDrawer });
  },
};

export { createDrawer, destroyDrawer, getDrawer };
export type { VanillaDrawerController, VanillaDrawerOptions };
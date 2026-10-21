import { stylesFor } from './demo-source'
import { format, resolveConfig } from 'prettier'
const options = await resolveConfig(process.cwd())
const stylesheet = await format(
  stylesFor('bottom')
    .replace(/body \{[^}]*\}\n/, '')
    .replace('button {', '.demo-drawer button {'),
  { ...options, parser: 'css' }
)
export const frameworkFiles = await Promise.all(
  (
    [
      {
        id: 'react',
        label: 'React',
        filename: 'Filters.jsx',
        language: 'jsx',
        code: "'use client'\n\nimport { useEffect, useId, useRef, useState } from 'react'\nimport { createDrawer } from '@samline/drawer'\nimport '@samline/drawer/styles.css'\nimport './drawer.css'\n\nexport const Filters = () => {\n  const triggerRef = useRef(null)\n  const id = useId()\n  const [open, setOpen] = useState(false)\n\n  useEffect(() => {\n    const trigger = triggerRef.current\n    const drawer = createDrawer({\n      id,\n    triggerElement: trigger,\n    title: 'Your filters',\n    content: 'Add your own filter controls here.',\n    contentClassName: 'demo-drawer',\n    overlayClassName: 'demo-overlay',\n    autoFocus: true,\n    showHandle: true,\n    closeButton: { icon: '×', ariaLabel: 'Close filters' },\n      onOpenChange: setOpen,\n    })\n    return () => drawer.destroy()\n  }, [id])\n\n  return <button ref={triggerRef} type=\"button\" aria-haspopup=\"dialog\" aria-expanded={open}>Open filters</button>\n}\n",
      },
      {
        id: 'vue',
        label: 'Vue',
        filename: 'Filters.vue',
        language: 'vue',
        code: "<script setup>\nimport { ref, onMounted, onUnmounted } from 'vue'\nimport { createDrawer } from '@samline/drawer'\nimport '@samline/drawer/styles.css'\nimport './drawer.css'\n\nconst triggerRef = ref(null)\nconst open = ref(false)\nlet drawer\n\nonMounted(() => {\n  const trigger = triggerRef.value\n  drawer = createDrawer({\n    id: crypto.randomUUID(),\n    triggerElement: trigger,\n    title: 'Your filters',\n    content: 'Add your own filter controls here.',\n    contentClassName: 'demo-drawer',\n    overlayClassName: 'demo-overlay',\n    autoFocus: true,\n    showHandle: true,\n    closeButton: { icon: '×', ariaLabel: 'Close filters' },\n    onOpenChange: value => { open.value = value },\n  })\n})\nonUnmounted(() => drawer?.destroy())\n</script>\n\n<template>\n  <button ref=\"triggerRef\" type=\"button\" aria-haspopup=\"dialog\" :aria-expanded=\"open\">Open filters</button>\n</template>\n",
      },
      {
        id: 'svelte',
        label: 'Svelte',
        filename: 'Filters.svelte',
        language: 'svelte',
        code: "<script>\nimport { onMount } from 'svelte'\nimport { createDrawer } from '@samline/drawer'\nimport '@samline/drawer/styles.css'\nimport './drawer.css'\n\nlet trigger\nlet open = $state(false)\n\nonMount(() => {\n  const drawer = createDrawer({\n    id: crypto.randomUUID(),\n    triggerElement: trigger,\n    title: 'Your filters',\n    content: 'Add your own filter controls here.',\n    contentClassName: 'demo-drawer',\n    overlayClassName: 'demo-overlay',\n    autoFocus: true,\n    showHandle: true,\n    closeButton: { icon: '×', ariaLabel: 'Close filters' },\n    onOpenChange: value => { open = value },\n  })\n  return () => drawer.destroy()\n})\n</script>\n\n<button bind:this={trigger} type=\"button\" aria-haspopup=\"dialog\" aria-expanded={open}>Open filters</button>\n",
      },
    ] as const
  ).map(async item => ({
    ...item,
    files: [
      {
        ...item,
        code:
          item.language === 'svelte'
            ? item.code
            : await format(item.code, {
                ...options,
                parser: item.language === 'vue' ? 'vue' : 'babel',
              }),
      },
      {
        id: 'css',
        label: 'CSS',
        filename: 'drawer.css',
        language: 'css' as const,
        code: stylesheet,
      },
    ],
  }))
)

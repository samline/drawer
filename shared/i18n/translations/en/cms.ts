export default {
  shopify: [
    {
      id: 'section',
      label: 'Section',
      filename: 'sections/drawer-filters.liquid',
      language: 'liquid',
      code: '<section data-drawer-widget>\n  <button type="button" data-open aria-haspopup="dialog" aria-expanded="false">Open filters</button>\n  <template data-content><div><p>Choose what you want to see.</p><label>Category<select><option>All products</option><option>Books</option><option>Tools</option></select></label></div></template>\n</section>\n\n{% schema %}\n{"name":"Drawer example","presets":[{"name":"Drawer example"}]}\n{% endschema %}\n',
    },
    {
      id: 'loader',
      label: 'Layout',
      filename: 'layout/theme.liquid',
      language: 'liquid',
      code: "{{ 'drawer.css' | asset_url | stylesheet_tag }}\n{{ 'integration.css' | asset_url | stylesheet_tag }}\n<script src=\"{{ 'drawer.global.js' | asset_url }}\" defer></script>\n<script src=\"{{ 'integration.js' | asset_url }}\" defer></script>",
    },
    {
      id: 'javascript',
      label: 'JavaScript',
      filename: 'assets/integration.js',
      language: 'javascript',
      code: "const instances = new Map()\nconst mount = scope => {\n  scope.querySelectorAll('[data-drawer-widget]').forEach(root => {\n    if (instances.has(root)) return\n    const trigger = root.querySelector('[data-open]')\n    const template = root.querySelector('template')\n    const drawer = window.Drawer.createDrawer({\n      id: crypto.randomUUID(),\n      triggerElement: trigger,\n      title: 'Product filters',\n      content: () => template.content.firstElementChild.cloneNode(true),\n      contentClassName: 'cms-panel', overlayClassName: 'cms-overlay',\n      autoFocus: true, showHandle: true,\n      closeButton: { icon: '\u00d7', ariaLabel: 'Close filters' },\n      onOpenChange: open => trigger.setAttribute('aria-expanded', String(open)),\n    })\n    instances.set(root, () => { drawer.destroy(); trigger.setAttribute('aria-expanded', 'false') })\n  })\n}\nconst unmount = scope => {\n  for (const [root, dispose] of instances) {\n    if (scope.contains(root)) { dispose(); instances.delete(root) }\n  }\n}\nmount(document)\ndocument.addEventListener('shopify:section:load', event => mount(event.target))\ndocument.addEventListener('shopify:section:unload', event => unmount(event.target))\nwindow.addEventListener('pagehide', event => {\n  if (!event.persisted) unmount(document)\n})\n",
    },
    {
      id: 'css',
      label: 'CSS',
      filename: 'assets/integration.css',
      language: 'css',
      code: ' .cms-overlay { position: fixed; inset: 0; z-index: 101; background: rgb(0 0 0 / 45%); }\n.cms-panel { display: flex; flex-direction: column; box-sizing: border-box; position: fixed; bottom: 0; left: 0; right: 0; z-index: 101; padding: 1.5rem; max-height: 85dvh; background: #faf9fc; color: #24212b; border-radius: 1.5rem 1.5rem 0 0; }\n.cms-panel [data-drawer-body] { flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }\n.cms-panel [data-drawer-title], .cms-panel [data-drawer-handle], .cms-panel [data-drawer-close] { flex-shrink: 0; }\n.cms-panel [data-drawer-title] { font-size: 1.5rem; margin: 1rem 0; }\n.cms-panel [data-drawer-close] { display: block; margin: 1rem 0 0 auto; }\n.cms-panel label { display: grid; gap: 0.75rem; }\n.cms-panel select, .cms-panel button { font: inherit; padding: 0.75rem; }\n',
    },
  ],
  wordpress: [
    {
      id: 'plugin',
      label: 'Plugin',
      filename: 'drawer-example.php',
      language: 'php',
      code: "<?php\n/**\n * Plugin Name: Drawer example\n */\nadd_action('wp_enqueue_scripts', static function () {\n    $post = get_post();\n    if (!is_singular() || !$post || !has_shortcode($post->post_content, 'drawer_filters')) return;\n    $assets = plugin_dir_url(__FILE__) . 'assets/';\n    wp_enqueue_style('drawer-runtime', $assets . 'drawer.css', [], '5.0.2');\n    wp_enqueue_style('drawer-example', $assets . 'integration.css', ['drawer-runtime'], '1.0.0');\n    wp_enqueue_script('drawer-runtime', $assets . 'drawer.global.js', [], '5.0.2', ['strategy' => 'defer', 'in_footer' => true]);\n    wp_enqueue_script('drawer-example', $assets . 'integration.js', ['drawer-runtime'], '1.0.0', ['strategy' => 'defer', 'in_footer' => true]);\n});\nadd_shortcode('drawer_filters', static fn () => '<section data-drawer-widget>\n  <button type=\"button\" data-open aria-haspopup=\"dialog\" aria-expanded=\"false\">Open filters</button>\n  <template data-content><div><p>Choose what you want to see.</p><label>Category<select><option>All products</option><option>Books</option><option>Tools</option></select></label></div></template>\n</section>');\n",
    },
    {
      id: 'javascript',
      label: 'JavaScript',
      filename: 'assets/integration.js',
      language: 'javascript',
      code: "const instances = new Map()\nconst mount = scope => {\n  scope.querySelectorAll('[data-drawer-widget]').forEach(root => {\n    if (instances.has(root)) return\n    const trigger = root.querySelector('[data-open]')\n    const template = root.querySelector('template')\n    const drawer = window.Drawer.createDrawer({\n      id: crypto.randomUUID(),\n      triggerElement: trigger,\n      title: 'Product filters',\n      content: () => template.content.firstElementChild.cloneNode(true),\n      contentClassName: 'cms-panel', overlayClassName: 'cms-overlay',\n      autoFocus: true, showHandle: true,\n      closeButton: { icon: '\u00d7', ariaLabel: 'Close filters' },\n      onOpenChange: open => trigger.setAttribute('aria-expanded', String(open)),\n    })\n    instances.set(root, () => { drawer.destroy(); trigger.setAttribute('aria-expanded', 'false') })\n  })\n}\nconst unmount = scope => {\n  for (const [root, dispose] of instances) {\n    if (scope.contains(root)) { dispose(); instances.delete(root) }\n  }\n}\nmount(document)\nwindow.addEventListener('pagehide', event => {\n  if (!event.persisted) unmount(document)\n})\n",
    },
    {
      id: 'css',
      label: 'CSS',
      filename: 'assets/integration.css',
      language: 'css',
      code: ' .cms-overlay { position: fixed; inset: 0; z-index: 101; background: rgb(0 0 0 / 45%); }\n.cms-panel { display: flex; flex-direction: column; box-sizing: border-box; position: fixed; bottom: 0; left: 0; right: 0; z-index: 101; padding: 1.5rem; max-height: 85dvh; background: #faf9fc; color: #24212b; border-radius: 1.5rem 1.5rem 0 0; }\n.cms-panel [data-drawer-body] { flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }\n.cms-panel [data-drawer-title], .cms-panel [data-drawer-handle], .cms-panel [data-drawer-close] { flex-shrink: 0; }\n.cms-panel [data-drawer-title] { font-size: 1.5rem; margin: 1rem 0; }\n.cms-panel [data-drawer-close] { display: block; margin: 1rem 0 0 auto; }\n.cms-panel label { display: grid; gap: 0.75rem; }\n.cms-panel select, .cms-panel button { font: inherit; padding: 0.75rem; }\n',
    },
  ],
} as const

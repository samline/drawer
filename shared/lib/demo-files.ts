import { format, resolveConfig } from 'prettier'
import demo, { type DemoPreset } from '../i18n/translations/en/demo'
import { htmlFor, javascriptFor, stylesFor, triggerMarkup } from './demo-source'
import { project } from './project.mjs'
import controls from '../i18n/translations/en/controls'

// Read formatting options once at build time. Both consumers share the same files.
const options = await resolveConfig(process.cwd())
export type DemoMode = 'cdn' | 'esm'
const behaviorFor = (preset: DemoPreset, mode: DemoMode) =>
  mode === 'esm'
    ? `import { createDrawer } from '@samline/drawer'\nimport '@samline/drawer/styles.css'\nimport './style.css'\n\n${javascriptFor(preset).replaceAll('window.Drawer.createDrawer', 'createDrawer')}`
    : javascriptFor(preset)
const documentFor = (separate: boolean, preset: DemoPreset, mode: DemoMode) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${demo.label}</title>

${mode === 'cdn' && project.delivery.cdnStylesheet ? `<link rel="stylesheet" href="${project.delivery.cdnStylesheet}">` : ''}
${separate ? (mode === 'cdn' ? '<link rel="stylesheet" href="./style.css">' : '') : `<style>\n${stylesFor(preset)}\n</style>`}
</head>

<body>
<main>
${htmlFor(preset)}
</main>

${mode === 'cdn' && project.delivery.cdnScript ? `<script src="${project.delivery.cdnScript}"></script>` : ''}
${separate ? (mode === 'esm' ? '<script type="module" src="./main.js"></script>' : '<script src="./main.js" defer></script>') : `<script${mode === 'esm' ? ' type="module"' : ''}>\n${mode === 'esm' ? behaviorFor(preset, mode).replace("import './style.css'\n", '') : javascriptFor(preset)}\n</script>`}
</body>
</html>`

export const createDemoFiles = async (preset: DemoPreset = 'bottom', mode: DemoMode = 'cdn') => ({
  files: [
    {
      id: 'html',
      label: controls.codeFiles.html,
      filename: 'index.html',
      language: 'html' as const,
      code: await format(documentFor(true, preset, mode), { ...options, parser: 'html' }),
    },
    {
      id: 'css',
      label: controls.codeFiles.css,
      filename: 'style.css',
      language: 'css' as const,
      code: await format(stylesFor(preset), { ...options, parser: 'css' }),
    },
    {
      id: 'javascript',
      label: controls.codeFiles.javascript,
      filename: 'main.js',
      language: 'javascript' as const,
      code: await format(behaviorFor(preset, mode), { ...options, parser: 'babel' }),
    },
  ],
  complete: {
    code: await format(documentFor(false, preset, mode), { ...options, parser: 'html' }),
  },
  markup: await format(triggerMarkup, { ...options, parser: 'html' }),
})
export const demoFiles = createDemoFiles()

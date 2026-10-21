import t, { presets, type DemoPreset } from '../i18n/translations/en/demo'
import { project } from './project.mjs'
import { demoOptions } from './demo-options'

export const triggerMarkup = `<button type="button" id="open-drawer" aria-haspopup="dialog" aria-expanded="false">${t.increment}</button>`
const contentFor = (preset: DemoPreset) => {
  if (preset === 'form')
    return `<form data-demo-form data-drawer-no-drag><label for="category">${t.category}</label><select id="category" name="category"><option>${t.all}</option><option>${t.books}</option><option>${t.tools}</option></select><button type="submit">${t.apply}</button></form>`
  if (preset === 'scroll')
    return t.scrollSections
      .map(
        title =>
          `<section><h3>${title}</h3><p>${t.scrollParagraph}</p><p>${t.scrollParagraph}</p></section>`
      )
      .join('\n')
  return `<p>${t.contentHeading}</p><ul>${t.contentItems.map(item => `<li>${item}</li>`).join('')}</ul>
    ${preset === 'handle' ? `<label data-drawer-no-drag>${t.noteLabel}<textarea placeholder="${t.notePlaceholder}"></textarea></label>` : ''}
    ${preset === 'update' ? `<button type="button" data-demo-update data-drawer-no-drag>${t.loadNext}</button>` : ''}
    ${preset === 'controlled' ? `<div data-drawer-no-drag><button type="button" data-demo-compact>${t.compact}</button><button type="button" data-demo-expanded>${t.expanded}</button></div>` : ''}`
}
export const htmlFor = (preset: DemoPreset) => `${triggerMarkup}
<output id="demo-result" aria-live="polite"></output>
${preset === 'nonmodal' ? `<button type="button" id="page-action">${t.backgroundAction}</button>` : ''}

<template id="drawer-content">
  <div class="demo-body"${preset === 'scroll' ? ` tabindex="0" role="region" aria-label="${t.scrollContentLabel}"` : ''}>
    ${contentFor(preset)}
    ${preset === 'nested' ? `<button type="button" data-child data-drawer-no-drag>${t.openChild}</button>` : ''}
  </div>
</template>`

const geometry = {
  bottom: `bottom: 0; left: 0; right: 0; border-radius: 1.5rem 1.5rem 0 0; min-height: 18rem;`,
  top: `top: 0; left: 0; right: 0; border-radius: 0 0 1.5rem 1.5rem; min-height: 18rem;`,
  left: `top: 0; bottom: 0; left: 0; width: min(28rem, 90vw); max-height: 100dvh;`,
  right: `top: 0; bottom: 0; right: 0; width: min(28rem, 90vw); max-height: 100dvh;`,
}
export const stylesFor = (preset: DemoPreset) => `
body { margin: 0; padding: 2rem; font: 1rem/1.6 system-ui, sans-serif; }
button { font: inherit; cursor: pointer; padding: 0.75rem 1rem; }
.demo-overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 45%); z-index: 101; }
.demo-drawer { display: flex; flex-direction: column; position: fixed; box-sizing: border-box; background: #faf9fc; color: #24212b; z-index: 101; padding: 2rem; max-height: 90dvh; outline: none; ${geometry[presets[preset].direction]} }
${preset === 'snaps' || preset === 'controlled' ? '.demo-drawer { height: 100dvh; max-height: 100dvh; }\n.demo-drawer[data-state="open"] { padding-bottom: calc(2rem + var(--initial-transform, 0rem)); }' : ''}
.demo-drawer [data-drawer-title] { margin: 1rem 0; font-size: 1.75rem; line-height: 1.15; padding-right: 3rem; }
.demo-drawer [data-drawer-description] { margin: 0 0 1.5rem; }
.demo-body { display: grid; gap: 1rem; }
.demo-body:focus-visible { outline: 0.125rem solid ${project.accentLight}; outline-offset: -0.125rem; }
.demo-body ul { margin: 0; padding-left: 1.25rem; }
.demo-body li + li { margin-top: 0.5rem; }
.demo-drawer [data-drawer-close] { position: sticky; order: -1; flex: 0 0 auto; top: 0; display: block; margin-left: auto; z-index: 1; background: #faf9fc; }
.demo-body label, .demo-body form { display: grid; gap: 0.75rem; }
.demo-body input, .demo-body select, .demo-body textarea { max-width: 100%; box-sizing: border-box; font: inherit; padding: 0.75rem; }
.demo-body section + section { margin-top: 1.5rem; }
#demo-result { display: block; }
.demo-drawer [data-drawer-handle] { order: -2; flex-shrink: 0; margin-inline: auto; }
.demo-drawer [data-drawer-body] { flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.demo-drawer [data-drawer-title], .demo-drawer [data-drawer-description] { flex-shrink: 0; }
.demo-drawer:focus-visible, button:focus-visible { outline: 0.125rem solid ${project.accentLight}; outline-offset: 0.1875rem; }
`

export const javascriptFor = (preset: DemoPreset) => {
  const item = presets[preset]
  const extraOptions = Object.entries(demoOptions(preset))
    .filter(([key]) => key !== 'direction' && key !== 'autoFocus')
    .map(([key, value]) => `${key}: ${JSON.stringify(value)},`)
    .join('\n  ')
  const actions = {
    form: `body.querySelector('form').addEventListener('submit', event => {
      event.preventDefault()
      const category = new FormData(event.currentTarget).get('category')
      document.getElementById('demo-result').textContent = ${JSON.stringify(t.applied)} + ' ' + category
      drawer.setOpen(false)
    }, { signal: lifecycle.signal })`,
    update: `body.querySelector('[data-demo-update]').addEventListener('click', () => {
      drawer.update({ title: ${JSON.stringify(t.updatedTitle)}, content: ${JSON.stringify(t.updatedContent)} })
    }, { signal: lifecycle.signal })`,
    controlled: `body.querySelector('[data-demo-compact]').addEventListener('click', () => drawer.setActiveSnapPoint(0.45), { signal: lifecycle.signal })
    body.querySelector('[data-demo-expanded]').addEventListener('click', () => drawer.setActiveSnapPoint(1), { signal: lifecycle.signal })`,
  }
  return `const lifecycle = new AbortController()
const trigger = document.getElementById('open-drawer')
const template = document.getElementById('drawer-content')
${preset === 'nested' ? 'let child\n' : ''}
const drawer = window.Drawer.createDrawer({
  id: 'example',
  triggerElement: trigger,
  direction: ${JSON.stringify(item.direction)},
  title: ${JSON.stringify(item.title)},
  description: ${JSON.stringify(item.description)},
  autoFocus: ${preset !== 'nonmodal'},
  content: () => {
    const body = template.content.firstElementChild.cloneNode(true)
    ${
      preset === 'nested'
        ? `body.querySelector('[data-child]').addEventListener('click', () => {
      child ??= window.Drawer.createDrawer({
        id: 'example-child', parentId: 'example',
        title: ${JSON.stringify(t.childTitle)}, description: ${JSON.stringify(t.childDescription)},
        content: ${JSON.stringify(t.childContent)}, autoFocus: true,
        contentClassName: 'demo-drawer', overlayClassName: 'demo-overlay',
        showHandle: true, closeButton: { icon: '×', ariaLabel: ${JSON.stringify(t.closeChild)} },
      })
      child.setOpen(true)
    }, { signal: lifecycle.signal })`
        : ''
    }
    ${actions[preset as keyof typeof actions] ?? ''}
    return body
  },
  contentClassName: 'demo-drawer',
  overlayClassName: 'demo-overlay',
  showHandle: true,
  closeButton: { icon: '×', ariaLabel: ${JSON.stringify(t.close)} },
  onOpenChange: open => trigger.setAttribute('aria-expanded', String(open)),
  ${extraOptions}
})

${
  preset === 'nonmodal'
    ? `document.getElementById('page-action').addEventListener('click', () => {
  document.getElementById('demo-result').textContent = ${JSON.stringify(t.backgroundResult)}
}, { signal: lifecycle.signal })`
    : ''
}

window.addEventListener('pagehide', event => {
  if (event.persisted) return
  lifecycle.abort()
  drawer.destroy()
}, { signal: lifecycle.signal })`
}

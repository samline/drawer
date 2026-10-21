import t, {
  presets,
  flow,
  menus,
  deliveryOptions,
  scenes,
  type ScenePreset,
  type MenuPreset,
  type DemoPreset,
} from '../i18n/translations/en/demo'
import { project } from './project.mjs'
import { demoOptions } from './demo-options'
import { flowMarkup, flowStyles, wizardBehavior, independentSetup } from './demo-flow-source'

export const triggerMarkup = `<button type="button" id="open-drawer" aria-haspopup="dialog" aria-expanded="false">${t.increment}</button>`
const choicesMarkup = (
  items: readonly { label: string; detail: string; icon: string; value?: string }[],
  heading: string,
  delivery = false
) =>
  `<div class="demo-menu" role="group" aria-label="${heading}" data-drawer-no-drag>${items.map(item => `<button type="button" class="demo-menu-item" ${delivery ? `data-demo-delivery="${item.value}"` : `data-demo-choice="${item.label}"`}><span class="demo-menu-icon" aria-hidden="true">${item.icon}</span><span class="demo-menu-copy"><strong>${item.label}</strong><span>${item.detail}</span></span><span aria-hidden="true">↗</span></button>`).join('')}</div>`

const contentFor = (preset: DemoPreset) => {
  const custom = flowMarkup(preset)
  if (custom !== undefined) return custom
  const scene = scenes[preset as ScenePreset]
  const menu = menus[preset as MenuPreset]
  if (menu)
    return `<p class="demo-kicker">${menu.eyebrow}</p><h3>${menu.heading}</h3>
    ${preset === 'top' ? `<label>${t.commandSearch}<input type="search" data-demo-search placeholder="${t.commandPlaceholder}" data-drawer-no-drag></label>` : ''}
    ${preset === 'confirm' ? `<div class="demo-scene"><div class="demo-scene-row"><p>${t.draftPreview}</p></div></div>` : ''}
    ${choicesMarkup(menu.items, menu.heading)}
    ${preset === 'top' ? `<p data-demo-empty hidden role="status">${t.noCommands}</p>` : ''}<p class="demo-hint">${menu.hint}</p>`
  if (preset === 'form')
    return `<form data-demo-form data-drawer-no-drag><label for="category">${t.category}</label><select id="category" name="category"><option>${t.all}</option><option>${t.books}</option><option>${t.tools}</option></select><label>${t.sort}<select name="sort"><option>${t.recommended}</option><option>${t.newest}</option><option>${t.price}</option></select></label><p class="demo-hint">${t.filterHint}</p><button type="submit">${t.apply}</button></form>`
  if (preset === 'scroll')
    return t.scrollSections
      .map(
        (title, index) => `<section><h3>${title}</h3><p>${t.scrollParagraphs[index]}</p></section>`
      )
      .join('\n')
  return `${preset === 'controlled' ? `<div class="demo-actions" data-drawer-no-drag><button type="button" data-demo-compact>${t.compact}</button><button type="button" data-demo-expanded>${t.expanded}</button></div>` : ''}
    ${scene ? `<p class="demo-kicker">${scene.eyebrow}</p><h3>${scene.heading}</h3><div class="demo-scene">${scene.items.map(item => `<div class="demo-scene-row"><div><strong>${item.title}</strong><p>${item.detail}</p></div><span>${item.value}</span></div>`).join('')}</div>${scene.action ? `<button type="button" data-demo-choice="${scene.action}" data-drawer-no-drag>${scene.action}</button>` : ''}` : `<p>${t.contentHeading}</p>`}
    ${preset === 'nonmodal' ? `<label class="demo-field-inline" data-drawer-no-drag><input type="checkbox" data-demo-grid>${t.gridLabel}</label>` : ''}
    ${preset === 'handle' ? `<label data-drawer-no-drag>${t.noteLabel}<textarea placeholder="${t.notePlaceholder}"></textarea></label>` : ''}
    ${preset === 'update' ? `<button type="button" data-demo-update data-drawer-no-drag>${t.loadNext}</button>` : ''}
`
}
export const htmlFor = (preset: DemoPreset) => `${triggerMarkup}
${preset === 'independent' ? `<button type="button" id="open-activity" aria-haspopup="dialog" aria-expanded="false">${flow.openActivity}</button>` : ''}
<output id="demo-result" aria-live="polite"></output>
${preset === 'nonmodal' ? `<button type="button" id="page-action">${t.backgroundAction}</button><div id="canvas" class="demo-canvas"><h2>${t.canvasTitle}</h2><p>${t.canvasDescription}</p></div>` : ''}

<template id="drawer-content">
  <div class="demo-body"${preset === 'scroll' ? ` tabindex="0" role="region" aria-label="${t.scrollContentLabel}"` : ''}>
    ${contentFor(preset)}
    ${preset === 'nested' ? `<p data-delivery-summary role="status">${t.deliveryInitial}</p><template data-delivery-content><div class="demo-body">${choicesMarkup(deliveryOptions, t.deliveryGroup, true)}</div></template><button type="button" data-child data-drawer-no-drag>${t.openChild}</button>` : ''}
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
.demo-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.demo-body { display: grid; gap: 1rem; width: min(100%, 52rem); margin-inline: auto; }
.demo-body > button, .demo-body form > button { justify-self: start; width: fit-content; max-width: 100%; }
.demo-scene { display: grid; border: 0.0625rem solid #d9cbd5; border-radius: 0.875rem; background: #f3edf3; }
.demo-scene-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1rem; padding: 1rem; }
.demo-scene-row + .demo-scene-row { border-top: 0.0625rem solid #d9cbd5; }
.demo-scene-row p { color: #625361; font-size: 0.875rem; }
${
  preset === 'nonmodal'
    ? `
.demo-body label.demo-field-inline { display: flex; align-items: center; gap: 0.75rem; }
.demo-body .demo-field-inline input { width: 1.125rem; height: 1.125rem; padding: 0; flex-shrink: 0; }
.demo-canvas { margin-top: 1.5rem; padding: 2rem; border: 0.0625rem solid #d9cbd5; border-radius: 0.875rem; }
.demo-canvas[data-grid] { background-image: linear-gradient(#d9cbd5 0.0625rem, transparent 0.0625rem), linear-gradient(90deg, #d9cbd5 0.0625rem, transparent 0.0625rem); background-size: 1.5rem 1.5rem; }
`
    : ''
}
.demo-menu { display: grid; gap: 0.75rem; }
.demo-menu-item { display: flex; align-items: center; gap: 1rem; width: 100%; text-align: left; border: 0.0625rem solid #d9cbd5; border-radius: 0.875rem; color: inherit; background: #f3edf3; }
.demo-menu-item[hidden] { display: none; }
.demo-menu-copy { display: grid; gap: 0.25rem; flex: 1; min-width: 0; }
.demo-menu-copy > span, .demo-hint { font-size: 0.875rem; color: #625361; }
.demo-menu-icon { display: grid; place-items: center; flex: 0 0 2.5rem; height: 2.5rem; color: ${project.accentLight}; }
.demo-kicker { font-size: 0.75rem; letter-spacing: 0.08em; color: ${project.accentLight}; }
.demo-body h3, .demo-body p { margin: 0; }
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
.demo-drawer [data-drawer-title], .demo-drawer [data-drawer-description] { flex-shrink: 0; width: min(100%, 52rem); margin-inline: auto; box-sizing: border-box; }
${flowStyles(preset)}
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
      const values = new FormData(event.currentTarget)
      const category = values.get('category')
      const sort = values.get('sort')
      document.getElementById('demo-result').textContent = ${JSON.stringify(t.applied)} + ' ' + category + ' · ' + sort
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
${preset === 'independent' ? independentSetup : ''}
const drawer = window.Drawer.createDrawer({
  id: 'example',
  triggerElement: trigger,
  direction: ${JSON.stringify(item.direction)},
  title: ${JSON.stringify(item.panelTitle)},
  description: ${JSON.stringify(item.panelDescription)},
  autoFocus: ${preset !== 'nonmodal' && preset !== 'independent'},
  content: () => {
    const body = template.content.firstElementChild.cloneNode(true)
    ${
      preset === 'nested'
        ? `body.querySelector('[data-child]').addEventListener('click', () => {
      const deliveryContent = () => {
        const choices = body.querySelector('[data-delivery-content]').content.firstElementChild.cloneNode(true)
        choices.querySelectorAll('button[data-demo-delivery]').forEach(button => button.addEventListener('click', () => {
          body.querySelector('[data-delivery-summary]').textContent = button.dataset.demoDelivery
          child.setOpen(false)
        }, { signal: lifecycle.signal }))
        return choices
      }
      if (child) child.update({ content: deliveryContent })
      child ??= window.Drawer.createDrawer({
        id: 'example-child', parentId: 'example',
        title: ${JSON.stringify(t.childTitle)}, description: ${JSON.stringify(t.childDescription)},
        content: deliveryContent, autoFocus: true,
        contentClassName: 'demo-drawer', overlayClassName: 'demo-overlay',
        showHandle: true, closeButton: { icon: '×', ariaLabel: ${JSON.stringify(t.closeChild)} },
      })
      child.setOpen(true)
    }, { signal: lifecycle.signal })`
        : ''
    }
    ${
      menus[preset as MenuPreset] || scenes[preset as ScenePreset]?.action || preset === 'styled'
        ? `const choices = [...body.querySelectorAll('button[data-demo-choice]')]
    choices.forEach(button => button.addEventListener('click', () => {
      document.getElementById('demo-result').textContent = ${JSON.stringify(t.selected)} + ' ' + button.dataset.demoChoice
      drawer.setOpen(false)
    }, { signal: lifecycle.signal }))`
        : ''
    }
    ${
      preset === 'top'
        ? `body.querySelector('[data-demo-search]').addEventListener('input', event => {
      const query = event.currentTarget.value.trim().toLocaleLowerCase()
      choices.forEach(button => { button.hidden = !button.textContent.toLocaleLowerCase().includes(query) })
      body.querySelector('[data-demo-empty]').hidden = choices.some(button => !button.hidden)
    }, { signal: lifecycle.signal })`
        : ''
    }
    ${
      preset === 'nonmodal'
        ? `const canvas = document.getElementById('canvas')
    const grid = body.querySelector('[data-demo-grid]')
    grid.checked = canvas.hasAttribute('data-grid')
    grid.addEventListener('change', () => canvas.toggleAttribute('data-grid', grid.checked), { signal: lifecycle.signal })`
        : ''
    }
    ${preset === 'wizard' ? wizardBehavior : ''}
    ${preset === 'independent' ? `body.querySelector('button[data-open-companion]').addEventListener('click', openActivity, { signal: lifecycle.signal })` : ''}
    ${actions[preset as keyof typeof actions] ?? ''}
    return body
  },
  contentClassName: 'demo-drawer${preset === 'styled' ? ' demo-floating demo-invitation' : preset === 'independent' ? ' demo-floating demo-independent-notes' : ''}',
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
  ${preset === 'independent' ? 'companion?.destroy()' : ''}
  ${preset === 'nonmodal' ? `document.getElementById('canvas').removeAttribute('data-grid')` : ''}
}, { signal: lifecycle.signal })`
}

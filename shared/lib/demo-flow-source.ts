import { flow, type DemoPreset } from '../i18n/translations/en/demo'

const activityMarkup = flow.activityEntries
  .map(entry => `<section><h3>${entry.title}</h3><p>${entry.detail}</p></section>`)
  .join('')
export const flowMarkup = (preset: DemoPreset) => {
  if (preset === 'wizard')
    return `
    <p class="demo-kicker" data-flow-progress aria-live="polite">${flow.stepLabel} 1 / 3</p>
    <section data-flow-step="0"><h3 tabindex="-1">${flow.steps[0]}</h3><label for="canvas-finish">${flow.finish}</label><select id="canvas-finish" data-flow-finish>${flow.finishes.map(finish => `<option>${finish}</option>`).join('')}</select><button type="button" data-flow-next>${flow.next}</button></section>
    <section data-flow-step="1" hidden><h3 tabindex="-1">${flow.steps[1]}</h3><label>${flow.initials}<input data-flow-initials maxlength="3" placeholder="${flow.initialsPlaceholder}"></label><p class="demo-hint">${flow.initialsHint}</p><div class="demo-actions"><button type="button" data-flow-back>${flow.back}</button><button type="button" data-flow-next>${flow.next}</button></div></section>
    <section data-flow-step="2" hidden><h3 tabindex="-1">${flow.steps[2]}</h3><p>${flow.summary}</p><p data-flow-summary></p><div class="demo-actions"><button type="button" data-flow-back>${flow.back}</button><button type="button" data-flow-confirm>${flow.confirm}</button></div></section>`
  if (preset === 'independent')
    return `<p>${flow.notesHint}</p><label data-drawer-no-drag>${flow.notesLabel}<textarea placeholder="${flow.notesPlaceholder}"></textarea></label><button type="button" data-open-companion aria-haspopup="dialog">${flow.openActivity}</button><template data-companion-content><div class="demo-body">${activityMarkup}</div></template>`
  if (preset === 'styled')
    return `<p class="demo-kicker">${flow.styledEyebrow}</p><h3>${flow.styledHeading}</h3><p>${flow.styledBody}</p><p class="demo-hint">${flow.styledDetails}</p><button type="button" data-demo-choice="${flow.styledAction}" data-drawer-no-drag>${flow.styledAction}</button><p class="demo-hint">${flow.styledNotice}</p>`
  return undefined
}

export const wizardBehavior = `
    let step = 0
    const steps = [...body.querySelectorAll('[data-flow-step]')]
    const finish = body.querySelector('[data-flow-finish]')
    const initials = body.querySelector('[data-flow-initials]')
    const selection = () => finish.value + ' · ' + (initials.value.trim() || ${JSON.stringify(flow.noInitials)})
    const show = next => {
      step = next
      steps.forEach((section, index) => { section.hidden = index !== step })
      body.querySelector('[data-flow-progress]').textContent = ${JSON.stringify(flow.stepLabel)} + ' ' + (step + 1) + ' / 3'
      body.querySelector('[data-flow-summary]').textContent = selection()
      steps[step].querySelector('h3').focus()
    }
    body.querySelectorAll('button[data-flow-next]').forEach(button => button.addEventListener('click', () => show(step + 1), { signal: lifecycle.signal }))
    body.querySelectorAll('button[data-flow-back]').forEach(button => button.addEventListener('click', () => show(step - 1), { signal: lifecycle.signal }))
    body.querySelector('button[data-flow-confirm]').addEventListener('click', () => {
      document.getElementById('demo-result').textContent = ${JSON.stringify(flow.result)} + ' ' + selection()
      drawer.setOpen(false)
    }, { signal: lifecycle.signal })`

export const independentSetup = `let companion
const activityTrigger = document.getElementById('open-activity')
const openActivity = () => {
  companion ??= window.Drawer.createDrawer({
    id: 'example-activity', direction: 'right',
    title: ${JSON.stringify(flow.activityTitle)}, description: ${JSON.stringify(flow.activityDescription)},
    modal: false, overlay: false, autoFocus: false,
    content: () => template.content.querySelector('[data-companion-content]').content.firstElementChild.cloneNode(true),
    contentClassName: 'demo-drawer demo-floating demo-independent-activity',
    showHandle: false, closeButton: { icon: '×', ariaLabel: ${JSON.stringify(flow.closeActivity)} },
    onOpenChange: open => activityTrigger.setAttribute('aria-expanded', String(open)),
  })
  companion.setOpen(true)
}
activityTrigger.addEventListener('click', openActivity, { signal: lifecycle.signal })`

const floatingStyles = `
.demo-drawer.demo-floating { isolation: isolate; background: transparent; }
.demo-drawer.demo-floating::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: #faf9fc; z-index: -1; pointer-events: none; }
`
export const flowStyles = (preset: DemoPreset) => {
  if (preset === 'wizard')
    return `
.demo-drawer [data-flow-step][hidden] { display: none; }
.demo-drawer [data-flow-step]:not([hidden]) { display: grid; gap: 1rem; margin-top: 0; }
.demo-drawer [data-flow-step] > :is(h3, p) { margin: 0; }
.demo-drawer [data-flow-step] > button { justify-self: start; }
`
  if (preset === 'styled')
    return `${floatingStyles}
/* No runtime changes: geometry, corners and gradient belong to your CSS. */
.demo-drawer.demo-invitation { --initial-transform: 100dvh; inset: 1rem; margin: auto; width: min(34rem, calc(100% - 2rem)); height: fit-content; min-height: 0; max-height: calc(100dvh - 2rem); border: 0.0625rem solid #952779; border-radius: 2rem 0.5rem 2rem 0.5rem; }
.demo-drawer.demo-invitation::before { background: linear-gradient(155deg, #faf9fc 50%, #f3dfed); }
.demo-drawer.demo-invitation button[data-drawer-close] { border-radius: 100rem; }
`
  if (preset === 'independent')
    return `${floatingStyles}
.demo-drawer.demo-independent-notes, .demo-drawer.demo-independent-activity { --initial-transform: 100dvw; width: min(27rem, 46vw); max-height: calc(100dvh - 2rem); top: 1rem; bottom: 1rem; border: 0.0625rem solid #d9cbd5; border-radius: 0.875rem; }
.demo-drawer.demo-independent-notes { right: auto; left: 1rem; }
.demo-drawer.demo-independent-activity { left: auto; right: 1rem; }
@media (width < 48rem) {
  .demo-drawer.demo-independent-notes, .demo-drawer.demo-independent-activity { width: calc(100% - 2rem); height: 44dvh; max-height: 44dvh; }
  .demo-drawer.demo-independent-notes { top: 1rem; bottom: auto; }
  .demo-drawer.demo-independent-activity { top: auto; bottom: 1rem; }
}
`
  return ''
}

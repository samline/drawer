import { flow } from '../i18n/translations/en/demo'

export const connectWizard = (
  body: HTMLElement,
  complete: (result: string) => void,
  signal: AbortSignal
) => {
  const steps = [...body.querySelectorAll<HTMLElement>('[data-flow-step]')]
  if (!steps.length) return
  let step = 0
  const finish = body.querySelector<HTMLSelectElement>('[data-flow-finish]')!
  const initials = body.querySelector<HTMLInputElement>('[data-flow-initials]')!
  const selection = () => `${finish.value} · ${initials.value.trim() || flow.noInitials}`
  const show = (next: number) => {
    step = next
    steps.forEach((section, index) => {
      section.hidden = index !== step
    })
    body.querySelector('[data-flow-progress]')!.textContent = `${flow.stepLabel} ${step + 1} / 3`
    body.querySelector('[data-flow-summary]')!.textContent = selection()
    steps[step].querySelector<HTMLElement>('h3')!.focus()
  }
  body
    .querySelectorAll<HTMLButtonElement>('button[data-flow-next]')
    .forEach(button => button.addEventListener('click', () => show(step + 1), { signal }))
  body
    .querySelectorAll<HTMLButtonElement>('button[data-flow-back]')
    .forEach(button => button.addEventListener('click', () => show(step - 1), { signal }))
  body
    .querySelector('button[data-flow-confirm]')!
    .addEventListener('click', () => complete(`${flow.result} ${selection()}`), { signal })
}

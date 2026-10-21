import type { VanillaDrawerController } from '@samline/drawer'
import t from '../i18n/translations/en/demo'

export const connectDemoActions = (
  body: HTMLElement,
  controller: () => VanillaDrawerController,
  report: (text: string) => void,
  signal: AbortSignal,
  setGrid: (enabled: boolean) => void
) => {
  const grid = body.querySelector<HTMLInputElement>('[data-demo-grid]')
  grid?.addEventListener('change', () => setGrid(grid.checked), { signal })
  const choices = [...body.querySelectorAll<HTMLButtonElement>('button[data-demo-choice]')]
  choices.forEach(button =>
    button.addEventListener(
      'click',
      () => {
        report(`${t.selected} ${button.dataset.demoChoice}`)
        controller().setOpen(false)
      },
      { signal }
    )
  )
  body.querySelector<HTMLInputElement>('[data-demo-search]')?.addEventListener(
    'input',
    event => {
      const query = (event.currentTarget as HTMLInputElement).value.trim().toLocaleLowerCase()
      choices.forEach(button => {
        button.hidden = !button.textContent?.toLocaleLowerCase().includes(query)
      })
      const empty = body.querySelector<HTMLElement>('[data-demo-empty]')
      if (empty) empty.hidden = choices.some(button => !button.hidden)
    },
    { signal }
  )
  body.querySelector<HTMLFormElement>('[data-demo-form]')?.addEventListener(
    'submit',
    event => {
      event.preventDefault()
      const form = event.currentTarget as HTMLFormElement
      const values = new FormData(form)
      report(`${t.applied} ${values.get('category')} · ${values.get('sort')}`)
      controller().setOpen(false)
    },
    { signal }
  )
  body.querySelector('[data-demo-update]')?.addEventListener(
    'click',
    () => {
      controller().update({ title: t.updatedTitle, content: t.updatedContent })
    },
    { signal }
  )
  body
    .querySelector('[data-demo-compact]')
    ?.addEventListener('click', () => controller().setActiveSnapPoint(0.45), { signal })
  body
    .querySelector('[data-demo-expanded]')
    ?.addEventListener('click', () => controller().setActiveSnapPoint(1), { signal })
}

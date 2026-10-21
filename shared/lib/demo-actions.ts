import type { VanillaDrawerController } from '@samline/drawer'
import t from '../i18n/translations/en/demo'

export const connectDemoActions = (
  body: HTMLElement,
  controller: () => VanillaDrawerController,
  report: (text: string) => void,
  signal: AbortSignal
) => {
  body.querySelector<HTMLFormElement>('[data-demo-form]')?.addEventListener(
    'submit',
    event => {
      event.preventDefault()
      const form = event.currentTarget as HTMLFormElement
      report(`${t.applied} ${new FormData(form).get('category')}`)
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

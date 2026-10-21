import common from './translations/en/common'
import controls from './translations/en/controls'
import { createI18n } from './createI18n'

export const { getI18n } = createI18n({ en: { common, controls } }, 'en')

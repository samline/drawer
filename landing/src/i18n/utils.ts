import en from './translations/en'
import { createI18n, type TranslationShape } from '../../../shared/i18n/createI18n'
export type TranslationDictionary = TranslationShape<typeof en>
export const dictionaries = { en } satisfies Record<string, TranslationDictionary>
export const { getI18n, getLocale } = createI18n(dictionaries, 'en')

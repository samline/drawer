import en from './translations/en'
import { createI18n, type TranslationShape } from '../../../shared/i18n/createI18n'

export const dictionaries = { en } as const satisfies Record<string, TranslationDictionary>
export type Locale = keyof typeof dictionaries
export const defaultLocale: Locale = 'en'
export type TranslationDictionary = TranslationShape<typeof en>

export const { getLocale, getI18n } = createI18n(dictionaries, defaultLocale)

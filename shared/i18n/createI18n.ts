/** Widen editable copy while retaining structural discriminants in rich text. */
export type TranslationShape<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly TranslationShape<Item>[]
    : T extends object
      ? { [Key in keyof T]: Key extends 'kind' ? T[Key] : TranslationShape<T[Key]> }
      : T

export function createI18n<const Dictionaries extends Record<string, unknown>>(
  dictionaries: Dictionaries,
  defaultLocale: keyof Dictionaries & string
) {
  type Locale = keyof Dictionaries & string
  const getLocale = (currentLocale?: string): Locale => {
    const language = currentLocale?.toLowerCase().split('-')[0]
    return language && Object.hasOwn(dictionaries, language) ? (language as Locale) : defaultLocale
  }
  const getI18n = ({ currentLocale }: { currentLocale?: string } = {}) =>
    dictionaries[getLocale(currentLocale)]
  return { getLocale, getI18n }
}

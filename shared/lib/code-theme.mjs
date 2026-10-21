/** Shared by Astro code components and the Markdown/MDX renderer. */
/** @type {import('shiki').ThemeRegistration} */
export const codeTheme = {
  name: 'package-site',
  type: 'dark',
  colors: {
    'editor.foreground': 'var(--palette-code-text)',
    'editor.background': 'var(--palette-code-surface)',
  },
  tokenColors: [
    {
      scope: ['comment'],
      settings: { foreground: 'var(--palette-syntax-muted)', fontStyle: 'italic' },
    },
    { scope: ['keyword', 'storage'], settings: { foreground: 'var(--palette-lavender)' } },
    { scope: ['string'], settings: { foreground: 'var(--palette-syntax-string)' } },
    {
      scope: ['entity.name.function', 'support.function'],
      settings: { foreground: 'var(--palette-syntax-tag)' },
    },
    {
      scope: ['constant.numeric', 'constant.language'],
      settings: { foreground: 'var(--palette-syntax-attribute)' },
    },
    { scope: ['entity.name.tag'], settings: { foreground: 'var(--palette-syntax-number)' } },
    {
      scope: ['entity.other.attribute-name', 'support.type.property-name'],
      settings: { foreground: 'var(--palette-syntax-function)' },
    },
    { scope: ['punctuation'], settings: { foreground: 'var(--palette-syntax-muted)' } },
  ],
}

/** Accent-derived presentation; neutral typography and layout remain the reference theme. */
export const accentTheme = (accent, dark) => {
  const mix = (amount, base = dark ? '#1d1c23' : '#ffffff') =>
    `color-mix(in srgb, ${accent} ${amount}%, ${base})`
  const values = {
    'theme-accent': accent,
    'theme-accent-soft': mix(dark ? 12 : 10, 'transparent'),
    'theme-accent-glow': mix(dark ? 28 : 22, 'transparent'),
    'palette-lavender': accent,
    'palette-heading-accent': dark ? mix(70, 'white') : accent,
    'palette-accent-hover': mix(86, dark ? 'white' : 'black'),
    'palette-hero-halo': mix(dark ? 19 : 14, 'transparent'),
    'palette-hero-halo-soft': mix(dark ? 13 : 16, 'transparent'),
  }
  for (const name of [
    'button-surface',
    'feature-surface',
    'step-surface',
    'code-surface',
    'tabs-surface',
    'tab-surface',
    'install-surface',
    'studio-surface',
  ])
    values[`palette-${name}`] = mix(dark ? 7 : 5)
  for (const name of [
    'button-hover',
    'feature-hover',
    'specimen-surface',
    'closing-surface',
    'brand-surface',
  ])
    values[`palette-${name}`] = mix(dark ? 14 : 10)
  for (const name of [
    'button-border',
    'studio-border',
    'feature-border',
    'step-border',
    'code-border',
    'tabs-border',
    'control-border',
    'brand-border',
    'closing-border',
    'border-hover',
  ])
    values[`palette-${name}`] = mix(dark ? 30 : 35)
  for (const name of [
    'studio-title',
    'specimen-label',
    'code-header',
    'feature-number',
    'control-text',
    'studio-footer',
    'stack-text',
    'closing-eyebrow',
    'closing-text',
    'closing-secondary',
  ])
    values[`palette-${name}`] = mix(dark ? 68 : 82, dark ? '#e5e2eb' : '#292233')
  values['palette-tab-active'] = mix(dark ? 32 : 23)
  values['palette-tab-text'] = dark ? '#e5e2eb' : '#292233'
  return Object.entries(values)
    .map(([name, value]) => `--${name}:${value}`)
    .join(';')
}

export const customThemeCss = project =>
  (project.accentDark !== '#b7aed2'
    ? `:root:not([data-theme="light"]),[data-theme="dark"][data-theme="dark"]{${accentTheme(project.accentDark, true)}}`
    : '') +
  (project.accentLight !== '#69518d'
    ? `[data-theme="light"][data-theme="light"]{${accentTheme(project.accentLight, false)}}`
    : '')

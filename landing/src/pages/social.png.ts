import type { APIRoute } from 'astro'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { project } from '../../../shared/lib/project.mjs'
import { escapeXml } from '../../../shared/lib/serialize'
import t from '../i18n/translations/en'

/**
 * The 1200×630 share card (og:image, twitter:image), identical in layout for
 * every package; only the copy and the dark accent change. Text is measured
 * with the bundled fonts and wrapped or scaled to fit, so nothing is clipped.
 * Every color meets WCAG AA (4.5:1) against the darkest and the lightest
 * point of the background.
 */
const W = 1200
const H = 630
const X = 80
const MAX = W - X * 2
const colors = {
  bg: '#16151b',
  title: '#f4f2f8',
  body: '#c9c3d3',
  muted: '#a9a2b5',
  rule: '#2e2b36',
  pill: '#4a4656',
}
const fonts = ['Inter.ttf', 'InstrumentSerif-Italic.ttf'].map(file =>
  resolve('../shared/assets/fonts', file)
)
const render = (svg: string) =>
  new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: fonts, defaultFontFamily: 'Inter' } })

type Font = { family: 'Inter' | 'Instrument Serif'; size: number; spacing?: number }
const attrs = ({ family, size, spacing = 0 }: Font) =>
  `font-family="${family}" font-size="${size}"${family === 'Instrument Serif' ? ' font-style="italic"' : ''}${spacing ? ` letter-spacing="${spacing}"` : ''}`

const widths = new Map<string, number>()
/** Ink width of one line of text, measured by rendering it with the bundled fonts. */
const measure = (text: string, font: Font) => {
  const key = `${attrs(font)}|${text}`
  let width = widths.get(key)
  if (width === undefined) {
    const box = render(
      `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400"><text x="0" y="300" ${attrs(font)}>${escapeXml(text)}</text></svg>`
    ).getBBox()
    width = box ? box.x + box.width : 0
    widths.set(key, width)
  }
  return width
}

/** Greedy word wrap; returns null when the text needs more than `max` lines. */
const wrap = (text: string, font: Font, max: number) => {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (!line || measure(next, font) <= MAX) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length <= max && lines.every(l => measure(l, font) <= MAX) ? lines : null
}

/** Fits the description in `max` lines: whole sentences first, then words with an ellipsis. */
const fitDescription = (text: string, font: Font, max: number) => {
  const full = wrap(text, font, max)
  if (full) return full
  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? []
  for (let n = sentences.length - 1; n > 0; n--) {
    const lines = wrap(sentences.slice(0, n).join('').trim(), font, max)
    if (lines) return lines
  }
  const words = text.split(/\s+/)
  for (let n = words.length - 1; n > 0; n--) {
    const lines = wrap(
      words
        .slice(0, n)
        .join(' ')
        .replace(/[,;:.]+$/, '') + '…',
      font,
      max
    )
    if (lines) return lines
  }
  return []
}

const lineText = (lines: string[], x: number, y: number, step: number, font: Font, fill: string) =>
  lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * step}" ${attrs(font)} fill="${fill}">${escapeXml(line)}</text>`
    )
    .join('')

export function socialSvg(input: {
  name: string
  npmName: string
  version: string
  url: string
  tagline: string
  description: string
  accent: string
  /** Command shown bottom right; defaults to `npm i <npm name>`. */
  install?: string
}) {
  const { accent } = input
  // Title: one line, as large as fits (104px down to 56px).
  let title: Font = { family: 'Inter', size: 104, spacing: -3.5 }
  while (title.size > 56 && measure(input.name, title) > MAX)
    title = { ...title, size: title.size - 2, spacing: -(title.size - 2) / 30 }

  // Tagline: one line at up to 72px, otherwise two lines at up to 64px.
  let tagline: Font = { family: 'Instrument Serif', size: 72, spacing: -0.5 }
  let taglineLines = wrap(input.tagline, tagline, 1)
  while (!taglineLines && tagline.size > 56) {
    tagline = { ...tagline, size: tagline.size - 2 }
    taglineLines = wrap(input.tagline, tagline, 1)
  }
  if (!taglineLines) {
    tagline = { ...tagline, size: 64 }
    while (!(taglineLines = wrap(input.tagline, tagline, 2)) && tagline.size > 40)
      tagline = { ...tagline, size: tagline.size - 2 }
  }
  taglineLines ??= [input.tagline]
  const taglineStep = Math.round(tagline.size * 1.08)

  const titleY = 232
  const taglineY = titleY + 22 + Math.round(tagline.size * 1.02)
  const body: Font = { family: 'Inter', size: 27, spacing: -0.2 }
  const bodyStep = 40
  const bodyY = taglineY + (taglineLines.length - 1) * taglineStep + 64
  const footerRule = 522
  const room = Math.max(1, Math.min(3, Math.floor((footerRule - 36 - bodyY) / bodyStep) + 1))
  const bodyLines = fitDescription(input.description, body, room)

  const small: Font = { family: 'Inter', size: 22 }
  const site = input.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const install = input.install ?? `npm i ${input.npmName}`
  const version = `v${input.version}`
  const pillWidth = Math.ceil(measure(version, small)) + 36
  const label: Font = { family: 'Inter', size: 24, spacing: -0.2 }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="glow" cx="1060" cy="40" r="620" gradientUnits="userSpaceOnUse"><stop stop-color="${accent}" stop-opacity=".16"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="${colors.bg}"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<rect width="${W}" height="6" fill="${accent}"/>
<circle cx="${X + 8}" cy="84" r="8" fill="${accent}"/>
<text x="${X + 30}" y="93" ${attrs(label)} fill="${colors.body}">${escapeXml(input.npmName)}</text>
<rect x="${W - X - pillWidth + 0.5}" y="62.5" width="${pillWidth - 1}" height="43" rx="21.5" fill="none" stroke="${colors.pill}" stroke-width="1.5"/>
<text x="${W - X - pillWidth / 2}" y="92" text-anchor="middle" ${attrs(small)} fill="${colors.body}">${escapeXml(version)}</text>
<text x="${X - 4}" y="${titleY}" ${attrs(title)} fill="${colors.title}" stroke="${colors.title}" stroke-width="1.4" stroke-linejoin="round">${escapeXml(input.name)}</text>
${lineText(taglineLines, X - 2, taglineY, taglineStep, tagline, accent)}
${lineText(bodyLines, X, bodyY, bodyStep, body, colors.body)}
<path d="M${X} ${footerRule}H${W - X}" stroke="${colors.rule}" stroke-width="1.5"/>
<text x="${X}" y="574" ${attrs(small)} fill="${colors.muted}">${escapeXml(site)}</text>
<text x="${W - X}" y="574" text-anchor="end" ${attrs(small)} fill="${colors.muted}">${escapeXml(install)}</text>
</svg>`
}

export const GET: APIRoute = () => {
  if (!fonts.every(path => existsSync(path)))
    throw new Error('Bundled social-image fonts are missing')
  const svg = socialSvg({
    name: project.name,
    npmName: project.npmName,
    version: project.version,
    url: project.url,
    tagline: t.sections.hero.titleAccent,
    description: project.description,
    accent: project.accentDark,
  })
  const bytes = render(svg).render().asPng()
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/png' } })
}

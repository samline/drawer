import type { APIRoute } from 'astro'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { project } from '../../../shared/lib/project.mjs'
import { escapeXml } from '../../../shared/lib/serialize'
import t from '../i18n/translations/en'
export const GET: APIRoute = () => {
  const name = escapeXml(project.name),
    description = escapeXml(
      project.description.length > 100
        ? project.description.slice(0, 97) + '…'
        : project.description
    )
  const size = Math.max(
    34,
    Math.min(78, Math.floor((1100 / Math.max(project.name.length, 1)) * 1.6))
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs><radialGradient id="halo"><stop stop-color="${project.accentDark}" stop-opacity=".25"/><stop offset="1" stop-color="${project.accentDark}" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="630" fill="#1d1c23"/><ellipse cx="1000" cy="200" rx="650" ry="500" fill="url(#halo)"/><circle cx="78" cy="75" r="8" fill="${project.accentDark}"/><text x="102" y="83" font-family="Inter" font-size="25" fill="#c5becf">${name}</text><path d="M72 118H1128" stroke="#3c3744"/><text x="72" y="260" font-family="Inter" font-size="${size}" letter-spacing="-3" fill="#e5e2eb">${name}</text><text x="72" y="365" font-family="Instrument Serif" font-style="italic" font-size="84" fill="${project.accentDark}">${escapeXml(t.sections.hero.titleAccent)}</text><text x="76" y="438" font-family="Inter" font-size="21" fill="#c5becf">${description}</text><path d="M72 506H1128" stroke="#3c3744"/><text x="76" y="563" font-family="Inter" font-size="22" fill="#b1a8bd">${escapeXml(t.common.links.docs)} · ${escapeXml(t.navigation.footer.examples)} · v${escapeXml(project.version)}</text></svg>`
  const fonts = ['Inter.ttf', 'InstrumentSerif-Italic.ttf'].map(file =>
    resolve('../shared/assets/fonts', file)
  )
  if (!fonts.every(path => existsSync(path)))
    throw new Error('Bundled social-image fonts are missing')
  const bytes = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: fonts,
    },
  })
    .render()
    .asPng()
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/png' } })
}

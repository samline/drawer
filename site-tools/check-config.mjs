import assert from 'node:assert/strict'
import { project } from '../shared/lib/project.mjs'
const rgb = hex =>
  hex
    .slice(1)
    .match(/../g)
    .map(value => {
      const n = parseInt(value, 16) / 255
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
    })
const luminance = hex => rgb(hex).reduce((n, c, i) => n + c * [0.2126, 0.7152, 0.0722][i], 0)
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
for (const [accent, background, on] of [
  [project.accentLight, '#faf9fc', '#ffffff'],
  [project.accentDark, '#1d1c23', '#101014'],
]) {
  assert.ok(
    contrast(accent, background) >= 4.5,
    `${accent} needs 4.5:1 contrast against ${background}`
  )
  assert.ok(contrast(accent, on) >= 4.5, `${accent} needs 4.5:1 contrast for button text`)
}
console.log(`Configuration valid: ${project.base}; both accent/text pairs meet 4.5:1 contrast.`)

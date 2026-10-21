/** Runs in the browser: check rendered token colors, not only highlight markup. */
export function codeColors(element: Element) {
  const style = getComputedStyle(element)
  const tokens = {
    tag: '--palette-syntax-number',
    attribute: '--palette-syntax-function',
    string: '--palette-syntax-string',
  }
  return Object.fromEntries(
    Object.entries(tokens).map(([name, variable]) => {
      const token = element.querySelector<HTMLElement>(`span[style*="${variable}"]`)
      const hex = style.getPropertyValue(variable).trim().replace('#', '')
      const expected = `rgb(${[0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16)).join(', ')})`
      return [name, { actual: token ? getComputedStyle(token).color : null, expected }]
    })
  )
}

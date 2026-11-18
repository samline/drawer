// The X for drawer close buttons (mobile menu, docs navigation and search),
// drawn as SVG like shared/components/Icon.astro instead of a typed "×",
// whose size and weight change with the visitor's fonts. Wrapped in a span
// because the drawer accepts an HTMLElement icon.
export const closeIcon = () => {
  const span = document.createElement('span')
  span.innerHTML =
    '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" focusable="false" aria-hidden="true" style="display:block"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  return span
}

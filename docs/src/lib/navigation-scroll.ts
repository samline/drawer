// Scroll only the documentation menu; never its ancestors or the article.
export const keepCurrentPageVisible = (navigation: HTMLElement) => {
  const region = navigation.closest<HTMLElement>(
    '.sidebar, [data-drawer-body], details > [data-content]'
  )
  if (!region) return

  const reveal = () => {
    const current = navigation.querySelector<HTMLElement>('a[aria-current="page"]')
    if (!current || !region.clientHeight) return

    const viewport = region.getBoundingClientRect()
    const link = current.getBoundingClientRect()
    const padding = getComputedStyle(region)
    const top = viewport.top + region.clientTop + parseFloat(padding.paddingTop)
    const available = Math.max(
      0,
      region.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom)
    )
    const inset = available * 0.2

    region.scrollTop += link.top - top - inset
  }

  // Both can resize independently: fonts/wrapping change navigation height,
  // while breakpoints and the measured header change the scroll viewport.
  const observer = new ResizeObserver(reveal)
  observer.observe(region)
  observer.observe(navigation)
  return () => observer.disconnect()
}

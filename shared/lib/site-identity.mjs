/** One document-title convention for Home, Examples and every Docs article. */
export const documentTitle = (subject, npmName) => {
  const text = String(subject ?? '').trim()
  const brand = String(npmName ?? '').trim()
  if (!text || !brand) throw new Error('A title subject and npm package name are required.')
  if (text === brand || text.endsWith(` — ${brand}`))
    throw new Error('Pass an unbranded title subject; SEO adds the package name once.')
  return `${text} — ${brand}`
}

/** Display credit is explicit site identity, independent of npm author metadata. */
export const footerCredit = name => {
  const label = String(name ?? '').trim()
  if (!label) throw new Error('A footer credit is required.')
  return `${label} · Made for the open web.`
}

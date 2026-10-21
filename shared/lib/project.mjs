import config from '../../project.config.json' with { type: 'json' }

/** @param {typeof config} [input] */
export function resolveProject(input = config) {
  for (const key of ['name', 'npmName', 'version', 'description', 'author', 'license']) {
    if (typeof input.package[key] !== 'string' || !input.package[key].trim())
      throw new Error(`package.${key} is required`)
  }
  if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(input.package.npmName))
    throw new Error('Invalid npm package name')
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(input.package.version))
    throw new Error('Use a full semver version')
  const site = new URL(input.site.url)
  const repository = new URL(input.site.repository)
  if (
    ![site, repository].every(
      url =>
        ['https:', 'http:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
    )
  )
    throw new Error(
      'Use plain HTTP(S) site and repository URLs without credentials, query or fragment'
    )
  if (/%2f|%5c|\\/i.test(site.pathname)) throw new Error('Invalid deployment path')
  site.pathname = site.pathname.replace(/\/+$/, '') + '/'
  if (!/^[a-z][a-z0-9-]+$/.test(input.site.namespace))
    throw new Error('Use a unique lowercase namespace')
  if (typeof input.site.template !== 'boolean') throw new Error('site.template must be a boolean')
  for (const color of Object.values(input.theme))
    if (!/^#[0-9a-f]{6}$/i.test(color))
      throw new Error('Accent colors must use six-digit hex values')
  for (const value of Object.values(input.delivery)) {
    if (value !== null) {
      const url = new URL(value)
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
        throw new Error('CDN assets require HTTP(S) URLs without credentials')
    }
  }
  return {
    ...input.package,
    ...input.site,
    ...input.theme,
    delivery: input.delivery,
    url: site.href,
    origin: site.origin,
    base: site.pathname,
    docsBase: site.pathname + 'docs/',
    repository: repository.href.replace(/\/$/, ''),
  }
}
export const project = resolveProject()
export const manifest = { ...project, repository: { url: project.repository } }
/** @param {string} [path] */
export const sitePath = (path = '') => project.base + path.replace(/^\//, '')

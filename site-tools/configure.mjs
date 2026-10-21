import { realpathSync } from 'node:fs'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { resolve, relative, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { createHash } from 'node:crypto'
import { resolveProject } from '../shared/lib/project.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const normalizeRepository = value =>
  String(typeof value === 'string' ? value : (value?.url ?? ''))
    .replace(/^git\+/, '')
    .replace(/^git@github.com:/, 'https://github.com/')
    .replace(/\.git$/, '')

/** Read metadata and evidence; never execute or change the source package. */
export async function prepareConfiguration(sourceDirectory, current, options = {}) {
  const directory = resolve(sourceDirectory)
  const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  if (!manifest.name || !manifest.version)
    throw new Error('The source package needs a name and version.')
  const url = options['site-url'] ?? manifest.homepage
  const repository = options.repository ?? normalizeRepository(manifest.repository)
  if (!url) throw new Error('Provide --site-url; the package has no homepage.')
  if (!repository) throw new Error('Provide --repository; the package has no repository URL.')
  const next = {
    ...current,
    package: {
      name: manifest.name,
      npmName: manifest.name,
      version: manifest.version,
      description: manifest.description || 'Describe the package before publishing.',
      author:
        typeof manifest.author === 'string'
          ? manifest.author
          : manifest.author?.name || 'Package maintainers',
      license: typeof manifest.license === 'string' ? manifest.license : 'See repository',
      keywords: manifest.keywords ?? [],
    },
    site: {
      ...current.site,
      url,
      repository,
      namespace:
        'pkg-' +
        manifest.name
          .replace(/[^a-z0-9]+/gi, '-')
          .toLowerCase()
          .replace(/^-|-$/g, ''),
      template: true,
    },
    delivery: {
      cdnScript: options['cdn-script'] ?? null,
      cdnStylesheet: options['cdn-stylesheet'] ?? null,
    },
    theme: {
      accentLight: options['accent-light'] ?? current.theme.accentLight,
      accentDark: options['accent-dark'] ?? current.theme.accentDark,
    },
  }
  resolveProject(next)
  const ignored = new Set([
    'node_modules',
    '.git',
    'dist',
    'coverage',
    '.astro',
    '.agents',
    '.codex',
    'test-results',
    'playwright-report',
  ])
  const evidence = []
  async function scan(path, prefix = '') {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (ignored.has(entry.name) || entry.isSymbolicLink()) continue
      const local = prefix + entry.name
      if (entry.isDirectory()) await scan(join(path, entry.name), local + '/')
      else if (
        /^(README|CHANGELOG|CHANGES|HISTORY)(\.|$)/i.test(entry.name) ||
        local === 'package.json' ||
        (/^(src|docs|types|example|examples)\//.test(local) &&
          /\.(mdx?|[cm]?[jt]sx?|css)$/.test(local))
      ) {
        const bytes = await readFile(join(path, entry.name))
        evidence.push({
          source: local,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          destination: null,
          reviewed: false,
        })
      }
    }
  }
  await scan(directory)
  return {
    config: next,
    context: {
      sourcePackagePath: relative(root, directory),
      package: manifest.name,
      version: manifest.version,
      exports: manifest.exports ?? null,
      main: manifest.main ?? null,
      module: manifest.module ?? null,
      types: manifest.types ?? null,
      sideEffects: manifest.sideEffects ?? null,
    },
    audit: {
      capabilityReview: { status: 'pending', integrations: [], scenarios: [], onboarding: null },
      themeReview: { status: 'pending', source: null, accentLight: null, accentDark: null },
      status: 'starter',
      packageVersion: manifest.version,
      sources: evidence,
      publicExports: [],
      notes:
        'Review all sources and actual public symbols; export paths alone are not semantic API coverage.',
    },
  }
}
export async function configure(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      package: { type: 'string' },
      'site-url': { type: 'string' },
      repository: { type: 'string' },
      'accent-light': { type: 'string' },
      'accent-dark': { type: 'string' },
      'cdn-script': { type: 'string' },
      'cdn-stylesheet': { type: 'string' },
      force: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
    },
  })
  if (!values.package)
    throw new Error(
      'Usage: npm run configure -- --package ../your-package --site-url https://owner.github.io/your-package/'
    )
  const current = JSON.parse(await readFile(join(root, 'project.config.json'), 'utf8'))
  if (!current.site.template && !values.force)
    throw new Error(
      'This site is already customized. Use --force only after reviewing the configuration/audit diff.'
    )
  const prepared = await prepareConfiguration(values.package, current, values)
  if (values['dry-run']) {
    console.log(JSON.stringify(prepared, null, 2))
    return
  }
  await mkdir(join(root, 'brief'), { recursive: true })
  await writeFile(
    join(root, 'project.config.json'),
    JSON.stringify(prepared.config, null, 2) + '\n'
  )
  await writeFile(
    join(root, 'brief/package-context.json'),
    JSON.stringify(prepared.context, null, 2) + '\n'
  )
  await writeFile(join(root, 'content-audit.json'), JSON.stringify(prepared.audit, null, 2) + '\n')
  for (const name of ['README.md', 'CHANGELOG.md']) {
    try {
      await writeFile(
        join(root, 'brief', 'source-' + name.toLowerCase()),
        await readFile(join(resolve(values.package), name))
      )
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  console.log(
    `Imported ${prepared.config.package.name}@${prepared.config.package.version}; ${prepared.audit.sources.length} evidence files inventoried. Source package unchanged. Read SITE.md and the canonical template adaptation skill to write verified content.`
  )
}
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1]))
  configure().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })

import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { project } from '../shared/lib/project.mjs'
for (const app of ['landing', 'docs']) {
  const target = new URL(`../${app}/public/`, import.meta.url)
  await mkdir(target, { recursive: true })
  const licenses = new URL('font-licenses/', target)
  await mkdir(licenses, { recursive: true })
  for (const file of await readdir(new URL('../shared/assets/fonts/', import.meta.url))) {
    if (file.endsWith('-OFL.txt'))
      await cp(new URL('../shared/assets/fonts/' + file, import.meta.url), new URL(file, licenses))
  }
  await writeFile(
    new URL('favicon.svg', target),
    (await readFile(new URL('../shared/assets/favicon.svg', import.meta.url), 'utf8')).replace(
      '{accent}',
      project.accentDark
    )
  )
}

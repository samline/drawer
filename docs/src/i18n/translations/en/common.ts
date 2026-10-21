import { manifest } from '../../../../../shared/lib/project.mjs'
export default {
  name: manifest.name,
  versionLabel: 'v{version}',
  docs: 'Documentation',
  examples: 'Working examples',
  examplesDescription: 'Try the shared preview, then copy its individual files.',
  github: 'GitHub',
  skip: 'Skip to content',
  license: manifest.license,
  footer: 'Made for the web. Built with care.',
  changelog: {
    title: 'Changelog',
    description: 'Verified release notes, including explicit breaking changes.',
  },
  reading: 'Guide',
  apiReading: 'Reference',
}

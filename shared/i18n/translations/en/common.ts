import { manifest } from '../../../lib/project.mjs'
export default {
  packageName: manifest.npmName,
  version: manifest.version,
  author: manifest.author,
  externalLinkHint: '(opens in a new tab)',
  license: manifest.license,
  versionLabel: 'v{version}',
  brandHome: '{name} home',
  links: { github: 'GitHub', docs: 'Docs', npm: 'npm', license: 'License' },
  buttons: {
    getStarted: 'Get started',
    exploreDemo: 'Explore the demo',
    starGithub: 'Star on GitHub',
  },
} as const

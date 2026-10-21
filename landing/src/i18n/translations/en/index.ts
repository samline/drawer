import sections from './sections'
import common from '../../../../../shared/i18n/translations/en/common'
import controls from '../../../../../shared/i18n/translations/en/controls'
import { project } from '../../../../../shared/lib/project.mjs'
export default {
  sections,
  common,
  controls,
  navigation: {
    mainLabel: 'Main navigation',
    skipContent: 'Skip to content',
    mobile: {
      title: `Explore ${project.name}`,
      introduction: 'A starting point, a working example, and the details when you need them.',
      resources: 'Around the project',
      label: 'Mobile navigation',
      open: 'Open navigation menu',
      close: 'Close navigation menu',
    },
    footer: {
      description: project.description,
      label: 'Footer navigation',
      explore: 'Explore',
      project: 'Project',
      setup: 'Installation guide',
      examples: 'Working examples',
      skill: 'Website adaptation skill',
      changelog: 'Changelog',
      backToTop: 'Back to top',
      credit: `${project.author} · Made for the open web.`,
    },
    items: [
      {
        href: '#features',
        label: 'Overview',
        description: 'Understand the problem and the approach.',
      },
      {
        href: '#how',
        label: 'Get started',
        description: 'Choose your setup and follow the first steps.',
      },
      {
        href: '#recipes',
        label: 'Recipes',
        description: 'Useful patterns and integration context.',
      },
      { href: '#faq', label: 'FAQ', description: 'Find the practical details.' },
      { page: 'examples', label: 'Examples', description: 'Try a preview and explore its code.' },
      {
        docsRoute: 'overview',
        label: 'Docs',
        description: 'Read guides and the complete reference.',
      },
    ],
  },
  examples: {
    exploreAction: 'Try the example',
    installAction: 'Installation guide',
    recipeEyebrow: '01 / A working interaction',
    eyebrow: 'Examples',
    title: `${project.name} examples.`,
    accent: 'examples.',
    description:
      'Try eighteen Drawer examples: filters, nested flows, snap points, non-modal inspectors and more. Copy runnable HTML/CDN or ESM files.',
    possibilities:
      'These examples show a few possibilities. The next ideas are yours: combine the package’s capabilities with your own content, design and interactions to create the experience your project needs.',
    guide: 'Read the example guide',
    navigation: 'Choose an example',
    accessibility:
      'Modal examples manage focus and restore it on close. The non-modal inspector leaves the page interactive. Each example includes named actions; the draft confirmation requires an explicit choice.',
    skill: 'Download the website adaptation skill',
  },
} as const

import { project } from '../../../shared/lib/project.mjs'
const routes = {
  overview: '',
  setup: 'getting-started/',
  options: 'reference/configuration/',
  api: 'reference/api/',
  lifecycle: 'guides/lifecycle-and-state/',
  accessibility: 'guides/accessibility-and-focus/',
  examples: 'guides/examples/',
} as const
export type DocsRoute = keyof typeof routes
export const docsHref = (route: DocsRoute) => project.docsBase + routes[route]

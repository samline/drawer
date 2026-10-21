import { project } from '../../../lib/project.mjs'
export default {
  install: { label: 'Installation method', filename: 'Terminal', cdn: 'HTML / CDN' },
  integration: { package: 'Package / ESM', html: 'HTML / CDN' },
  codeFiles: {
    label: 'Example files',
    html: 'HTML',
    css: 'CSS',
    javascript: 'JavaScript',
    complete: 'Complete file',
  },
  code: { label: 'Code example: {filename}', copyLabel: 'Copy code from {filename}' },
  copy: {
    command: `npm install ${project.npmName}`,
    label: 'Copy',
    ariaLabel: 'Copy npm install command',
    copiedLabel: 'Copied!',
    success: 'Copied to clipboard.',
    fallback: 'Code selected. Press Control+C or Command+C to copy.',
  },
  theme: {
    label: 'Dark theme',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    title: 'Switch color theme',
  },
} as const

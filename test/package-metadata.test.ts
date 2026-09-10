import { describe, expect, it } from 'vitest'

import packageJson from '../package.json'

describe('package metadata', () => {
  it('uses the Samline package identity', () => {
    expect(packageJson.name).toBe('@samline/drawer')
    expect(packageJson.homepage).toBe('https://samline.github.io/drawer')
    expect(packageJson.repository?.url).toBe('git+https://github.com/samline/drawer.git')
    expect(packageJson.bugs?.url).toBe('https://github.com/samline/drawer/issues')
  })

  it('publishes the expected multi-entry surface', () => {
    expect(packageJson.exports).toMatchObject({
      '.': expect.any(Object),
      './browser': {
        types: './dist/browser/index.d.ts',
        import: './dist/browser/index.js',
        require: './dist/browser/index.cjs'
      },
      './styles.css': './dist/style.css',
      './style.css': './dist/style.css'
    })

    expect(packageJson.files).toEqual(['dist'])
  })

  it('preserves the CSS and global bundle side effects', () => {
    expect(packageJson.sideEffects).toEqual(['./dist/browser/global.global.js', './dist/style.css'])
  })
})

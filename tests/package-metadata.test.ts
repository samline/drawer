import { describe, expect, it } from 'vitest';

import packageJson from '../package.json';

describe('package metadata', () => {
  it('uses the Samline package identity', () => {
    expect(packageJson.name).toBe('@samline/drawer');
    expect(packageJson.homepage).toBe('https://github.com/samline/drawer');
    expect(packageJson.repository?.url).toBe('git+https://github.com/samline/drawer.git');
    expect(packageJson.bugs?.url).toBe('https://github.com/samline/drawer/issues');
  });

  it('publishes the expected multi-entry surface', () => {
    expect(packageJson.exports).toMatchObject({
      '.': expect.any(Object),
      './browser': {
        import: {
          types: './dist/browser/index.d.mts',
          default: './dist/browser/index.mjs',
        },
        require: {
          types: './dist/browser/index.d.ts',
          default: './dist/browser/index.cjs',
        },
        default: './dist/browser/index.mjs',
      },
      './core': expect.any(Object),
      './styles.css': './dist/style.css',
      './style.css': './dist/style.css',
    });

    expect(packageJson.files).toEqual(['dist']);
  });
});
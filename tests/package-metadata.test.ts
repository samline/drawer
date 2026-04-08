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
      './react': expect.any(Object),
      './browser': expect.any(Object),
      './vue': expect.any(Object),
      './svelte': expect.any(Object),
      './core': expect.any(Object),
      './styles.css': './style.css',
    });
  });
});
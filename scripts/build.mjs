import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const watchMode = process.argv.includes('--watch');
const tempDir = mkdtempSync(path.join(rootDir, '.bunchee-build-'));
const tempPackageJsonPath = path.join(tempDir, 'package.json');
const tempSrcPath = path.join(tempDir, 'src');
const tempTsconfigPath = path.join(tempDir, 'tsconfig.json');
const syncScriptPath = path.join(rootDir, 'scripts', 'sync-dist.mjs');

const cleanup = () => {
  rmSync(tempDir, { recursive: true, force: true });
};

const setupTempWorkspace = () => {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.exports) {
    delete packageJson.exports['./styles.css'];
    delete packageJson.exports['./style.css'];
  }

  writeFileSync(tempPackageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  if (!existsSync(tempSrcPath)) {
    symlinkSync(path.join(rootDir, 'src'), tempSrcPath, 'dir');
  }

  if (!existsSync(tempTsconfigPath)) {
    symlinkSync(tsconfigPath, tempTsconfigPath);
  }
};

setupTempWorkspace();

try {
  if (watchMode) {
    const successCommand = `bun ${JSON.stringify(syncScriptPath)} ${JSON.stringify(tempDir)} ${JSON.stringify(rootDir)}`;
    const processHandle = Bun.spawn(['bunx', 'bunchee', '--watch', '--success', successCommand], {
      cwd: tempDir,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });

    const exitCode = await processHandle.exited;
    process.exitCode = exitCode;
  } else {
    const buildProcess = Bun.spawnSync(['bunx', 'bunchee'], {
      cwd: tempDir,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });

    if (buildProcess.exitCode !== 0) {
      process.exitCode = buildProcess.exitCode;
    } else {
      await Bun.spawn(['bun', syncScriptPath, tempDir, rootDir], {
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit',
      }).exited;
    }
  }
} finally {
  cleanup();
}
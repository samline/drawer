import { copyFileSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';

const [, , sourceRoot, targetRoot] = process.argv;

if (!sourceRoot || !targetRoot) {
  throw new Error('Usage: bun scripts/sync-dist.mjs <source-root> <target-root>');
}

const sourceDist = path.join(sourceRoot, 'dist');
const targetDist = path.join(targetRoot, 'dist');
const sourceStyles = path.join(targetRoot, 'src', 'style.css');
const targetStyles = path.join(targetRoot, 'style.css');

rmSync(targetDist, { recursive: true, force: true });
cpSync(sourceDist, targetDist, { recursive: true });
copyFileSync(sourceStyles, targetStyles);
import { copyFileSync, cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { build } from 'esbuild';
import { parseHTML } from 'linkedom';

const [, , sourceRoot, targetRoot] = process.argv;

if (!sourceRoot || !targetRoot) {
  throw new Error('Usage: bun scripts/sync-dist.mjs <source-root> <target-root>');
}

const sourceDist = path.join(sourceRoot, 'dist');
const targetDist = path.join(targetRoot, 'dist');
const sourceStyles = path.join(targetRoot, 'src', 'style.css');
const targetStyles = path.join(targetDist, 'style.css');
const sourceSrc = path.join(targetRoot, 'src');

rmSync(targetDist, { recursive: true, force: true });
cpSync(sourceDist, targetDist, { recursive: true });
copyFileSync(sourceStyles, targetStyles);

const injectedStyleAttribute = 'data-drawer-runtime-styles';
const reactImportPattern = /^\s*(?:import\s+(?:.+\s+from\s+)?['"]react(?:-dom(?:\/client)?)?['"]|(?:var|const|let)\s+.+\s*=\s*require\(['"]react(?:-dom(?:\/client)?)?['"]\))/m;

function toText(outputFile) {
  return new TextDecoder().decode(outputFile.contents);
}

function createStyleInjector(cssText) {
  if (!cssText.trim()) {
    return '';
  }

  return `(() => {\n  if (typeof document === 'undefined') return;\n  if (document.querySelector('style[${injectedStyleAttribute}]')) return;\n  const style = document.createElement('style');\n  style.setAttribute('${injectedStyleAttribute}', '');\n  style.textContent = ${JSON.stringify(cssText)};\n  (document.head || document.documentElement).appendChild(style);\n})();\n`;
}

async function bundleEntry({ entryPoint, outfile, format, external = [], globalName }) {
  const result = await build({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    write: false,
    format,
    globalName,
    external,
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'none',
    logLevel: 'silent',
    jsx: 'transform',
    sourcemap: false,
  });

  const jsOutput = result.outputFiles.find((file) => path.resolve(file.path) === path.resolve(outfile));

  if (!jsOutput) {
    throw new Error(`Missing JS output for ${outfile}`);
  }

  const cssOutput = result.outputFiles.find((file) => file.path.endsWith('.css'));
  const cssText = cssOutput ? toText(cssOutput) : '';
  const code = `${createStyleInjector(cssText)}${toText(jsOutput)}`;

  writeFileSync(outfile, code);
}

async function buildRuntimeBundles() {
  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'index.ts'),
    outfile: path.join(targetDist, 'index.mjs'),
    format: 'esm',
  });

  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'index.ts'),
    outfile: path.join(targetDist, 'index.js'),
    format: 'cjs',
  });

  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'svelte', 'index.ts'),
    outfile: path.join(targetDist, 'svelte', 'index.mjs'),
    format: 'esm',
  });

  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'svelte', 'index.ts'),
    outfile: path.join(targetDist, 'svelte', 'index.js'),
    format: 'cjs',
  });

  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'vue', 'index.ts'),
    outfile: path.join(targetDist, 'vue', 'index.mjs'),
    format: 'esm',
    external: ['vue'],
  });

  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'vue', 'index.ts'),
    outfile: path.join(targetDist, 'vue', 'index.js'),
    format: 'cjs',
    external: ['vue'],
  });

  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'browser', 'index.ts'),
    outfile: path.join(targetDist, 'browser', 'index.mjs'),
    format: 'esm',
  });

  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'browser', 'index.ts'),
    outfile: path.join(targetDist, 'browser', 'index.cjs'),
    format: 'cjs',
  });

  await bundleEntry({
    entryPoint: path.join(sourceSrc, 'browser', 'index.ts'),
    outfile: path.join(targetDist, 'browser', 'index.js'),
    format: 'iife',
    globalName: '__samlineDrawerBrowser',
  });
}

function assertNoExternalReact(filePath) {
  const contents = readFileSync(filePath, 'utf8');

  if (reactImportPattern.test(contents)) {
    throw new Error(`Found external React import in ${filePath}`);
  }
}

function verifyBrowserGlobalBundle() {
  const code = readFileSync(path.join(targetDist, 'browser', 'index.js'), 'utf8');
  const { window } = parseHTML('<!doctype html><html><head></head><body><button id="trigger">Open</button></body></html>');
  const trigger = window.document.getElementById('trigger');
  const timerHandles = new Set();
  const nativeSetTimeout = globalThis.setTimeout;
  const nativeClearTimeout = globalThis.clearTimeout;

  const sandboxSetTimeout = (callback, delay = 0, ...args) => {
    const handle = nativeSetTimeout(() => {
      timerHandles.delete(handle);
      callback(...args);
    }, delay);

    timerHandles.add(handle);
    return handle;
  };

  const sandboxClearTimeout = (handle) => {
    timerHandles.delete(handle);
    nativeClearTimeout(handle);
  };

  if (!trigger) {
    throw new Error('Failed to create trigger element for browser bundle verification');
  }

  window.window = window;
  window.self = window;
  window.global = window;
  window.globalThis = window;
  window.location = new URL('https://example.com/');
  window.history = {
    state: null,
    pushState() {},
    replaceState() {},
    back() {},
    forward() {},
    go() {},
  };
  window.console = console;
  window.setTimeout = sandboxSetTimeout;
  window.clearTimeout = sandboxClearTimeout;
  window.queueMicrotask = queueMicrotask;
  window.requestAnimationFrame = (callback) => sandboxSetTimeout(() => callback(Date.now()), 16);
  window.cancelAnimationFrame = (handle) => sandboxClearTimeout(handle);
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  });
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };
  window.getComputedStyle = () => ({
    getPropertyValue() {
      return '';
    },
    overflow: 'visible',
  });

  const sandbox = {
    window,
    self: window,
    global: window,
    globalThis: window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    history: window.history,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Node: window.Node,
    Text: window.Text,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    MouseEvent: window.MouseEvent,
    MutationObserver: window.MutationObserver,
    ResizeObserver: window.ResizeObserver,
    console,
    setTimeout: sandboxSetTimeout,
    clearTimeout: sandboxClearTimeout,
    queueMicrotask,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    getComputedStyle: window.getComputedStyle,
    matchMedia: window.matchMedia,
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  if (!sandbox.window.Drawer || typeof sandbox.window.Drawer.createDrawer !== 'function') {
    throw new Error('Browser global bundle did not attach window.Drawer');
  }

  const drawer = sandbox.window.Drawer.createDrawer({
    id: 'cdn-smoke',
    triggerElement: trigger,
    title: 'Smoke test',
    description: 'Browser bundle verification',
    content: 'Drawer body',
  });

  drawer.setOpen(true);

  const styleElement = sandbox.document.querySelector(`style[${injectedStyleAttribute}]`);
  const mountedHost = sandbox.document.querySelector('[data-drawer-vanilla-root="cdn-smoke"]');

  if (!styleElement) {
    throw new Error('Browser global bundle did not inject runtime styles');
  }

  if (!mountedHost) {
    throw new Error('Browser global bundle did not mount a drawer host');
  }

  sandbox.window.Drawer.destroyDrawers();
  timerHandles.forEach((handle) => nativeClearTimeout(handle));
  timerHandles.clear();
}

function verifyBundles() {
  const noReactFiles = [
    path.join(targetDist, 'index.js'),
    path.join(targetDist, 'index.mjs'),
    path.join(targetDist, 'svelte', 'index.js'),
    path.join(targetDist, 'svelte', 'index.mjs'),
    path.join(targetDist, 'vue', 'index.js'),
    path.join(targetDist, 'vue', 'index.mjs'),
    path.join(targetDist, 'browser', 'index.cjs'),
    path.join(targetDist, 'browser', 'index.mjs'),
    path.join(targetDist, 'browser', 'index.js'),
  ];

  noReactFiles.forEach(assertNoExternalReact);
  verifyBrowserGlobalBundle();
}

await buildRuntimeBundles();
verifyBundles();
process.exit(0);
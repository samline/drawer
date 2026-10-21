// Inline the small route stylesheets to avoid serial render-blocking requests.
// Keep larger shared CSS cacheable and preserve Vite's defaults for other assets.
export const inlineSmallStylesheets = (path, content) =>
  path.endsWith('.css') ? content.byteLength < 40 * 1024 : undefined

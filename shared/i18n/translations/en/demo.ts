export const presets = {
  bottom: {
    title: 'The everyday bottom sheet',
    direction: 'bottom',
    description:
      'A little more room for the next step. Drag down, press Escape, or use the close button.',
  },
  top: {
    title: 'A command panel from above',
    direction: 'top',
    description: 'Keep quick actions within reach, then dismiss the panel to return to your page.',
  },
  left: {
    title: 'Navigation with room to browse',
    direction: 'left',
    description: 'Open navigation from the left edge without leaving the current page.',
  },
  right: {
    title: 'A side panel for the details',
    direction: 'right',
    description: 'Keep the page in view while you explore. The same API works from all four edges.',
  },
  snaps: {
    title: 'Three stops. One fluid sheet.',
    direction: 'bottom',
    description: 'Drag the sheet or click its handle to move between ordered snap points.',
  },
  nested: {
    title: 'Go one level deeper',
    direction: 'bottom',
    description:
      'Open a child drawer. Drawer coordinates its parent, focus, and shared scroll lock.',
  },
  form: {
    title: 'Filters that return a result',
    direction: 'bottom',
    description:
      'Choose a category and apply it. A labeled form owns the input; Drawer owns focus and dismissal.',
  },
  scroll: {
    title: 'Read more without losing your place',
    direction: 'right',
    description:
      'Scroll a long panel independently of the page. Its close action stays within reach.',
  },
  nonmodal: {
    title: 'Keep the page interactive',
    direction: 'right',
    description:
      'A non-modal inspector has no backdrop or focus trap. You can still use the page while it is open.',
  },
  handle: {
    title: 'Drag the handle, not the content',
    direction: 'bottom',
    description:
      'Select text and use inputs normally. Only a drag that starts on the handle moves this sheet.',
  },
  update: {
    title: 'Update content in place',
    direction: 'bottom',
    description:
      'Load another detail into the same instance with update(). No second drawer or global event handler.',
  },
  controlled: {
    title: 'Choose the size explicitly',
    direction: 'bottom',
    description:
      'Compact and expanded actions call setActiveSnapPoint(). The native handle and gestures still work.',
  },
} as const
export type DemoPreset = keyof typeof presets
const demo = {
  title: presets.bottom.title,
  category: 'Category',
  all: 'All products',
  books: 'Books',
  tools: 'Tools',
  apply: 'Apply filters',
  applied: 'Selected category:',
  loadNext: 'Load the next detail',
  updatedTitle: 'Your next detail',
  updatedContent:
    'The same drawer now shows fresh content. Close and reopen it to see the retained update.',
  compact: 'Compact',
  expanded: 'Expanded',
  noteLabel: 'Your notes',
  notePlaceholder: 'Select text or write a note…',
  scrollTitle: 'A guide worth keeping open',
  scrollContentLabel: 'Drawer reading area',
  scrollSections: [
    'Getting oriented',
    'Preparing your work',
    'Choosing the next step',
    'Reviewing the details',
    'Making room for changes',
    'Returning to the page',
    'Keeping your place',
    'Wrapping up',
  ],
  scrollParagraph:
    'The panel scrolls independently. Use a touch gesture, mouse wheel or keyboard to read the next section. Closing returns focus to the original trigger.',
  backgroundAction: 'Try a page action',
  backgroundResult: 'The page is still interactive.',

  tabs: [
    { id: 'bottom', label: 'Bottom sheet' },
    { id: 'right', label: 'Side panel' },
    { id: 'snaps', label: 'Snap points' },
    { id: 'nested', label: 'Nested flow' },
  ],
  previewTagline: 'Live · @samline/drawer',
  nonmodalHint:
    'No backdrop, focus trap or page scroll lock. Use the page action while this inspector is open.',
  handleHint:
    'Drag only the native handle. Content gestures and keyboard controls remain independent.',
  description:
    'Real package behavior: drag to dismiss, modal focus, Escape and a close button. Your CSS sets the shape.',
  label: 'Drawer playground',
  increment: 'Open drawer',
  reset: 'Close drawer',
  count: 'State',
  stateClosed: 'Closed',
  stateOpen: 'Open',
  childTitle: 'One level deeper',
  childDescription: 'A second step, without losing your place.',
  childContent:
    'Close this drawer to return to the first step. Each layer keeps its own focus and dismissal.',
  openChild: 'Open child drawer',
  closeChild: 'Close child',
  close: 'Close drawer',
  interactionHint: 'Drag the handle, press Escape, or use the close button.',
  panelDescription: 'A working example. The page stays right where you left it.',
  previewEyebrow: 'Your page, uninterrupted',
  previewTitle: 'Keep the context.',
  previewAccent: 'Open the details.',
  previewDescription:
    'Try the interaction below. Each panel uses Drawer’s public API and the same visual language as this page.',
  contentHeading: 'Everything you need, right here.',
  contentItems: [
    'The page stays in view',
    'Keyboard and pointer dismissal',
    'Your content and your styles',
  ],
  frameworkLabel: 'Choose your framework',
  modeLabel: 'Choose a loading mode',
  esm: 'Package / ESM',
  cdn: 'HTML / CDN',
  esmNote:
    'Install @samline/drawer, save these files together in an HTML-entry bundler such as Vite, and start its development server.',
  learn: 'Read the integration guide',
  noscript:
    'Enable JavaScript to open the drawer. All guides and source files are readable without it.',
  openCode: 'Explore the code',
  note: 'Save the HTML, CSS and JavaScript files together, or copy the complete file. Both load the pinned browser bundle and stylesheet from unpkg; an internet connection is required.',
  copyComplete: 'Copy the complete example',
}
export default demo

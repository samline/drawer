export const presets = {
  bottom: {
    panelTitle: 'Your shopping bag',
    panelDescription: 'Review the items, quantities and subtotal before continuing.',
    title: 'The everyday bottom sheet',
    direction: 'bottom',
    description:
      'A little more room for the next step. Drag down, press Escape, or use the close button.',
  },
  top: {
    panelTitle: 'Quick actions',
    panelDescription: 'Search for a workspace command and choose your next action.',
    title: 'A command panel from above',
    direction: 'top',
    description: 'Keep quick actions within reach, then dismiss the panel to return to your page.',
  },
  left: {
    panelTitle: 'Studio workspace',
    panelDescription: 'Choose a project, team or workspace settings destination.',
    title: 'Navigation with room to browse',
    direction: 'left',
    description: 'Open navigation from the left edge without leaving the current page.',
  },
  right: {
    panelTitle: 'Everyday tote',
    panelDescription: 'Review materials, dimensions and price before shortlisting this item.',
    title: 'A side panel for the details',
    direction: 'right',
    description: 'Keep the page in view while you explore. The same API works from all four edges.',
  },
  snaps: {
    panelTitle: 'Your day in Mexico City',
    panelDescription: 'Browse the stops and times in this sample day itinerary.',
    title: 'Three stops. One fluid sheet.',
    direction: 'bottom',
    description: 'Drag the sheet or click its handle to move between ordered snap points.',
  },
  nested: {
    panelTitle: 'Order summary',
    panelDescription: 'Choose delivery while keeping your two items and subtotal in view.',
    title: 'Open a drawer inside another',
    direction: 'bottom',
    description:
      'Open a child drawer. Drawer coordinates its parent, focus, and shared scroll lock.',
  },
  form: {
    panelTitle: 'Filter the collection',
    panelDescription: 'Choose a category and sort order for the collection.',
    title: 'Filters that return a result',
    direction: 'bottom',
    description:
      'Choose a category and apply it. A labeled form owns the input; Drawer owns focus and dismissal.',
  },
  scroll: {
    panelTitle: 'Project hand-off guide',
    panelDescription: 'Read the practical steps for handing a project to its next maintainer.',
    title: 'Read more without losing your place',
    direction: 'right',
    description:
      'Scroll a long panel independently of the page. Its close action stays within reach.',
  },
  nonmodal: {
    panelTitle: 'Canvas inspector',
    panelDescription: 'Inspect the hero layout while the canvas remains interactive.',
    title: 'Keep the page interactive',
    direction: 'right',
    description:
      'A non-modal inspector has no backdrop or focus trap. You can still use the page while it is open.',
  },
  handle: {
    panelTitle: 'Review notes',
    panelDescription: 'Write launch-review feedback while keeping your checklist close.',
    title: 'Drag the handle, not the content',
    direction: 'bottom',
    description:
      'Select text and use inputs normally. Only a drag that starts on the handle moves this sheet.',
  },
  update: {
    panelTitle: 'Order STUDIO-1042',
    panelDescription: 'Review your order confirmation, then load its packing update.',
    title: 'Update content in place',
    direction: 'bottom',
    description:
      'Load another detail into the same instance with update(). No second drawer or global event handler.',
  },
  controlled: {
    panelTitle: 'Boarding pass',
    panelDescription: 'View boarding time and baggage details for this fictional sample flight.',
    title: 'Choose the size explicitly',
    direction: 'bottom',
    description:
      'Compact and expanded actions call setActiveSnapPoint(). The native handle and gestures still work.',
  },
  account: {
    panelTitle: 'Your account',
    panelDescription: 'Choose your personal or team workspace, or open account settings.',
    title: 'An account menu that travels with you',
    direction: 'right',
    description: 'Switch workspaces or open account actions without losing the current page.',
  },
  actions: {
    panelTitle: 'Project brief.pdf',
    panelDescription: 'Choose a contextual action for this document.',
    title: 'A file action sheet, ready for touch',
    direction: 'bottom',
    description:
      'Group contextual actions in a comfortable sheet. Report the selection back to the page.',
  },
  confirm: {
    panelTitle: 'Unsaved launch note',
    panelDescription: 'Choose whether to keep your draft, discard it or continue editing.',
    title: 'Make consequential choices explicit',
    direction: 'bottom',
    description:
      'An unsaved draft needs a decision. Outside clicks and gestures cannot dismiss this confirmation.',
  },
  wizard: {
    panelTitle: 'Make it your everyday tote',
    panelDescription: 'Choose a finish, review your selection and go back without losing it.',
    title: 'A guided flow, one step at a time',
    direction: 'bottom',
    description: 'Keep selections while moving forward and back inside one owned drawer.',
  },
  independent: {
    panelTitle: 'Project notes',
    panelDescription: 'Keep your review notes open beside an independent activity panel.',
    title: 'Two panels, independent lives',
    direction: 'left',
    description:
      'Open notes and activity together. Neither is the parent; closing one leaves the other open.',
  },
  styled: {
    panelTitle: 'A place on the team',
    panelDescription: 'Alex invited you to the Studio workspace.',
    title: 'The same Drawer, a different design',
    direction: 'bottom',
    description:
      'A floating invitation card: custom width, all-around corners and a soft accent gradient. Your CSS sets the design.',
  },
} as const
export type DemoPreset = keyof typeof presets
export const flowPreviews: Partial<Record<DemoPreset, { eyebrow: string; heading: string }>> = {
  wizard: { eyebrow: 'CUSTOM TOTE / 3 STEPS', heading: 'Choose. Personalize. Review.' },
  independent: { eyebrow: 'PROJECT WORKSPACE', heading: 'Notes here. Activity there.' },
  styled: { eyebrow: 'STUDIO / AN INVITATION', heading: 'Your design sets the shape.' },
}
export const resetBehavior = {
  bottom: 'feedback',
  top: 'feedback',
  left: 'feedback',
  right: 'feedback',
  snaps: 'none',
  nested: 'none',
  form: 'feedback',
  scroll: 'none',
  nonmodal: 'feedback',
  handle: 'none',
  update: 'content',
  controlled: 'none',
  account: 'feedback',
  actions: 'feedback',
  confirm: 'feedback',
  wizard: 'feedback',
  independent: 'none',
  styled: 'feedback',
} as const satisfies Record<DemoPreset, 'feedback' | 'content' | 'none'>
export const menus = {
  top: {
    eyebrow: 'QUICK COMMANDS',
    heading: 'What would you like to do?',
    hint: 'Find a command by typing a project, document or teammate action.',
    items: [
      { label: 'Create a project', detail: 'Start with a clean canvas', icon: '＋' },
      { label: 'Find a document', detail: 'Search your workspace', icon: '⌕' },
      { label: 'Invite a teammate', detail: 'Make room for collaboration', icon: '↗' },
    ],
  },
  left: {
    eyebrow: 'STUDIO / WORKSPACE',
    heading: 'A place for your next idea.',
    hint: 'Browse projects, invite your team or change workspace settings.',
    items: [
      { label: 'Overview', detail: 'Your projects at a glance', icon: '◫' },
      { label: 'Projects', detail: '12 active projects', icon: '▤' },
      { label: 'Team', detail: 'People and permissions', icon: '♧' },
      { label: 'Settings', detail: 'Make this space yours', icon: '⚙' },
    ],
  },
  account: {
    eyebrow: 'SIGNED IN AS ALEX',
    heading: 'Your spaces. One account.',
    hint: 'Keep private projects separate from shared team work.',
    items: [
      { label: 'Personal workspace', detail: 'Your private projects', icon: 'A' },
      { label: 'Studio workspace', detail: 'Shared with 6 teammates', icon: 'S' },
      { label: 'Account settings', detail: 'Profile and preferences', icon: '⚙' },
    ],
  },
  actions: {
    eyebrow: 'PROJECT BRIEF.PDF · 2.4 MB',
    heading: 'Keep the file. Open the possibilities.',
    hint: 'Choose what to do with Project brief.pdf.',
    items: [
      { label: 'Add to favorites', detail: 'Keep it close for later', icon: '☆' },
      { label: 'Make a copy', detail: 'Start another version', icon: '▣' },
      { label: 'Move to a folder', detail: 'Put everything in its place', icon: '↗' },
    ],
  },
  confirm: {
    eyebrow: 'UNSAVED DRAFT',
    heading: 'Keep what you have started?',
    hint: 'Your launch note has unsaved changes. Keep the draft, discard it, or return to editing.',
    items: [
      { label: 'Save draft', detail: 'Keep your work for later', icon: '✓' },
      { label: 'Discard draft', detail: 'Close without saving', icon: '×' },
      { label: 'Continue editing', detail: 'Return to your page', icon: '↶' },
    ],
  },
} as const
export type MenuPreset = keyof typeof menus
export const scenes = {
  bottom: {
    eyebrow: 'YOUR BAG · 2 ITEMS',
    heading: 'Good things, ready to go.',
    items: [
      { title: 'Everyday tote', detail: 'Natural canvas · Qty 1', value: '$32' },
      { title: 'Studio notebook', detail: 'Dotted pages · Qty 1', value: '$18' },
      { title: 'Subtotal', detail: 'Delivery is chosen at checkout.', value: '$50' },
    ],
    action: 'Review checkout',
  },
  right: {
    eyebrow: 'THE EVERYDAY COLLECTION',
    heading: 'Carry a little less.',
    items: [
      {
        title: 'Everyday tote',
        detail: 'A lightweight canvas bag for the daily essentials.',
        value: '$32',
      },
      {
        title: 'Materials and fit',
        detail: 'Recycled cotton · 38 × 42 cm · In stock',
        value: '14 L',
      },
    ],
    action: 'Add to your shortlist',
  },
  snaps: {
    eyebrow: 'WEEKEND IN MEXICO CITY',
    heading: 'A day with room to wander.',
    items: [
      {
        title: 'Coffee in Roma Norte',
        detail: 'Start slowly with a neighborhood walk.',
        value: '09:00',
      },
      {
        title: 'Explore Chapultepec',
        detail: 'Art, a picnic and a little fresh air.',
        value: '11:30',
      },
      {
        title: 'Dinner with friends',
        detail: 'Leave the evening open for something new.',
        value: '19:00',
      },
    ],
    action: '',
  },
  nested: {
    eyebrow: 'CHECKOUT / DELIVERY',
    heading: 'Review your delivery.',
    items: [
      {
        title: 'Everyday tote + Studio notebook',
        detail: 'Two items · subtotal before delivery.',
        value: '$50',
      },
      {
        title: 'Delivery options',
        detail: 'Choose a delivery option below.',
        value: '→',
      },
    ],
    action: '',
  },
  nonmodal: {
    eyebrow: 'LAYOUT INSPECTOR',
    heading: 'Work beside your canvas.',
    items: [
      {
        title: 'Selected: Hero section',
        detail: 'Editing the hero of a product landing page.',
        value: '◫',
      },
      {
        title: 'Canvas layout',
        detail: 'Toggle the layout grid while the canvas stays interactive.',
        value: '↗',
      },
    ],
    action: '',
  },
  handle: {
    eyebrow: 'IDEAS / QUICK NOTE',
    heading: 'Catch an idea before it goes.',
    items: [
      {
        title: 'Launch review checklist',
        detail:
          'Check keyboard navigation, narrow layouts and the installation snippet. Add your review notes below.',
        value: '✎',
      },
    ],
    action: '',
  },
  update: {
    eyebrow: 'ORDER STUDIO-1042',
    heading: 'Follow the next step.',
    items: [
      {
        title: 'Order confirmed',
        detail: 'Your tote and notebook are being prepared.',
        value: '✓',
      },
      {
        title: 'Next: packed for delivery',
        detail: 'See when your items are packed and what happens next.',
        value: '02',
      },
    ],
    action: '',
  },
  controlled: {
    eyebrow: 'SAMPLE BOARDING PASS · ST204',
    heading: 'Your flight, at a glance.',
    items: [
      { title: 'Mexico City → Oaxaca', detail: 'Terminal 2 · Gate 12 · Economy', value: '08:15' },
      { title: 'Boarding', detail: 'Have your travel document ready at the gate.', value: '07:40' },
      { title: 'Cabin baggage', detail: 'One cabin bag and one personal item.', value: '2 items' },
      {
        title: 'Before departure',
        detail:
          'Check the airport screens for gate changes. This is a fictional sample boarding pass.',
        value: 'ST204',
      },
    ],
    action: '',
  },
} as const
export type ScenePreset = keyof typeof scenes
export const deliveryOptions = [
  {
    label: 'Standard delivery',
    detail: 'Free · Arrives in 3–5 business days',
    icon: '□',
    value: 'Standard delivery · $0 · 3–5 business days',
  },
  {
    label: 'Express delivery',
    detail: '$8 · Arrives in 1–2 business days',
    icon: '↗',
    value: 'Express delivery · $8 · 1–2 business days',
  },
] as const
export const flow = {
  wizardHint:
    'Back keeps your choices within this open panel. Confirmation reports a local sample selection; closing and reopening starts a fresh form.',
  stepLabel: 'Step',
  steps: ['Choose the finish', 'Make it yours', 'Review your tote'],
  finish: 'Canvas finish',
  finishes: ['Natural canvas', 'Midnight canvas'],
  initials: 'Initials (optional)',
  initialsHint: 'Up to three characters, printed on the inside pocket.',
  initialsPlaceholder: 'e.g. AM',
  noInitials: 'No initials',
  next: 'Continue',
  back: 'Back',
  confirm: 'Confirm sample selection',
  result: 'Configured:',
  summary: 'Everyday tote · $32 · Your selection',
  notesHint: 'Write a review note, then open activity. You can close either panel separately.',
  notesLabel: 'Project review note',
  notesPlaceholder: 'What should the team review next?',
  activityTitle: 'Project activity',
  activityDescription:
    'Recent updates from your product team. Keep this log open beside your review notes.',
  openActivity: 'Open activity',
  closeActivity: 'Close activity',
  activityEntries: [
    { title: 'Alex added the product shots', detail: 'Today · 09:20' },
    { title: 'Maya updated the launch checklist', detail: 'Today · 09:05' },
  ],
  independentHint:
    'These non-modal panels have separate controllers and close actions. On small screens they occupy separate upper and lower regions.',
  styledEyebrow: 'STUDIO / AN INVITATION',
  styledHeading: 'Good work starts together.',
  styledBody:
    'Join the product team to share projects, review designs and keep decisions in one place.',
  styledDetails: 'Product team · 6 teammates · Member access',
  styledAction: 'Accept sample invitation',
  styledNotice: 'Sample invitation only. Accepting does not create or change a real account.',
  styledHint:
    'This is a local sample invitation. The floating shape and gradient are application CSS, not a built-in Drawer theme.',
} as const
const demo = {
  title: presets.bottom.title,
  resetLabel: 'Reset between attempts',
  resetDisclaimer:
    'A playground helper for repeat trials; it is not part of Drawer or the copied integration code.',
  resetHints: {
    feedback:
      'Clear the previous result when you reopen. A completed choice stays visible after closing so you can read it. Uncheck to keep that result between attempts; panel inputs still recreate normally.',
    nonmodal:
      'Clear page-action feedback and hide the canvas grid on close. Uncheck to retain the inspector settings and feedback between attempts.',
    content:
      'Restore the original order information and its update button when you reopen. Uncheck to keep the changed title and content.',
  },
  gridLabel: 'Show canvas grid',
  canvasTitle: 'A canvas you can keep editing',
  canvasDescription:
    'Use the inspector to reveal its layout grid, or try the page action while the inspector stays open.',
  deliveryGroup: 'Delivery options',
  deliveryInitial: 'No delivery selected',
  draftPreview:
    'Launch note: The new collection goes live on Friday. Add the product screenshots before the review.',
  commandSearch: 'Search commands',
  commandPlaceholder: 'Try project, document or teammate…',
  noCommands: 'No commands match. Try another name.',
  selected: 'Selected:',
  category: 'Category',
  all: 'All products',
  books: 'Books',
  tools: 'Tools',
  apply: 'Apply filters',
  sort: 'Sort by',
  recommended: 'Recommended',
  newest: 'Newest first',
  price: 'Price: low to high',
  filterHint:
    'Narrow the collection, then return to browsing. Your selection is reported below the preview.',
  applied: 'Selected category:',
  loadNext: 'Show packing update',
  updatedTitle: 'Packed and ready to go',
  updatedContent:
    'Order STUDIO-1042 is packed: one Everyday tote and one Studio notebook. Standard delivery takes 3–5 business days. Next step: hand-off to the carrier.',
  compact: 'Compact',
  expanded: 'Expanded',
  noteLabel: 'Your notes',
  notePlaceholder: 'Select text or write a note…',
  scrollTitle: 'A guide worth keeping open',
  scrollContentLabel: 'Drawer reading area',
  scrollSections: [
    'Project overview',
    'Run the project',
    'Design assets',
    'Keyboard review',
    'Forms and error states',
    'Loading and content',
    'Deployment checklist',
    'Ownership and follow-up',
  ],
  scrollParagraphs: [
    'Start a hand-off with the purpose of the project, its intended audience and the decisions already agreed with the team. Link the source repository and identify which journeys must work before release.',
    'Record the supported runtime, the package-manager command, the development command and the production build command. List required environment variable names, with safe sample values rather than credentials. Ask a teammate to try these steps on a fresh checkout.',
    'Point to the approved fonts, color tokens, icons and image sources. Note license requirements and where editable assets live. Keep the component inventory close to the design files so changes can be made in the right shared owner.',
    'Walk through the main journey with Tab, Shift+Tab, Enter and Escape. Check visible focus, names on icon buttons, form labels and focus restoration after overlays close. Include narrow layouts and enlarged text in the review.',
    'Document required fields, validation messages, successful submissions and recovery from a failed request. Use representative empty and long values. Make the result visible and distinguish a local demonstration from a connected service.',
    'Explain empty, loading, error and populated states. Reserve space for media, keep useful content readable without JavaScript where practical, and identify who can edit public copy. Remove placeholders before release.',
    'Record the build artifact, public base path, redirect requirements and rollback procedure. Verify a production build, internal anchors and important external destinations. Confirm the deployed revision before calling a release complete.',
    'Name the maintainer for code, content and releases. Capture known limits honestly, link the relevant checks, and agree how future package or design changes update examples and documentation. A useful hand-off lets the next person repeat the work.',
  ],
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
    'Toggle the canvas grid, then use the page action without closing the inspector. No backdrop, focus trap or page scroll lock.',
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
  childTitle: 'Choose your delivery',
  childDescription: 'Compare the cost and arrival time. Your order stays open underneath.',
  openChild: 'Choose delivery',
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

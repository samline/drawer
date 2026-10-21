import { demoFiles } from '../../../../../shared/lib/demo-files'
import { project } from '../../../../../shared/lib/project.mjs'
const text = (value: string) => [{ kind: 'text' as const, value }]
const heading = (prefix: string, accent: string) => [
  { kind: 'text' as const, value: prefix + ' ' },
  { kind: 'emphasis' as const, value: accent },
]
const code = (filename: string, source: string, language: 'html' | 'javascript' | 'bash') => ({
  filename,
  code: source,
  language,
})
const source = await demoFiles
const moduleCode = `import { createDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'
import './style.css'

const drawer = createDrawer({
  triggerElement: document.getElementById('open-drawer'),
  title: 'Make room for the details',
  content: 'Your next step, right here.',
  contentClassName: 'demo-drawer',
  overlayClassName: 'demo-overlay',
  closeButton: true,
})
// On application teardown:
// drawer.destroy()`
export default {
  hero: {
    kicker: 'A framework-free drawer runtime.',
    seoTitle: `${project.name} — Bottom sheets and side panels for JavaScript`,
    title: project.name,
    titleAccent: 'Make room for what’s next.',
    description: project.description,
    descriptionContinuation: '',
    footnotes: ['Four directions', 'Drag & snap', 'Typed controllers'],
    compatibilityLabel: 'ONE SMALL SCRIPT. RIGHT AT HOME IN YOUR STACK.',
    platforms: ['JavaScript', 'TypeScript', 'React', 'Vue', 'Svelte', 'Shopify', 'WordPress'],
  },
  features: {
    eyebrow: '01 / More than an open state',
    title: 'A natural interaction.',
    titleAccent: 'A clear API.',
    items: {
      dependencies: {
        title: 'Your framework. Your markup.',
        description: text(
          'Build bottom sheets and side panels with a vanilla API. No framework adapter required.'
        ),
      },
      accessibility: {
        title: 'Focus stays in the flow',
        description: text(
          'Modal drawers trap focus, isolate the background and restore focus on close. You supply meaningful labels and content.'
        ),
      },
      lifecycle: {
        title: 'Open. Update. Clean up.',
        description: text(
          'Create one instance, keep its controller, and update or destroy it when your feature changes.'
        ),
      },
      entrypoints: {
        title: 'From any edge',
        description: text(
          'Top, bottom, left or right. Drawer owns direction-aware gestures and motion; your CSS defines the panel.'
        ),
      },
      frameworks: {
        title: 'One step deeper',
        description: text(
          'Link a child with parentId. The runtime coordinates parent transforms, dismissal and shared scroll locking.'
        ),
      },
      markup: {
        title: 'Find the right stopping point',
        description: text(
          'Use ordered pixel or fractional snap points. Drag to settle or click the built-in handle to advance.'
        ),
      },
    },
  },
  runtimes: {
    eyebrow: '02 / Fit it into your stack',
    heading: heading('Two ways in.', 'One runtime.'),
    description:
      'Choose package imports or an HTML script tag. The optional /browser subpath is a namespace for module users; only the standalone script installs window.Drawer.',
    items: {
      main: {
        label: 'Package / ESM',
        entrypoint: '@samline/drawer',
        description:
          'Named factories and registry helpers, with TypeScript declarations. CommonJS is also exported.',
      },
      vanilla: {
        label: 'Optional module namespace',
        entrypoint: '@samline/drawer/browser',
        description:
          'The optional Drawer namespace exposes the same functions as the root module. It does not install a global.',
      },
      global: {
        label: 'HTML / CDN',
        entrypoint: 'window.Drawer',
        description:
          'The standalone IIFE attaches one global. Load the package stylesheet separately and pin the version.',
      },
      style: {
        label: 'Styles',
        entrypoint: '@samline/drawer/styles.css',
        description:
          'Import runtime motion and handle styles first. Add your own positioning, surface and theme CSS after it.',
      },
    },
  },
  gettingStarted: {
    eyebrow: '03 / From install to interaction',
    heading: heading('A button.', 'A drawer.'),
    integrationDescription:
      'Install the package, add a trigger, then create your drawer. Copy a complete browser example for a setup without a bundler.',
    integrationLabel: 'Read the installation guide',
    steps: { install: 'Install', markup: 'Add a trigger', initialize: 'Create the drawer' },
    installLabel: 'Installation method',
    installTabs: [],
    initLabel: 'Example format',
    initTabs: [
      { id: 'script', label: 'Package / ESM' },
      { id: 'complete', label: 'HTML / CDN' },
    ],
    stylesLabel: 'Add the panel stylesheet',
    cdnHint:
      'Load the CDN stylesheet and script from step 1, then load this file with defer after the runtime script.',
    fullExampleLabel: 'Copy complete working files',
    markupDescription:
      'Use a native button. Copy the panel stylesheet below; the package owns motion and dismissal.',
    examples: {
      markup: code('index.html', source.markup.replace(' aria-expanded="false"', ''), 'html'),
      script: code('main.js', moduleCode, 'javascript'),
      complete: code(
        'main.js',
        moduleCode
          .replace(/import[^\n]*\n/g, '')
          .replace('createDrawer({', 'window.Drawer.createDrawer({')
          .trim(),
        'javascript'
      ),
    },
    docs: {
      description: 'Read the effective defaults, renderable slots and lifecycle contract.',
      label: 'Explore the configuration reference',
    },
  },
  recipes: {
    eyebrow: '04 / Build the flow',
    title: 'After the first open.',
    titleAccent: 'Keep the flow.',
    description:
      'Use the controller from Get started to update content, drive the open state and clean up when your feature leaves.',
    examplesLabel: 'Explore working examples',
    items: [
      {
        title: 'Update the existing drawer',
        context: 'Controller',
        docsRoute: 'lifecycle' as const,
        docsLabel: 'Read about updates',
        description: text(
          'Change the title or body without creating another instance. Omitted options keep their existing values.'
        ),
        code: code(
          'update.js',
          `drawer.update({
  title: 'Your order',
  content: 'Your order is confirmed.',
})`,
          'javascript'
        ),
      },
      {
        title: 'Drive the open state',
        context: 'Application flow',
        docsRoute: 'lifecycle' as const,
        docsLabel: 'Understand open and close',
        description: text(
          'Open the panel after an application action. Close it when the flow is complete; the instance stays available for the next interaction.'
        ),
        code: code(
          'state.js',
          `drawer.setOpen(true)

// Later, after the action completes:
drawer.setOpen(false)`,
          'javascript'
        ),
      },
      {
        title: 'Keep ownership explicit',
        context: 'Lifecycle',
        docsRoute: 'lifecycle' as const,
        docsLabel: 'Read lifecycle and state',
        description: text(
          'Subscriptions fire immediately and return an unsubscribe function. Destroy the drawer when your page or component leaves.'
        ),
        code: code(
          'main.js',
          `const unsubscribe = drawer.subscribe(snapshot => {
  console.log(snapshot.state.isOpen)
})
// During application teardown:
unsubscribe()
drawer.destroy()`,
          'javascript'
        ),
      },
    ],
  },
  faq: {
    eyebrow: '05 / Before you build',
    heading: heading('A few details.', 'Clearly answered.'),
    items: {
      docs: {
        question: text('Does Drawer style the entire panel?'),
        answer: text(
          'The stylesheet provides motion, snap selectors, overlay transitions and the handle. Your application supplies panel positioning, dimensions, colors and content. The examples include that CSS.'
        ),
      },
      copy: {
        question: text('Can I use it without a framework or bundler?'),
        answer: text(
          'Yes. Link the stylesheet and load the pinned IIFE bundle, then call window.Drawer.createDrawer. ESM and CommonJS consumers use the package exports instead.'
        ),
      },
      frameworks: {
        question: text('Can I use Drawer with my framework or CMS?'),
        answer: text(
          'Yes. Use the same JavaScript API in React, Vue, Svelte or Astro, or add it to a Shopify theme or WordPress site. Create DOM drawers in the browser, after their content and triggers exist. The integration guide includes host-specific setup and cleanup.'
        ),
      },
      multiple: {
        question: text('Can I open more than one drawer?'),
        answer: text(
          'Yes. Create independent controllers for unrelated panels, or give a child the parent drawer’s id through parentId for a nested flow. Keep explicit ids unique. Independent panels need their own cleanup; nested drawers let users complete a second step without losing the first.'
        ),
      },
      snaps: {
        question: text('Can a drawer start small and expand?'),
        answer: text(
          'Yes. Snap points define the stops a drawer can move between. Use fractions of the available space for responsive sizes, then let users drag between stops or choose one with setActiveSnapPoint(). Your CSS still defines the panel’s overall geometry.'
        ),
      },
      modeless: {
        question: text('Can the page stay interactive while a drawer is open?'),
        answer: text(
          'Yes. Set modal to false for an inspector, notes panel or other tool used alongside the page. This disables modal focus trapping, background isolation and page scroll locking. The backdrop is also omitted by default; overlay can be configured separately.'
        ),
      },
      scrolling: {
        question: text('What about forms, long content and touch scrolling?'),
        answer: text(
          'Put overflow on the content body and keep the close control reachable. Drawer coordinates dragging with scrollable content and responds to mobile viewport changes while an input is focused. Use handleOnly or data-drawer-no-drag for controls that need their own gestures, and test the finished layout on your target devices.'
        ),
      },
      updates: {
        question: text('Can I change the content or keep form values between openings?'),
        answer: text(
          'Call update() on the existing controller to change content or options. Keep values that must survive closing in application state and restore them when building the form. A content factory runs again when the dialog is rebuilt, so closing a drawer does not automatically save form data.'
        ),
      },
      dismissal: {
        question: text('Can I prevent accidental dismissal during an important step?'),
        answer: text(
          'Set dismissible to false to prevent Escape, backdrop and drag dismissal. A configured close button or a programmatic close can still dismiss it. For a confirmation or unfinished form, provide clear actions and choose deliberately which controls may close the panel.'
        ),
      },
      lifecycle: {
        question: text('Should I close the drawer or destroy it?'),
        answer: text(
          'Close it with setOpen(false) when users may open the same drawer again. Its controller remains available while the visual content leaves after the exit transition. Call destroy() when the owning view or widget is removed; it releases the instance and its listeners, and that controller cannot be reused.'
        ),
      },
      changes: {
        question: text('What does my application still need to provide?'),
        answer: text(
          'Your application supplies the content, styling, meaningful dialog names, visible focus indicators and form validation or status messages. Drawer supplies dialog semantics, gestures and the configured focus and scroll behavior. Verify the complete experience with keyboard, touch and your own content.'
        ),
      },
    },
  },
  callToAction: {
    eyebrow: 'Make space for your next idea',
    heading: heading('Keep the page.', 'Open the possibilities.'),
    description: 'Try a working interaction or build your first drawer.',
    docs: {
      description: 'Installation, practical guides and the complete API for Drawer 5.0.2.',
      label: 'Read the documentation',
    },
  },
} as const

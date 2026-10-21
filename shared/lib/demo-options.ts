import { presets, type DemoPreset } from '../i18n/translations/en/demo'
import type { VanillaDrawerOptions } from '@samline/drawer'

export const demoOptions = (preset: DemoPreset): Partial<VanillaDrawerOptions> => ({
  direction: presets[preset].direction,
  ...(preset === 'confirm' ? { dismissible: false, closeButton: false, showHandle: false } : {}),
  ...(preset === 'snaps' || preset === 'controlled'
    ? { snapPoints: [0.45, 0.72, 1], activeSnapPoint: 0.45 }
    : {}),
  ...(preset === 'nonmodal' || preset === 'independent'
    ? { modal: false, overlay: false, autoFocus: false }
    : {}),
  ...(preset === 'styled' || preset === 'independent' ? { showHandle: false } : {}),
  ...(preset === 'handle' ? { handleOnly: true } : {}),
})

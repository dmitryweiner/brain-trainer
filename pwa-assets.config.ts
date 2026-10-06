import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `npm run icons` renders public/logo.svg into the PWA/Android icon set in public/.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    // the logo is full-bleed green, so maskable/apple icons need no extra padding colour
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#43a047' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#43a047' } },
  },
  images: ['public/logo.svg'],
})

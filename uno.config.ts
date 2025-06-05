import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'
import transformerDirective from '@unocss/transformer-directives' // 在style中使用unocss

export default defineConfig({
  presets: [presetUno(), presetAttributify(), presetIcons()],
  content: {
    pipeline: {
      exclude: ['node_modules', 'dist']
    }
  },
  safelist: [
    'i-solar-chat-square-bold-duotone',
    'i-solar-user-circle-bold-duotone',
    'i-solar-star-bold-duotone',
    'i-solar-planet-bold'
  ],
  shortcuts: [['flex-center', 'flex items-center justify-center']],
  rules: [
    ['drag', { '-webkit-app-region': 'drag' }],
    ['no-drag', { '-webkit-app-region': 'no-drag' }]
  ],
  transformers: [transformerDirective()]
})

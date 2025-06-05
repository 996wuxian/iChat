import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  tseslint.configs.recommended,
  eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        extraFileExtensions: ['.vue'],
        parser: tseslint.parser
      },
      globals: {
        // 添加这一部分来识别自动导入的 Vue API
        ref: 'readonly',
        computed: 'readonly',
        reactive: 'readonly',
        onMounted: 'readonly',
        watch: 'readonly',
        onUnmounted: 'readonly',
        onUpdated: 'readonly',
        onBeforeMount: 'readonly'
      }
    }
  },
  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off', // 关闭函数返回类型检查
      '@typescript-eslint/no-explicit-any': 'off', // 关闭 any 类型检查
      'vue/block-lang': [
        'error',
        {
          script: {
            lang: 'ts'
          }
        }
      ]
    }
  },
  eslintConfigPrettier
)

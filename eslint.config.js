import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // core/ must run unchanged in React Native and the Cloudflare Worker
    // (PLAN-IMPROVEMENTS.md, 5.1): no React, no browser globals, and time and
    // randomness only through the platform ports.
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/*.test.ts', 'src/core/testing/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-dom', 'react-*', 'i18next*'], message: 'core/ is UI-free' },
          { group: ['**/ui/**', '**/platform/**', '**/components/**', '**/hooks/**', '**/context/**'], message: 'core/ must not depend on outer layers' },
        ],
      }],
      'no-restricted-globals': ['error',
        ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'location', 'history', 'performance', 'crypto', 'fetch',
          'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame']
          .map(name => ({ name, message: 'Use the ports in core/platform.ts' })),
      ],
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: 'Take time from Scheduler/Clock' },
        { object: 'Math', property: 'random', message: 'Take randomness from Rng' },
      ],
    },
  },
])

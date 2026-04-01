import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import wdioPlugin from 'eslint-plugin-wdio'

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    plugins: {
      wdio: wdioPlugin,
    },
    languageOptions: {
      globals: {
        ...wdioPlugin.configs['flat/recommended'].languageOptions.globals,
      },
    },
  },
  {
    ignores: ['.yarn/', 'node_modules/'],
  },
]

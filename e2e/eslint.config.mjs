import pluginJs from '@eslint/js'
import wdioPlugin from 'eslint-plugin-wdio'
import tseslint from 'typescript-eslint'

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { sourceType: 'module' } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
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

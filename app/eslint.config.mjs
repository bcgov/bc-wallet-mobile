import pluginJs from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import jestPlugin from 'eslint-plugin-jest'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactNativeA11y from 'eslint-plugin-react-native-a11y'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: importPlugin,
    },
  },
  {
    plugins: {
      'react-hooks': reactHooks,
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    ...reactPlugin.configs.flat.recommended,
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      ...reactPlugin.configs.flat.recommended.plugins,
      'react-native-a11y': reactNativeA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactPlugin.configs.flat.recommended.rules,
      'react-native-a11y/has-accessibility-props': 'error',
      'react-native-a11y/has-valid-accessibility-role': 'error',
      'react-native-a11y/has-valid-accessibility-descriptors': 'error',
      'react-native-a11y/has-valid-accessibility-actions': 'error',
      'react-native-a11y/has-valid-accessibility-state': 'error',
      'react-native-a11y/has-valid-accessibility-value': 'error',
      'react-native-a11y/has-valid-important-for-accessibility': 'error',
      'react-native-a11y/no-nested-touchables': 'error',
      'no-console': 'error',
      curly: ['error', 'all'],
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
  {
    ignores: [
      'commitlint.config.js',
      'eslint.config.mjs',
      '.eslintrc-common.js',
      '**/.eslintrc.js',
      'scripts/make-blocks.js',
      'scripts/get-next-bump.ts',
      '**/jest.config.js',
      '**/metro.config.js',
      '.yarn/',
      'bifold/**/*',
      'android/app/scripts/**/*',
    ],
  },
  {
    files: ['**/*.test.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}', '**/__mocks__/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'], // Adjust the pattern to match your test files
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        'jest/globals': true,
      },
    },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
    },
  },
]

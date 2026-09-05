import js from '@eslint/js'
import eslintConfigPrettier from '@vue/eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // functions/ is a separate deployable TypeScript project (its own
    // tsconfig, package.json, and `tsc` build to CommonJS `lib/` — verified
    // clean via its own `npx tsc --noEmit`, not this config) — excluded
    // here the same way `dist/` (the Vite build output) already is.
    ignores: ['dist/**', 'android/**', 'ios/**', 'node_modules/**', 'functions/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  eslintConfigPrettier,
)

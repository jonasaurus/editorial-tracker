import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // AGENTS.md: never use `any`. Use `unknown` and narrow it.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  // Rules that use type information. They enforce what the code already does: no unsafe
  // `any`, no promise without a handler, no switch that misses a member of a union.
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
    },
  },
  // Generated files, and local agent tools (not in git)
  globalIgnores([
    '.claude/',
    '.next/',
    'next-env.d.ts',
    'src/payload-types.ts',
    'src/payload-generated-schema.ts',
    'src/app/(payload)/admin/importMap.js',
    'src/migrations/',
  ]),
])

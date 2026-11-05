import { defineConfig } from 'vite-plus';

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/, so emit relative asset paths.
  base: './',

  // Pre-commit hook (`vp staged`): format, lint and type-check staged files.
  staged: {
    '*': 'vp check --fix',
  },

  test: {
    include: ['src/**/*.test.ts'],
  },

  fmt: {
    singleQuote: true,
    printWidth: 120,
  },

  lint: {
    ignorePatterns: ['dist/**'],
    plugins: ['typescript', 'unicorn', 'oxc', 'import', 'promise'],
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'error',
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',

      // Types: no escape hatches, no sloppy truthiness, no forgotten promises.
      'typescript/no-explicit-any': 'error',
      'typescript/no-non-null-assertion': 'error',
      'typescript/no-unsafe-argument': 'error',
      'typescript/no-unsafe-assignment': 'error',
      'typescript/no-unsafe-call': 'error',
      'typescript/no-unsafe-member-access': 'error',
      'typescript/no-unsafe-return': 'error',
      'typescript/no-unsafe-type-assertion': 'error',
      'typescript/no-floating-promises': 'error',
      'typescript/no-misused-promises': 'error',
      'typescript/await-thenable': 'error',
      'typescript/strict-boolean-expressions': 'error',
      'typescript/switch-exhaustiveness-check': 'error',
      'typescript/restrict-template-expressions': 'error',
      'typescript/restrict-plus-operands': 'error',
      'typescript/no-unnecessary-condition': 'error',
      'typescript/no-unnecessary-type-assertion': 'error',
      'typescript/prefer-nullish-coalescing': 'error',
      'typescript/prefer-optional-chain': 'error',
      'typescript/consistent-type-imports': 'error',
      'typescript/consistent-type-definitions': ['error', 'interface'],
      'typescript/explicit-module-boundary-types': 'error',
      'typescript/no-confusing-void-expression': 'off',

      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'error',
      'import/no-unassigned-import': ['error', { allow: ['**/*.css'] }],
      // The ASCII art uses full-width spaces on purpose.
      'no-irregular-whitespace': ['error', { skipStrings: true, skipComments: true, skipTemplates: true }],
    },
  },
});

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['out/**', 'dist/**', 'node_modules/**', 'eslint.config.js', 'vitest.config.ts', 'electron.vite.config.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@prisma/client', message: 'Renderer must not access Prisma (NF-022)' },
            { name: '@sams/db', message: 'Renderer must not access database layer (NF-022)' },
          ],
          patterns: ['@prisma/*'],
        },
      ],
    },
  },
);

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['src/generated/**', 'dist/**', 'test-dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: [
      'src/modules/**/domain/**/*.ts',
      'src/modules/**/application/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@nestjs/*',
            '@prisma/*',
            '**/infrastructure/**',
            '**/presentation/**',
            '**/generated/**',
            '**/shared/database/**',
            'pg',
            'express',
            'axios',
            'nodemailer',
          ],
        },
      ],
    },
  },
);

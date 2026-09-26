import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const prismaClientImports = {
  group: [
    '**/generated/prisma/client*',
    '**/generated/prisma/models*',
    '**/generated/prisma/internal/*',
    '@prisma/*',
  ],
  message: 'Prisma stays behind the repositories: import domain types, not the Prisma client.',
};

export default tseslint.config(
  { ignores: ['dist/**', 'src/generated/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      // NestJS modules are classes with decorators only.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  // The Prisma boundary (apidocs/REPOSITORY_ARCHITECTURE.md): only src/database/ and the repositories (with
  // their mappers) know Prisma; services and controllers see domain types. Generated enums stay allowed: they
  // are plain string unions of the schema's vocabularies.
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/database/**',
      'src/**/*.repository.ts',
      'src/**/*.mappers.ts',
      'src/**/*.spec.ts',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [prismaClientImports] }],
    },
  },
  {
    files: ['src/modules/**/*.ts'],
    ignores: [
      'src/**/*.repository.ts',
      'src/**/*.mappers.ts',
      'src/**/*.spec.ts',
      'src/modules/health/**',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            prismaClientImports,
            {
              group: ['**/database/prisma.service*'],
              message: 'Only repositories inject PrismaService: use a repository.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);

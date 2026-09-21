const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Must stay last: turns off stylistic rules that would fight Prettier.
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*', 'expo-env.d.ts', 'nativewind-env.d.ts'],
  },
]);

const jestExpoPreset = require('jest-expo/jest-preset');

// Packages that ship untranspiled ESM and must go through Babel (in addition to jest-expo's list).
const esmPackages = [
  'moti',
  'nativewind',
  'react-native-css-interop',
  'lucide-react-native',
  'react-native-gifted-charts',
  'gifted-charts-core',
];

const transformIgnorePatterns = jestExpoPreset.transformIgnorePatterns.map((pattern) =>
  pattern.includes('(.pnpm|')
    ? pattern.replace('(.pnpm|', `(.pnpm|${esmPackages.join('|')}|`)
    : pattern,
);

// lucide-react-native ships ES modules with the `.mjs` extension, which the preset does not transform.
const babelTransform = jestExpoPreset.transform['\\.[jt]sx?$'];

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: { ...jestExpoPreset.transform, '\\.mjs$': babelTransform },
  transformIgnorePatterns,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

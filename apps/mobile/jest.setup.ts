jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated (used by Moti) needs its native runtime, which does not exist in Jest.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

// Same known Moti warning as `src/lib/knownWarnings.ts`, kept out of the test output.
const originalWarn = console.warn;
jest.spyOn(console, 'warn').mockImplementation((message?: unknown, ...args: unknown[]) => {
  if (typeof message === 'string' && message.includes('SafeAreaView has been deprecated')) return;
  originalWarn(message, ...args);
});

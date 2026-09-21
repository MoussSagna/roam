import { LogBox } from 'react-native';

/**
 * Moti 0.30 wraps React Native's `SafeAreaView` when its entry point loads (we never use it), and
 * React Native 0.86 warns that this component is deprecated. Remove once Moti drops that reference.
 * Import this module before anything that imports `moti`.
 */
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

const { IOSConfig, withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * Adopts the UIScene life cycle that the iOS 27 SDK requires: an app without it is stopped at launch
 * (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, SIGTRAP). `expo` 57 already ships the
 * runtime (`ExpoAppSceneDelegate`, `ExpoReactNativeFactoryProvider`) but its iOS template still uses the
 * app-delegate life cycle; this plugin applies the wiring of Expo's SDK 58 template at every `expo prebuild`.
 * See `mobiledocs/DECISIONS.md` D-98. Remove it once the project is on a template that does this itself.
 */

// Same as `ios/HelloWorld/SceneDelegate.swift` in expo-template-bare-minimum@58.
const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

// Same as `UIApplicationSceneManifest` in expo-template-bare-minimum@58.
const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      },
    ],
  },
};

const APP_DELEGATE_DECLARATION = /class AppDelegate: ExpoAppDelegate(?=\s*\{)/;
const PROVIDER_CONFORMANCE = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider';
// The SDK 57 template creates the window and starts React Native itself; `ExpoAppSceneDelegate` now does it.
const WINDOW_START_BLOCK =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
const WINDOW_START_REPLACEMENT = `
    // The window is created and React Native is started by \`SceneDelegate\` under the
    // scene-based life cycle (required by the iOS 27 SDK).
`;

/** Adds the scene manifest unless one is already declared. */
function addSceneManifest(infoPlist) {
  if (infoPlist.UIApplicationSceneManifest) return infoPlist;
  return { ...infoPlist, UIApplicationSceneManifest: SCENE_MANIFEST };
}

/**
 * Makes the Swift app delegate a factory provider that no longer creates its window. Throws when the
 * template is not recognized: a scene delegate next to an app delegate that also starts React Native would
 * run the app twice.
 */
function adoptSceneLifecycle(appDelegate) {
  let contents = appDelegate;
  if (!contents.includes(PROVIDER_CONFORMANCE)) {
    if (!APP_DELEGATE_DECLARATION.test(contents)) {
      throw new Error(
        'withIOSSceneLifecycle: `class AppDelegate: ExpoAppDelegate` not found in AppDelegate.swift.',
      );
    }
    contents = contents.replace(APP_DELEGATE_DECLARATION, PROVIDER_CONFORMANCE);
  }
  if (WINDOW_START_BLOCK.test(contents)) {
    contents = contents.replace(WINDOW_START_BLOCK, WINDOW_START_REPLACEMENT);
  } else if (/window = UIWindow\(|\.startReactNative\(/.test(contents)) {
    throw new Error('withIOSSceneLifecycle: unrecognized window creation in AppDelegate.swift.');
  }
  return contents;
}

const withIOSSceneLifecycle = (config) => {
  config = withInfoPlist(config, (config) => {
    config.modResults = addSceneManifest(config.modResults);
    return config;
  });
  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withIOSSceneLifecycle: only a Swift AppDelegate is supported.');
    }
    config.modResults.contents = adoptSceneLifecycle(config.modResults.contents);
    return config;
  });
  return IOSConfig.XcodeProjectFile.withBuildSourceFile(config, {
    filePath: 'SceneDelegate.swift',
    contents: SCENE_DELEGATE_SOURCE,
  });
};

module.exports = withIOSSceneLifecycle;
module.exports.addSceneManifest = addSceneManifest;
module.exports.adoptSceneLifecycle = adoptSceneLifecycle;
module.exports.SCENE_MANIFEST = SCENE_MANIFEST;

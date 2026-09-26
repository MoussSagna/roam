const { WarningAggregator, withXcodeProject } = require('expo/config-plugins');

/**
 * The "Bundle React Native code and images" build phase of Expo's iOS template ends with
 *
 *   `"$NODE_BINARY" --print "…/scripts/react-native-xcode.sh'"`
 *
 * i.e. it runs the printed path unquoted, so the shell splits it on spaces and the build fails when the
 * project lives in a folder such as `Mouss coding` ("No such file or directory: …/Mouss"). This plugin
 * quotes that command substitution at every `expo prebuild`. See `mobiledocs/DECISIONS.md` D-97.
 */
const PHASE_NAME = 'Bundle React Native code and images';
const UNQUOTED_CALL = /^`("\$NODE_BINARY" --print "[^\n]*react-native-xcode\.sh'")`$/m;

/** Returns the phase script with the react-native-xcode.sh invocation quoted, or `null` if not found. */
function quoteBundleScript(script) {
  if (!UNQUOTED_CALL.test(script)) return null;
  return script.replace(UNQUOTED_CALL, '"$($1)"');
}

const withQuotedBundleScript = (config) =>
  withXcodeProject(config, (config) => {
    const phases = config.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    const phase = Object.values(phases).find(
      (value) => typeof value === 'object' && JSON.parse(value.name ?? '""') === PHASE_NAME,
    );
    // pbxproj strings are stored quoted and escaped, with the same escaping rules as JSON strings.
    const quoted = phase ? quoteBundleScript(JSON.parse(phase.shellScript)) : null;
    if (quoted) {
      phase.shellScript = JSON.stringify(quoted);
    } else {
      WarningAggregator.addWarningIOS(
        'withQuotedBundleScript',
        `"${PHASE_NAME}" not found or already quoted; paths with spaces may break the iOS build.`,
      );
    }
    return config;
  });

module.exports = withQuotedBundleScript;
module.exports.quoteBundleScript = quoteBundleScript;

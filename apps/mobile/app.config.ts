import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * `app.json` holds the whole static config; this only adds what must never be committed.
 *
 * Android's Google Maps SDK (`react-native-maps`, `docs/DECISIONS.md` D-70) needs an API key in a real
 * build (Expo Go brought its own). It comes from the `GOOGLE_MAPS_API_KEY` EAS environment variable at
 * build time — see `docs/deployment.md` — and is left out when the variable is not set.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      ...(googleMapsApiKey
        ? { config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } } }
        : {}),
    },
  };
};

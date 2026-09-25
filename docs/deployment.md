# Deployment

The mobile app (`apps/mobile`) is built and distributed with **Expo Application Services (EAS)**.
Everything below runs from `apps/mobile`. EAS CLI is used through `npx` (no global install needed):
`npx eas-cli@latest <command>` — or install it once with `npm i -g eas-cli` and use `eas <command>`.

| What            | Value                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| Expo account    | `mousgamee`                                                                |
| EAS project     | [`@mousgamee/roam`](https://expo.dev/accounts/mousgamee/projects/roam)     |
| iOS bundle id   | `com.mousgamee.roam`                                                       |
| Android package | `com.mousgamee.roam`                                                       |
| Config          | `app.json` (static) + `app.config.ts` (secrets from env only) + `eas.json` |
| Runtime version | `appVersion` policy (`expo.version`, currently `0.1.0`)                    |

Never commit secrets (API keys, tokens, credentials). They live in EAS environment variables, and the
signing credentials are managed by EAS.

## Development

Day-to-day work does not need EAS:

```bash
pnpm install                  # repository root
pnpm --filter @roam/mobile start   # or: pnpm mobile:start — then Expo Go / simulator
```

See `docs/DEVELOPMENT.md` for the full guide. The `development` EAS profile (a development client) is
declared in `eas.json` but needs `npx expo install expo-dev-client` before its first build.

## Preview (test builds)

The `preview` profile is for testers: internal distribution, channel `preview`, an **APK** on Android
(installable directly, no Play Store).

### Required once: Google Maps key (Android)

`react-native-maps` uses the Google Maps SDK on Android, which needs an API key in a real build (Expo
Go brought its own). Without it, every screen with a map fails on Android.

1. In [Google Cloud Console](https://console.cloud.google.com/): create (or pick) a project, enable
   **Maps SDK for Android**, create an **API key**.
2. Restrict it: _Application restrictions → Android apps_, package `com.mousgamee.roam` + the SHA-1 of
   the EAS keystore (`npx eas-cli@latest credentials -p android` shows it after the first build);
   _API restrictions → Maps SDK for Android_.
3. Store it in EAS (never in Git):

   ```bash
   npx eas-cli@latest env:create --name GOOGLE_MAPS_API_KEY --value "<key>" \
     --environment preview --environment production --visibility sensitive
   ```

`app.config.ts` reads `GOOGLE_MAPS_API_KEY` at build time. iOS uses Apple Maps and needs no key.

### Android

```bash
npx eas-cli@latest build --platform android --profile preview
```

The first build offers to generate the Android keystore: accept (EAS stores it). When the build is
done, EAS prints the build page URL and a QR code.

### iOS

Internal distribution on iOS is **Ad Hoc**: it needs a paid **Apple Developer Program** account, and
only the devices registered beforehand can install the build.

```bash
npx eas-cli@latest device:create          # once per tester device: share the link, open it on the iPhone
npx eas-cli@latest build --platform ios --profile preview
```

The build asks to log in to Apple (interactive) and creates the certificate and the provisioning
profile (including the registered devices). A device added later needs a new build
(`device:create`, then build again — EAS offers to update the profile).

## EAS Update

JavaScript / UI / asset changes can reach existing builds without rebuilding:

```bash
npx eas-cli@latest update --channel preview --message "What changed"
```

- The `preview` builds listen to the `preview` channel (`eas.json`).
- An update only reaches builds with the same **runtime version** (`appVersion` policy = `expo.version`).
  A native change (new native package, config plugin, permissions, `app.json` native fields) needs a
  **new build** — and bump `expo.version` so older builds don't receive incompatible JavaScript.
- Testers get an update the next time they open the app (it applies on the following launch).

## Testers

- **Android:** send the build page link (or its QR code) from the terminal output or from
  [expo.dev → roam → Builds](https://expo.dev/accounts/mousgamee/projects/roam/builds). On the phone:
  open it, **Install** downloads the APK; allow installing from this source when Android asks.
- **iOS:** the tester's iPhone must be registered first (`device:create`) and, on iOS 16+, have
  **Developer Mode** on (Settings → Privacy & Security). Then open the build page link on the iPhone and
  tap **Install**.
- The build page (Builds tab) always has the link and a QR code, so a build can be shared again later.

## Production

Not configured yet. The `production` profile exists (channel `production`, remote build numbers
auto-incremented), but store listing, final app icons (still placeholders — see
`apps/mobile/assets/images/logo/README.md`), privacy details and submission (`eas submit`) will be set
up later.

# ROAM logo assets

## Official logo (in use)

These three files are the official ROAM mark — 1254×1254 PNG with a real alpha channel. They are
raster exports (there is no vector master yet). `components/brand/Logo.tsx` and `app.json` reference
them by name, so keep the file names when replacing them.

| File                  | Colorway                                        | Used for                                                                 |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `logo/logo-light.png` | Solid dark green mark, cut-outs are transparent | Light theme (`Logo` variant `light` / `auto`); native splash, light mode |
| `logo/logo-dark.png`  | Mint gradient mark with cream path              | Dark theme (`Logo` variant `dark` / `auto`); native splash, dark mode    |
| `logo/logo-icon.png`  | Deep forest gradient mark with cream path       | `Logo` variant `icon`                                                    |

Other official images:

| File                           | Used for                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `logo/roam-wordmark-light.png` | "ROAM" wordmark, white on transparency (1024×512), tinted cream at runtime. In-app splash only. |
| `splash-background.png`        | Photo behind the in-app splash screen (941×1671, opaque). Not the native splash.                |

The in-app splash screen (`src/features/splash`) uses `splash-background.png`, `logo/logo-dark.png`
(the mint mark reads best on the photo) and `logo/roam-wordmark-light.png`.

## Native splash (`app.json` → `expo-splash-screen`)

The native splash is shown by the OS while the JS bundle loads. It is separate from the in-app
splash screen (React Native, with `splash-background.png`).

- Light: `logo/logo-light.png` on `#F7F4ED` (Cream)
- Dark: `logo/logo-dark.png` on `#0F1411` (dark theme background)
- `imageWidth`: 200

Native config cannot read theme tokens, so these colors are hex values in `app.json`.

## Still placeholders

No file with the format required by Expo exists yet for the launcher icons. Until proper exports are
provided, these remain the temporary ring-and-dot placeholders:

| File                          | Expected replacement                                                             |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `icon.png`                    | App icon: 1024×1024, **opaque** (no alpha), full-bleed square, no baked corners  |
| `android-icon-foreground.png` | Android adaptive foreground: 1024×1024, transparent, mark inside the central 66% |
| `android-icon-monochrome.png` | Android themed icon: 1024×1024, single-color mark on transparency                |

The Android adaptive icon background color (`#3F624E`, Forest) is set in `app.json`.

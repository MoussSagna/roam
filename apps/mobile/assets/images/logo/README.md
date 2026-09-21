# ROAM logo assets

**The files in this folder are placeholders** (a ring with an orbiting dot). No official ROAM
logo existed in the repository when the mobile app was initialised.

To use the official logo, replace the files below **keeping the same names** — `components/brand/Logo.tsx`
and `app.json` reference them:

| File                          | Used for                                              |
| ----------------------------- | ----------------------------------------------------- |
| `logo/logo-light.png`         | Mark for light backgrounds (transparent PNG)          |
| `logo/logo-dark.png`          | Mark for dark backgrounds (transparent PNG)           |
| `logo/logo-icon.png`          | Square icon variant used inside the app               |
| `icon.png` (parent folder)    | App icon, 1024×1024                                   |
| `android-icon-foreground.png` | Android adaptive icon foreground (keep the safe zone) |
| `android-icon-monochrome.png` | Android themed (monochrome) icon                      |
| `splash-icon.png`             | Splash mark on the light splash background            |
| `splash-icon-dark.png`        | Splash mark on the dark splash background             |

The Android adaptive icon background and the splash background colors are set in `app.json`
(native config cannot read theme tokens): Forest `#3F624E`, Cream `#F7F4ED`, dark `#0F1411`.

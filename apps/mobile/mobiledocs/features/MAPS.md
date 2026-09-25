# Mobile — Maps and location

Real map (sprint 7, [`DECISIONS.md`](../DECISIONS.md) D-70): **`react-native-maps`**, replacing the illustrated maps **one screen at a
time**.

> **Rule:** the `MapPlaceholder`s are replaced progressively, one screen at a time. Each integration must be validated
> before moving on to the next one.

| Screen / route                                         | Surface                                                                   | Status                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------ |
| Map — `/map` (Discover "Voir la carte")                | `features/map/MapScreen.tsx` → `RoamMap`                                  | **Real map (sprint 7)**  |
| Search — "Carte" (`/search/map`)                       | `features/search/SearchMapScreen.tsx` → full-screen `RoamMap`             | **Real map (sprint 8)**  |
| Experience detail — map block + `/experience-map/[id]` | `MapPreviewRow` → static `RoamMap`; full screen: `ExperienceMapScreen`    | **Real map (sprint 8)**  |
| Onboarding location (`/onboarding/mood`, slide 4)      | `LocationScreen` → interactive `RoamMap`, glides to the selected location | **Real map (D-89)**      |
| Journey hub mini-map + `/journey/[id]/map`             | `CurrentJourneyCard` (static `RoamMap`) → `JourneyMapScreen`              | **Real map (sprint 12)** |

```text
Screen → hook / derived results (useNearbyMapExperiences · Search's sortedResults)
       → ExperienceRepository / SearchRepository (mock, Experience.coordinates)
       → toMapMarkers → RoamMap / ExperienceMarker (features/map) → react-native-maps
```

- `RoamMap` is the **only** component (with `ExperienceMarker`) allowed to import `react-native-maps`; screens pass
  `MapMarkerData[]` (`features/map/types/map.types.ts`), a selected id and press callbacks; optionally a `route`
  (ordered points → one `Polyline`, straight segments, sprint 12) and, per marker, a `badge` (a step number) /
  `highlighted` (the current step's badge in `primary`). It frames the markers
  once (`lib/region.ts`), clips to a rounded frame (or edge to edge with `rounded={false}` and `style={StyleSheet.absoluteFill}`, `SearchMapScreen`), and follows the theme through `userInterfaceStyle` (iOS).
- **Markers** (`ExperienceMarker`, sprint 9, D-75): a round photo of the experience (`MapMarkerData.image` =
  its `coverImage`) in a `surface` ring with a shadow; selected = `primary` ring + scale 1.18 (Moti, 200 ms, none
  under reduced motion), drawn on top. Same marker on every `RoamMap` (Map, Search map, detail preview, experience map).
- **Camera focus** is opt-in: `RoamMap focusInsets={{ top, bottom }}` opens on the selected marker and glides to each
  new selection (`animateToRegion`, current zoom kept), centered between those insets (`lib/region.ts`
  `getFocusedRegion`). Without the prop the map never moves by itself. Used by `ExperienceMapScreen`, `JourneyMapScreen`
  and the onboarding `LocationScreen` (verified in the code).
- **Marker tap ≠ map tap** (D-76): Apple Maps also fires the map's `onPress` ~300 ms after every marker tap. `RoamMap`
  swallows that echo (a map press < 600 ms after a marker press, or flagged `action: 'marker-press'`), so screens'
  `onPressMap` only ever means bare map. Tests: `pressMapEcho` / `pressBareMap` (`src/test/reactNativeMapsMock.tsx`).
- Selection state lives in the screen (hook or screen state), not in the map. The bottom card is `ExperienceMapCard`; "no `coordinates` → no pin, no crash" is defined once in `lib/markers.ts` (`isPinnable`/`toMapMarkers`).
- **Mock data only**: no Google Places / Directions / Geocoding, no network. Coordinates are on the mock
  experiences (`Experience.coordinates`). Real data (place provider, routing) is Phase E of
  [`appdocs/ROADMAP.md`](../../../../appdocs/ROADMAP.md). `RoamMap` already draws a `route` (`Polyline`, sprint 12); it does not draw the user's position:
  the device position is read by `hooks/useCurrentLocation.ts` (onboarding only, D-89) and shown as a plain marker.
- **Dark mode**: iOS (Apple Maps) follows the theme; Android (Google Maps) keeps its light native style for now.
- **Expo Go** works as is, no key in the repo. **Development/production builds** need a Google Maps key for Android
  (`expo.android.config.googleMaps.apiKey`, provided by EAS secrets, never committed) — see D-70.
- **Tests**: `react-native-maps` is mocked globally (`jest.setup.ts`, `src/test/reactNativeMapsMock.tsx`); assert on
  `testID="roam-map"` / `mock-map-view` and on markers by role `button` + title.

## Device location (D-89)

- `hooks/useCurrentLocation.ts` wraps `expo-location`: permission states `unknown` / `granted` / `denied` (can ask again) /
  `blocked` (only the device settings can change it), read on mount without prompting; `requestCurrentLocation()`
  prompts only when the permission is undecided (or can be asked again), reads one position (balanced accuracy, 10 s
  timeout) and returns every failure as a result, never a throw.
- Foreground only: the `expo-location` config plugin in `app.json` declares a when-in-use description and turns off iOS
  and Android background location and the Android foreground service. No location history is kept.
- Used by the onboarding location step only; the journey's "On part d'où ?" still uses an approximate position
  (central Paris, said on screen).

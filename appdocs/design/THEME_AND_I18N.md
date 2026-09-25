# ROAM — Theme & Internationalization

## Requirements

ROAM must support:

### Theme
- Light
- Dark
- System (recommended, optional if desired)

### Languages
- French (`fr`)
- English (`en`)

Default language:
- French.

The language and theme preferences should be persisted.

## Theme architecture

Never use raw colors directly inside feature components.

Use semantic tokens such as:

```text
background
surface
surfaceElevated
text
textSecondary
border
primary
primaryForeground
accent
success
warning
error
overlay
```

### Light theme

Conceptual ROAM palette:

```text
background: cream
surface: white
text: ink
textSecondary: stone
primary: forest green
accent: warm peach/sable
```

### Dark theme

Create a genuine dark palette rather than simply inverting colors.

Example direction:

```text
background: near-black green
surface: deep green-gray
surfaceElevated: dark slate/green
text: warm off-white
textSecondary: muted sage
primary: lighter forest/sage
accent: warm peach
```

Accessibility and contrast take priority over exact brand colors.

## Theme behavior

Preferred behavior:

```text
System
   ↓
OS light/dark preference

Light
   ↓
always light

Dark
   ↓
always dark
```

If only two modes are wanted in the first version, support:
- Light
- Dark

## Persistence

Persist the user's explicit theme choice.

Suggested key:

```text
roam.theme
```

Suggested values:

```text
light
dark
system
```

Suggested language key:

```text
roam.language
```

Suggested values:

```text
fr
en
```

## i18n rules

- No hard-coded user-facing text in components.
- Translation keys should be semantic, not screen-coordinate based.
- Avoid keys such as `screen09Title`.
- Prefer:
  - `recommendations.title`
  - `recommendations.subtitle`
  - `recommendations.why`
  - `common.continue`

## Suggested namespace structure

```text
common
navigation
auth
onboarding
home
context
recommendations
experience
place
itinerary
map
outing
feedback
favorites
history
profile
settings
errors
validation
```

## Example usage

```ts
t("recommendations.title")
```

not:

```ts
t("ecran09.texte1")
```

## Language switching UX

Profile/Settings should expose:

```text
Language
○ Français
○ English
```

Switching language should update visible UI without requiring a full app restart when technically possible.

## Theme switching UX

Profile/Settings:

```text
Appearance
○ Light
○ Dark
○ System
```

The setting should immediately preview/apply.

## Translation quality

French is the primary product language.
English must be natural product English, not word-for-word machine translation.

Do not mix French and English in a single UI state.

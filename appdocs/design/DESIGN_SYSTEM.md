# ROAM — Design System Context

## Visual direction

Keywords:
- editorial;
- warm;
- natural;
- minimal;
- curious;
- human;
- premium;
- playful.

ROAM should feel like a companion for going out, not a booking platform or map clone.

## Core palette

These are the initial design directions, not immutable brand guidelines.

```text
Forest: #3F624E
Cream:  #F7F4ED
White:  #FFFFFF
Ink:    #171B18
Stone:  #747873
Peach:  #E9CDB9
Sage:   #DDE7DE
```

All colors must eventually be represented through theme tokens so dark mode can replace them.

## Typography

Initial proposal:
- display/headings: Plus Jakarta Sans or equivalent;
- body: Inter.

Hierarchy:
- Display 56/60 desktop;
- H1 40/44;
- H2 32/38;
- H3 24/30;
- H4 20/26;
- Body Large 18/28;
- Body 16/24;
- Small 14/20;
- Caption 12/16.

Mobile typography should be scaled down appropriately.

## Spacing

Use a 4px base:
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.

## Radius

```text
small: 8px
medium: 12px
large: 20px
card: 24px
hero: 32px
pill: 999px
```

## Components

Core:
- Button
- IconButton
- Chip
- MoodSelector
- DurationSelector
- BudgetSelector
- CompanySelector
- LocationSelector
- RecommendationCard
- ExperienceCard
- PlaceCard
- ItineraryStep
- TravelConnector
- FeedbackOption
- BottomNavigation
- TopBar
- Modal/BottomSheet
- MapMarker

## Recommendation card

Priority component.

It should communicate:
1. image;
2. experience name;
3. duration;
4. price;
5. distance;
6. categories/tags;
7. why it fits;
8. action.

Use immersive images as backgrounds/hero areas where appropriate.

## Motion

Keep motion subtle:
- fade;
- small translate;
- scale ~1.03 for selection;
- staggered card entry;
- itinerary steps appearing progressively.

Avoid excessive animation that slows task completion.

## Images

Prefer:
- authentic;
- atmospheric;
- editorial;
- natural light;
- human/lifestyle context.

The product sells an experience, not only a place.

## Responsive

Mobile-first reference:
- approximately 390 × 844.

Also support:
- tablet;
- desktop around 1440 × 900.

Desktop should not simply be a stretched mobile layout.

# ROAM — Experience (domain)

An **experience** is a composed outing (several places/activities), not a single place — the central object ROAM
recommends ([`../product/UX_SCREENS_AND_FLOWS.md`](../product/UX_SCREENS_AND_FLOWS.md) §10).

## Purpose
Define the canonical ROAM representation consumed by the app (target model of the Data Foundation, not implemented).

```text
Experience
├── Identity
│   ├── id
│   ├── title
│   ├── description
│   └── type
├── Location
│   ├── address
│   ├── city
│   ├── latitude
│   ├── longitude
│   └── providerPlaceId
├── Media
│   ├── coverImage
│   └── images[]
├── Schedule
│   ├── startDate
│   ├── endDate
│   ├── openingHours
│   └── estimatedDuration
├── Pricing
│   ├── level
│   ├── min
│   ├── max
│   └── currency
├── ROAM Context
│   ├── atmosphere[]
│   ├── energyLevel
│   ├── suitableFor[]
│   ├── bestMoments[]
│   └── tags[]
├── Quality
│   ├── rating
│   ├── reviewCount
│   └── popularity
└── Source
    ├── provider
    ├── externalId
    └── externalUrl
```

## Data ownership

Source data includes factual provider fields such as identity, address, coordinates, photos, hours, event dates and provider pricing.

ROAM-derived data includes atmosphere, energy, audience, best moments, estimated duration when inferred, normalized pricing, tags and recommendation metadata.

Derived values must be identifiable as derived.

## Suggested enums

Price level:
`FREE | LOW | MEDIUM | HIGH | VERY_HIGH | UNKNOWN`

Energy:
`LOW | MEDIUM | HIGH | UNKNOWN`

Audience:
`SOLO | COUPLE | FRIENDS | FAMILY | GROUP | UNKNOWN`

Moment:
`MORNING | AFTERNOON | EVENING | NIGHT | ANYTIME`

## Source metadata
Keep:
- provider
- externalId
- externalUrl when available
- fetchedAt
- updatedAt when known
- source confidence where relevant

## Deduplication
Use provider IDs first, then normalized name/address/coordinates. For events also consider date/time. Never merge solely on similar names.

## Composition

An experience is a composition of places/activities.

Example:

```text
Experience
├── Café
├── Bookstore
├── Park
└── Pastry shop
```

Each step should have:
- place/activity;
- estimated duration;
- travel time from previous step;
- estimated cost;
- opening-hours validity.

## Current implementation

**Backend (API-03):** the canonical model is the `Experience` table, with its places (`ExperiencePlace`), provenance
(`ExternalSource`) and ROAM context (`RoamEnrichment`) as separate tables — `apps/api/apidocs/DATABASE_SCHEMA.md`. No endpoint yet.

**Mobile (mock data):**

The mobile `Experience` type (`apps/mobile/src/types/experience.ts`) predates this canonical model and is a mock-data
shape: `id`, `title`, `description`, `moods`, `categoryIds`, ordered `placeIds`, `estimatedDurationMin`,
`estimatedBudget` (`BudgetRange`), optional `coordinates`, plus display fields added screen by screen
(already-formatted labels, images, reviews, highlights, history fields — mobile D-45, D-48, D-58). It has no source
metadata, no ROAM context enums and no pricing min/max. Mapping it to the canonical model above is DATA-1
([`apps/api/apidocs/DATA_IMPLEMENTATION_PLAN.md`](../../apps/api/apidocs/DATA_IMPLEMENTATION_PLAN.md)); existing mock data must keep working during the migration.

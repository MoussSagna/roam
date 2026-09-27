# ROAM — Event (domain)

## Purpose

Represent time-bound experiences independently from persistent places.

```text
Event
├── id
├── experienceId
├── title
├── description
├── startDate
├── endDate
├── venue
├── category
├── images[]
├── pricing
├── source
└── bookingUrl
```

## Primary source

Ticketmaster Discovery API.

Future sources may include public datasets and local cultural platforms after evaluation.

## Pricing

If a source provides a range, store min, max and currency.
If unavailable, use null/UNKNOWN. Never fabricate a price.

## Classification

Preserve provider classification in source metadata and optionally map it to a ROAM category.

## Timing

Support start/end, timezone and duration when explicitly available or safely derived. Never invent an exact end time.

## Current implementation

No `Event` type exists in the mobile app. The backend stores this model (`Event`, venue as a `Place`, provenance in
`ExternalSource`) — `apps/api/apidocs/DATABASE_SCHEMA.md` (API-03). No event was migrated by DATA-1: none of the
mobile mocks is dated. Ticketmaster events can be imported by the backend provider layer (DATA-4,
`apps/api/apidocs/TICKETMASTER_PROVIDER.md`), DATAtourisme events too (DATA-6); no endpoint, no scheduled sync yet.

Timing (DATA-6, `apps/api/apidocs/DATA_PERSISTENCE_AND_SYNC.md` "NormalizedEvent"): an exact instant when the source
gives a time and its zone; otherwise a local date (and local time when known) — a date-only event never gets an
invented time. An event may carry its own location when the source gives no venue.

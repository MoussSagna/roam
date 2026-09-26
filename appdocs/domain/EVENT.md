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
`ExternalSource`) — `apps/api/apidocs/DATABASE_SCHEMA.md` (API-03); no endpoint, no provider sync yet.


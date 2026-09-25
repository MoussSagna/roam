# ROAM — Sync, Cache & Cost Control

## Goal

Control provider usage, reduce latency and avoid repeated identical requests.

```text
Provider
   ↓
Scheduled/on-demand sync
   ↓
Normalize
   ↓
Enrich
   ↓
Upsert
   ↓
Database
   ↓
API
   ↓
Mobile
```

## Cache

Cache slowly changing data such as identity, coordinates, photos and categories.

Refresh dynamic data such as event schedules, opening hours and prices according to provider-specific TTLs.

## Deduplication

Prefer stable provider IDs. Avoid duplicate records caused by repeated searches.

## Rate limiting

Respect every provider's documented quota. Backend must prevent request storms.

## Cost awareness

Google Places uses usage-based pricing with field/SKU considerations. Request only needed fields.

Ticketmaster has request quotas. Monitor request count and rate limits.

## Observability

At minimum log:

- provider
- operation
- success/failure
- latency
- cache hit/miss
- normalized result count

Never log secrets.

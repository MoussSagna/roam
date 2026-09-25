# ROAM — Data Foundation Overview

## Objective

Move ROAM from mock data toward real-world data without coupling the mobile app directly to external providers.

Architecture:
Sources → Provider adapters → Normalization → ROAM enrichment → Database/cache → Recommendation engine → Mobile app

## Initial sources

### Google Places

Use for places and factual place metadata:

- name, address, coordinates
- photos
- categories/types
- opening hours
- price level when available
- ratings/review metadata when available
- relevant place attributes

### Ticketmaster Discovery API

Use for:

- events
- dates/times
- venues
- classifications
- images
- pricing when available
- event URLs

### French Open Data / data.gouv.fr

Use progressively for:

- local events
- cultural activities
- municipal data
- public places
- other relevant datasets

## ROAM-owned enrichment

ROAM adds contextual data such as:

- atmosphere
- energy level
- suitable audience
- estimated duration
- best moments
- ROAM tags
- recommendation metadata

External facts and ROAM inferences must remain distinguishable.

## MVP scope

Start with Paris and nearby areas. Do not attempt nationwide ingestion initially.

## Migration principle

Existing mock data must remain functional while the new data layer is introduced.

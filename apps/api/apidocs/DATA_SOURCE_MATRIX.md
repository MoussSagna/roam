# ROAM — Data Source Matrix

| Data                 |   Google Places |    Ticketmaster | Open Data |              ROAM |
| -------------------- | --------------: | --------------: | --------: | ----------------: |
| Name                 |             Yes |             Yes |   Depends |                   |
| Description          |       Sometimes |             Yes |   Depends |                   |
| Address              |             Yes |             Yes |   Depends |                   |
| GPS                  |             Yes |             Yes |   Depends |                   |
| Photos               |             Yes |             Yes |   Depends |                   |
| Categories           |             Yes |             Yes |   Depends |         Normalize |
| Opening hours        |             Yes |      Usually no |   Depends |                   |
| Event date           |                 |             Yes |   Depends |                   |
| Event price          |                 |       Sometimes |   Depends |         Normalize |
| Rating               |             Yes |                 |   Depends |                   |
| Reviews              |             Yes |                 |   Depends |                   |
| Atmosphere           | Partial signals | Partial signals |   Depends | **Primary owner** |
| Energy               |                 |                 |           | **Primary owner** |
| Couple/friends/solo  | Partial signals |                 |           | **Primary owner** |
| Estimated duration   |                 |       Sometimes |   Depends | **Primary owner** |
| Best moments         | Partial signals |    Event timing |   Depends | **Primary owner** |
| ROAM tags            |                 |                 |           | **Primary owner** |
| Recommendation score |                 |                 |           | **Primary owner** |

ROAM-owned does not mean invented. Derived values must come from explicit rules, curated data, user feedback or validated future models.

Missing factual data stays `null`, `UNKNOWN`, or equivalent.

## Geoapify (DATA-2.1)

A second place source ([`GEOAPIFY_PROVIDER.md`](GEOAPIFY_PROVIDER.md)), OpenStreetMap data: name, address, GPS and
categories (normalized by an explicit table). No rating, reviews or price: they stay `null`/`UNKNOWN`. Opening hours,
website and facilities exist but are not read yet. Nothing ROAM-owned comes from it.

## Ticketmaster (DATA-4)

The event source ([`TICKETMASTER_PROVIDER.md`](TICKETMASTER_PROVIDER.md)): title, description, start/end instants,
timezone, images, price range when given (often absent), booking URL, cancellation, classification (only Arts & Theatre
maps to a ROAM category), venue (stored as a place). Nothing ROAM-owned comes from it.

## Open data (DATA-4 study)

The "Open Data" column above is now specified per dataset in [`OPEN_DATA_SOURCES.md`](OPEN_DATA_SOURCES.md) (no adapter
yet): DATAtourisme gives name, description, address, GPS, categories, opening hours, website, sometimes prices and event
dates (local, often without time), images only under per-image rights; Basilic gives name, address, GPS and cultural
type/labels; Data ES gives name, address, GPS, sports type/activities, free access and accessibility. None gives ratings
or reviews, and nothing ROAM-owned comes from them (they can be evidence for ROAM rules).

## Internal source: mobile mock migration (DATA-1)

Until the providers are connected, the catalog holds the mobile mock data, migrated once by DATA-1
([`DATA_1_MIGRATION_REPORT.md`](DATA_1_MIGRATION_REPORT.md)). Its provenance is the internal provider
`mobile_mock_migration` (`externalId` = the mobile id) — never a Google Places, Ticketmaster or open-data record. It
provides name/title, description, address, coordinates, categories, a budget bracket (stored as its bounds), mock
ratings; its tags and durations are stored as ROAM enrichment (`CURATED`, duration marked derived). No photo, opening
hours, event date, mood or review is migrated.

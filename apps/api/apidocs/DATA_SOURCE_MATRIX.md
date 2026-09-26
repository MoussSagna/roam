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

## Internal source: mobile mock migration (DATA-1)

Until the providers are connected, the catalog holds the mobile mock data, migrated once by DATA-1
([`DATA_1_MIGRATION_REPORT.md`](DATA_1_MIGRATION_REPORT.md)). Its provenance is the internal provider
`mobile_mock_migration` (`externalId` = the mobile id) — never a Google Places, Ticketmaster or open-data record. It
provides name/title, description, address, coordinates, categories, a budget bracket (stored as its bounds), mock
ratings; its tags and durations are stored as ROAM enrichment (`CURATED`, duration marked derived). No photo, opening
hours, event date, mood or review is migrated.

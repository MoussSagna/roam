# ROAM Open Data Sources

DATA-4 of [`DATA_IMPLEMENTATION_PLAN.md`](DATA_IMPLEMENTATION_PLAN.md): which French open datasets ROAM should use, why,
under which conditions, with which data, and how they fit the existing provider architecture. **A study, not an
implementation**: no adapter, no client, no sync, no cache, no Prisma change, no import. Everything below was checked
against the official documentation and the live sources on **2026-09-27**; figures marked _observed_ come from that check
(section 10), not from the publisher.

> Numbering: the plan calls this step DATA-4. The Ticketmaster sprint was also named "DATA-4"
> ([`TICKETMASTER_PROVIDER.md`](TICKETMASTER_PROVIDER.md)); it is the plan's DATA-3.

## 1. Objective

Complement — never replace — Google Places, Geoapify and Ticketmaster with public, institutional French data that they
do not carry: local tourism content, heritage and cultural labels, sports places. For each source: publisher, licence,
freshness, structure, identity, quality, overlap, and the mapping to the existing `Place` / `Event` / `Experience` models
and to the `NormalizedPlace` / `NormalizedEvent` contracts (`provider.types.ts`). The work of connecting them belongs to
DATA-6 (section 9).

Verdict:

| Source                                | Decision                               | Role for ROAM                                                                           |
| ------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| DATAtourisme                          | **Selected** — first open-data adapter | Tourism places (with descriptions and hours) and local events; `Place`, `Event`         |
| Basilic (Ministère de la Culture)     | **Selected** — facts, filtered         | Cultural venues as `Place` (museums, theatres, cinemas…); labels as institutional facts |
| Data ES (Ministère chargé des Sports) | **Selected** — filtered, later         | Sports and open-air places (`acces_libre`) as `Place`; no ROAM category exists yet      |

None of them is an `Experience` source (section 5).

## 2. Selected sources

### 2.1 DATAtourisme

- **Publisher**: the DATAtourisme national platform (State-backed, run with the tourism networks). Data **created by**
  about 40+ territorial tourism information systems — tourist offices, departmental and regional tourism bodies — each
  record names its producer in `hasBeenCreatedBy`. _Observed_ around Paris: "Paris je t'aime - Office de Tourisme",
  "Choose Paris Region", "Etablissement Public territorial Paris Est Marne et Bois", "Conseil Départemental des Yvelines".
- **Coverage**: France (FAQ: yes, but "chaque producteur garde la main sur ses données et décide du rythme et du
  périmètre"). Announced: "more than 530,000" points of interest (API launch, 2026-03-16). _Observed_: `meta.total`
  = 487,278 on `/catalog`; 4,663 POIs within 10 km of Paris Hôtel de Ville (1,470 within 2 km), 3,822 in département 75.
- **Data types**: four families — places (`PlaceOfInterest`, 74 % per the publisher), events (`EntertainmentAndEvent`,
  12 %), products (`Product`, 9 %: tastings, guided tours, rentals), itineraries (`Tour`, 5 %). 384 classes in the
  `PointOfInterestClass` thesaurus (e.g. `Restaurant`, `BarOrPub`, `CafeOrTeahouse`, `Museum`, `CulturalSite`,
  `ParkAndGarden`, `NaturalHeritage`, `Theater`, `Cinema`, `Concert`, `Exhibition`, `Festival`).
- **API** (production, launched 2026-03-16, versioned `/v1`, OpenAPI at `https://api.datatourisme.fr/v1/openapi.yml`):

  | Operation     | Request                                      | Notes                                                                                 |
  | ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
  | List / search | `GET https://api.datatourisme.fr/v1/catalog` | also `/placeOfInterest`, `/entertainmentAndEvent`, `/tour`, `/product` (pre-filtered) |
  | Details       | `GET /v1/catalog/{uuid}`                     | unknown id → `404 {"error":"Unknown object : …"}` (observed)                          |
  | Thesaurus     | `GET /v1/thesaurus/{code}`                   | valid values of `type`, `theme`, `amenity`…                                           |
  | Contact form  | `POST /v1/catalog/{uuid}/contact`            | sends an email to the POI's owner — **never used by ROAM**                            |

  Query parameters: `geo_distance=lat,lon,<n>km` (radius) and `geo_bounding` (box); `type` (a `PointOfInterestClass`),
  `insee`, `department`, `region`, `theme`, `amenity`, `update` (updated after a date), `start` / `end` (event dates,
  `format: date`); `filters` (expression language: `[eq]`, `[in]`, `[gte]`, `[between]`, `[exists]`…); `fields`
  (explicit field list — **any value replaces the default selection**); `lang` (default `fr,en`); `sort`
  (e.g. `lastUpdate[desc]`); `page` (default 1), `page_size` (default 20, max 100).

- **Pagination**: `meta { total, page, page_size, total_pages, next, previous }`. Page numbers reach only the first
  **10,000** results; beyond, the `next` links must be followed. The changelog says `page_size > 100` is a 400;
  _observed_: `page_size=101` returned 100 items with a 200 — do not rely on either, send ≤ 100.
- **Authentication**: a free API key on request (form: name, email, profile, organisation, intended use, acceptance of
  the CGU). Sent in the **`X-API-Key` header** (recommended; the `api_key` query parameter also works). Unauthenticated →
  `401 {"message":"Missing API key in request"}`, wrong key → `401 {"message":"Invalid API key in request"}` (observed).
  **Warning**: the documented `meta.next` example contains `api_key=…` — pagination links can carry the key, so they must
  never be logged or stored.
- **Quotas**: documented "Limite de 1000 requêtes/heure", "Maximum 20 à 30 requêtes concurrentes par client", "Pas plus
  de ~10 requêtes/seconde de manière prolongée". _Observed_ headers: `x-ratelimit-limit: 1000`,
  `x-ratelimit-remaining`, `x-ratelimit-reset` (seconds). Response times observed 0.07–0.2 s.
- **Update frequency**: FAQ — flows "mis à jour quotidiennement"; producers update places, products and itineraries "au
  moins une fois par an"; events are added or modified daily. Per-record dates: `lastUpdate` (producer, date) and
  `lastUpdateDatatourisme` (platform, instant); the `update` parameter and `sort=lastUpdate[desc]` allow incremental
  refreshes. `isObsolete` (boolean) flags a POI "plus d'actualité".
- **Identity**: `uuid` (the id accepted by `/catalog/{uuid}`), `uri` (persistent URI
  `https://data.datatourisme.fr/<n>/<uuid'>` — the uuid inside the URI is **not** the `uuid` field and is refused by
  `/catalog/{uuid}`, observed), `identifier` (the producer's own id, not unique nationally). Both uuids are version 3
  (name-based), which suggests a deterministic derivation — an inference, not documented. The documentation does not
  state a stability guarantee.
- **Useful fields** (from the OpenAPI schema):

  | Field                                                | Content                                                                                                                            |
  | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
  | `label`                                              | name, language map (`{"@fr": "…"}`)                                                                                                |
  | `type`                                               | **array** of classes, unordered (e.g. `["FoodEstablishment","BarOrPub","PointOfInterest","PlaceOfInterest"]`)                      |
  | `hasDescription[].shortDescription/description`      | texts (language maps); `hasTranslatedProperty` flags machine translations (since 2026-09-25)                                       |
  | `isLocatedAt[].geo.latitude/longitude`               | coordinates (numbers)                                                                                                              |
  | `isLocatedAt[].address[]`                            | `streetAddress[]`, `postalCode`, `addressLocality`, `hasAddressCity.insee`                                                         |
  | `isLocatedAt[].openingHoursSpecification[]`          | `opens`, `closes`, `dayOfWeek`, `validFrom`, `validThrough` (local, no zone)                                                       |
  | `takesPlaceAt[]` (events)                            | `startDate`, `endDate` (`aaaa-mm-jj`), `startTime`, `endTime` (`hh:mm`), `appliesOnDay`                                            |
  | `offers[].priceSpecification[]`                      | `minPrice[]`, `maxPrice[]`, `priceCurrency`, `name` (audience), `appliesOnPeriod`                                                  |
  | `hasContact[].homepage`                              | website (contact emails removed from responses since 2026-06-24)                                                                   |
  | `hasMainRepresentation[]` / `hasRepresentation[]`    | media: `hasRelatedResource[].locator` (URL), `hasAnnotation[].credits`, `isCoveredBy` (rights), `rightsStartDate`, `rightsEndDate` |
  | `hasBeenCreatedBy.legalName`                         | producer — **required for attribution**                                                                                            |
  | `lastUpdate`, `lastUpdateDatatourisme`, `isObsolete` | freshness                                                                                                                          |
  | `hasExternalReference[]`                             | links to external registries — observed: the Référentiel National des Bâtiments (RNB) id                                           |
  | `hasReview[]`                                        | official **classifications** (stars, labels), not user ratings                                                                     |

- **License**: Licence Ouverte / Etalab 2.0 (FAQ, data.gouv.fr) plus the platform's CGU (accepted with the key,
  <https://support.datatourisme.fr/tos>). Commercial reuse allowed.
- **Attribution** (mandatory): FAQ — "mentionner la paternité des données ainsi la date de dernière mise à jour de
  celles-ci. Pour ce faire, il est demandé aux diffuseurs d'exploiter les propriétés « HasBeenCreatedBy » et
  « LastUpdate »". Per record: the producer (`hasBeenCreatedBy.legalName`) and `lastUpdate`. A single global mention is
  "temporairement tolérée": "Données originales téléchargées sur la plateforme DATAtourisme… Date de dernière mise à
  jour : JJ/MM/AAAA". ROAM must therefore keep, per record, the producer name and `lastUpdate` (section 6).
- **Images — separate conditions**:
  - FAQ: photos are under the Licence Ouverte, **but** reuse "devra être accompagnée d'une mention des informations de
    crédits photographiques (propriété :Credits) et devra respecter les dates de cession de droits d'utilisation
    (:rightsStartingDate et :rightsEndingDate)" (named `rightsStartDate` / `rightsEndDate` in the API).
  - Each media also has its own `isCoveredBy`. _Observed_: the first image of the national catalogue is
    `"isCoveredBy": "By-NC-ND 4.0"` (Creative Commons **non-commercial, no derivatives**) — incompatible with a
    commercial app. **An image may be used only if its `isCoveredBy` allows it, its rights period covers the display
    date, and its credit is shown.**
  - _Observed_: 164,795 POIs have a main image nationally, **0** within 10 km of Paris. Images are not a reason to use
    DATAtourisme for the MVP.
- **Risks**:
  - Legal: per-image licences (NC/ND) and rights end dates; per-record attribution (producer + date); CGU accepted with
    the key; a POI's owner contact endpoint exists and must stay unused.
  - Technical: 1,000 requests/hour (a full national scan is ≈ 4,900 pages of 100, i.e. 5 hours of quota — the platform's
    "diffuseur" flows are the intended bulk channel); deep pagination only through `next` links (which may hold the key);
    `fields` replaces the default selection; multi-valued, language-mapped JSON-LD shapes; young API with frequent
    changes (changelog: `page_size` max 250 → 100 on 2026-07-15, emails removed 2026-06-24, new operators
    2026-09-21, `hasTranslatedProperty` 2026-09-25).
  - Data: event dates without time or zone, inconsistent periods (section 8); Paris event coverage is thin (154 events
    within 10 km, 42 with `start ≥ 2026-09-27`, observed).
- **ROAM mapping**: `PlaceOfInterest` → `Place` (priority); `EntertainmentAndEvent` → `Event` (after the decisions of
  section 5); `Product`, `Tour` → not imported (no ROAM model; candidates for curated `Experience` later). Details in
  section 5.

### 2.2 Basilic — Base des lieux et équipements culturels

- **Publisher**: Ministère de la Culture — Département des études, de la prospective, des statistiques et de la
  documentation (DEPS). Aggregates the directorates of the ministry (patrimoines et architecture, création artistique,
  médias et industries culturelles…), the CNC, the CNL, Artcena and the Médiathèque du patrimoine et de la photographie.
  Feeds INSEE's Base permanente des équipements and the Atlas Culture.
- **Coverage**: "France entière" (metropolitan and overseas). _Observed_: 86,366 rows; 3,767 in Paris (département 75).
- **Data types**: one row per (site, type/label). Domains (_observed_): Patrimoine 53,503, Lecture publique 15,702,
  Livre et presse 11,756, Cinéma 2,081, Arts du spectacle 1,403, Archives 1,274… Types: Monument 48,654, Bibliothèque
  15,702, Papeterie et maisons de la presse 7,370, Librairie 4,386, Cinéma 2,081, Musée 1,843, Théâtre 923, Parc et
  jardin 469, Scène 341, Opéra 15… Labels ("Label et appellation"): Monument historique, Musée de France, Art et essai,
  Jardin remarquable, Maison des illustres, Scène nationale, Patrimoine mondial de l'Unesco…
- **API**: no dedicated API. Distribution:
  - CSV on data.gouv.fr (`;`-separated, UTF-8 with BOM, 49 MB, resource
    `dced78ee-0823-4b61-86e6-57717308d4e4`), plus "Label et appellation.pdf" and "Métadonnées_baseDEPS.xlsx";
  - the data.gouv.fr **tabular API (beta)** over that CSV: `GET https://tabular-api.data.gouv.fr/api/resources/<rid>/data/`
    with column filters (`<col>__exact`, `__greater`, `__less`…), `page`, `page_size` (200 accepted, observed),
    `next` links; rate limit declared "100 req / seconde"; files up to 100 MB (CSV) are served. No geographic search:
    only boxes on the `Latitude`/`Longitude` columns — and the profiler typed `Longitude` as a **string** (observed),
    so range filters on it compare text, not numbers;
  - `data.culture.gouv.fr` (the former Opendatasoft portal cited by search engines) now redirects to
    `culture.data.gouv.fr` (observed).
- **Authentication / quotas**: none for the CSV; tabular API: no key, 100 req/s declared.
- **Update frequency**: data.gouv.fr metadata `frequency: punctual` (no schedule). _Observed_: CSV last replaced
  **2026-02-18**; the rows carry yearly entry notes ("entré dans la base en 2024/2025"). Roughly yearly — not a live
  source.
- **Identity**:
  - `Identifiant_deps_a_partir_de_2022` — unique in the file (observed), 16 rows without it. Format
    `<label code>_<INSEE commune>_<Rang>` (e.g. `THHL_75056_70621`). **It embeds the label code**, and a label can change
    (observed note: "Changement de label en 2025 SMAC à la place de SCIN") → the id changes with it.
  - `Rang` — unique, never empty, the numeric suffix of 86,315 of the ids (observed): the most stable candidate, but
    undocumented as an identifier.
  - `Identifiant_deps_old` — the pre-2022 format (`THHL_75111_0017`): the scheme already changed once.
  - `Identifiant origine` — the id in the source registry (e.g. Mérimée `PA00116507`, `ORG002973`): 3,013 empty, 16
    shared by two or three rows (observed). Useful to join other ministry datasets, not as ROAM identity.
- **Useful fields**: `Nom`, `Adresse`, `Code Postal`, `libelle_geographique` (commune, "Paris 11e Arrondissement"),
  `code_insee`, `Latitude`, `Longitude`, `Type équipement ou lieu`, `Label et appellation`, `Domaine`, `Sous_domaine`,
  `Précision équipement`, `Fonction_1..4` (création, diffusion, préservation…), cinema/theatre capacities
  (`Nombre_ecrans`, `Nombre_fauteuils_de_cinema`, `Jauge_du_theatre`), `Annee_Label_Appellation`,
  `Demographie_AP` / `Demographie_detail_entree` / `Demographie_detail_sortie` (status history).
  **Absent**: description, photos, opening hours, website, prices, events.
- **License**: Licence Ouverte / Etalab 2.0 (`lov2`, DCAT `license` = the Etalab PDF). Commercial reuse allowed.
- **Attribution**: Licence Ouverte — "mentionner la paternité de l'« Information » : sa source (a minima le nom du
  « Concédant ») et la date de la dernière mise à jour": "Ministère de la Culture — Base Basilic", with the resource date.
- **Images**: none in the dataset.
- **Risks**: identity tied to the label (above); several rows for one physical site (a museum that is also a monument
  historique; 28,899 rows share their exact coordinates with another row, 977 share name and coordinates — observed);
  most rows are not outing places (monuments that are private houses or ramparts, libraries, press shops, archives);
  stale between yearly releases; the publisher itself warns of "quelques erreurs (doublons ou erreurs d'adressage) et
  oublis".
- **ROAM mapping**: `Place` for the visitable venue types only (section 5); labels as institutional facts on the place.
  Not an `Event` or `Experience` source.

### 2.3 Data ES — Recensement des équipements sportifs, espaces et sites de pratiques

- **Publisher**: Ministère chargé des Sports (portal `equipements.sports.gouv.fr`, contributor PRNSI). Legal basis: Code
  du sport L312-2 — every owner of a sports facility must declare it.
- **Coverage**: metropolitan France and overseas; "plus de 330 000 lieux de pratiques". _Observed_: 334,430 equipments
  in `data-es` (complete), 152,330 installations; 2,916 in département 75; 350 within 2 km of Paris Hôtel de Ville.
- **Data types**: two levels — the **installation** (`inst_numero`, "un lieu caractérisé par une adresse", e.g. a
  swimming pool complex) and the **equipment** (`equip_numero`, "l'espace élémentaire de pratique", e.g. each pool, each
  court, each dance room), located by its own coordinates. Families (_observed_): Divers équipements Sports de nature
  42,134, Terrain de grands jeux 41,445, Court de tennis 38,400, Boulodrome 28,660, Multisports/City-stades 25,600,
  Salle multisports 18,670, Bassin de natation 6,320, Skatepark & vélo Freestyle 3,642, SAE (escalade) 3,089…
- **API**: Opendatasoft Explore API v2.1 on `https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/<id>/`:
  `records` (JSON, `where` in ODSQL — including `within_distance(equip_coordonnees, geom'POINT(lon lat)', 2km)` —,
  `select`, `group_by`, `order_by`, `limit` ≤ 100, `offset + limit` ≤ 10,000; both limits observed as 400 errors) and
  `exports/csv|json|parquet…` (whole dataset, no paging limit; the CSV of `data-es` is ≈ 77 MB, observed). Datasets:
  `data-es` (complete, 107 fields — the one to use), `data-es-installation`, `data-es-equipement`, `data-es-activite`,
  `data-es-types`, `data-es-activites`.
- **Authentication / quotas**: none required. _Observed_ headers: `x-ratelimit-limit: 5000`, reset at 00:00 UTC — 5,000
  anonymous calls per day (not stated in the dataset documentation).
- **Update frequency**: "mise à jour quotidiennement" (dataset description; DCAT `accrualperiodicity: daily`; data.gouv.fr
  `frequency: daily`). _Observed_: `data-es` modified 2026-09-27 06:16 UTC, `data-es-equipement` 2026-09-25. Per-record
  `equip_maj_date` — but the publisher states "Toutes dates antérieures au 31 mars 2025 ne doit pas être prise en compte",
  and _observed_ every record is dated 2025 (321,026) or 2026 (12,669): a migration reset, so the date is meaningful only
  from 2025-03-31.
- **Identity**: `equip_numero` — documented as "Identifiant unique de l'équipement sportif", `E<nnn>I<INSEE><nnnn>` (e.g.
  `E014I751040010` = 14th equipment of installation `I751040010`); `inst_numero` = `I<INSEE of creation><nnnn>`.
  Documented composition, national scope: the most stable identifiers of the three sources. `equip_rnb` = RNB building id.
- **Useful fields** (`data-es`): `equip_nom`, `inst_nom`, `equip_type_name`, `equip_type_famille`, `equip_type_code`,
  `aps_name` (activities, array), `equip_coordonnees` (`{lon, lat}`) / `equip_x`, `equip_y`, `inst_adresse`, `inst_cp`,
  `new_name` (commune), `new_code` (INSEE), `equip_url` (website), `equip_acc_libre` ("accessible à tous, de manière
  permanente (non clos)"), `equip_saison` (seasonal opening, < 6 months), `equip_nature` (Intérieur, découvert, site
  naturel…), `equip_utilisateur`, accessibility (`equip_acces_handi_mobilite`, `equip_pmr_*`, `equip_pshs_*`,
  `inst_acc_handi_bool`), `inst_trans_bool` (public transport), `inst_hs_bool` (installation out of service), `equip_rnb`.
  **Absent**: description, photos, opening hours, prices, events.
- **License**: Licence Ouverte / Etalab 2.0 (portal and data.gouv.fr). Commercial reuse allowed.
- **Attribution**: "Ministère chargé des Sports — Data ES", with the date of last update.
- **Personal data**: the `data-es-equipement` dataset publishes `declarant_nom`, `declarant_prenom`, `declarant_mail`,
  `declarant_telephone`. The Licence Ouverte allows reuse only "à condition de respecter le cadre légal relatif à la
  protection des données à caractère personnel". **ROAM never reads these fields**: use `data-es` (which does not contain
  them) and select fields explicitly.
- **Images**: none.
- **Risks**: granularity (a dance centre with 14 rooms is 14 equipments at the same point — observed); most records are
  not ROAM outings (school gyms, club pitches); `inst_hs_bool` inconsistent (`Oui`/`OUI`/`oui`/`Non`/null); list fields
  sometimes split on commas (`equip_utilisateur` observed as `["[\"Individuel(s)", "famille(s)\"", …]`); websites without
  scheme (`www.paris-danse.fr`); 1,740 records without coordinates.
- **ROAM mapping**: `Place` for publicly usable installations only (section 5). No ROAM category exists for sport today.

## 3. Comparison

| Criterion               | DATAtourisme                                                                | Basilic                                                     | Data ES                                                              |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Publisher               | DATAtourisme platform; records by territorial tourism bodies                | Ministère de la Culture (DEPS)                              | Ministère chargé des Sports                                          |
| Domain                  | tourism: places, events, products, itineraries                              | cultural places, heritage, labels                           | sports equipment and practice places                                 |
| Coverage                | France, uneven by producer                                                  | France (+ overseas)                                         | France (+ overseas), legal declaration duty                          |
| Data types              | POIs (JSON-LD-like), events                                                 | places (flat rows)                                          | installations → equipments (flat rows)                               |
| Volume                  | "> 530,000" announced; 487,278 observed                                     | 86,366 rows observed                                        | "> 330,000" announced; 334,430 observed                              |
| Freshness               | flows daily; places ≥ yearly; events daily                                  | punctual, last 2026-02-18 (≈ yearly)                        | daily (confirmed: modified 2026-09-27)                               |
| Format                  | JSON API                                                                    | CSV (+ data.gouv tabular API, beta)                         | JSON / CSV / Parquet, Opendatasoft API                               |
| API                     | yes, `/v1`                                                                  | no dedicated API                                            | yes (Explore v2.1)                                                   |
| Authentication          | free key, `X-API-Key`, CGU                                                  | none                                                        | none                                                                 |
| Quota                   | 1,000 req/h, 20–30 concurrent, ~10 req/s                                    | tabular API 100 req/s declared                              | 5,000 req/day anonymous (observed header)                            |
| Pagination              | `page` ≤ 10,000 results, then `next`; `page_size` ≤ 100                     | tabular: `page`, `page_size`, `next`                        | `limit` ≤ 100, `offset + limit` ≤ 10,000; exports unlimited          |
| Geographic search       | `geo_distance`, `geo_bounding`                                              | none (box on columns; `Longitude` typed as text)            | `within_distance`, `in_bbox` (ODSQL)                                 |
| Stable identifier       | `uuid` (+ `uri`); stability not documented                                  | `Identifiant_deps_a_partir_de_2022`, changes with the label | `equip_numero` / `inst_numero`, documented composition               |
| Coordinates             | yes (observed 100/100 in sample)                                            | yes, all rows (some wrong)                                  | yes, except 1,740                                                    |
| Categories              | 384-class thesaurus, multi-valued                                           | type + label + domain                                       | type + family + activities                                           |
| Description             | yes (98–99 % in the Paris sample)                                           | no                                                          | no (free-text `equip_obs` only)                                      |
| URL                     | `hasContact.homepage` (91 % places sample)                                  | no                                                          | `equip_url` (45,584 records, ≈ 14 %)                                 |
| Images                  | some, **per-image licence/rights**; none around Paris                       | no                                                          | no                                                                   |
| Prices                  | `offers` amounts (7 % places, 36 % events in the Paris sample)              | no                                                          | no                                                                   |
| Opening hours           | `openingHoursSpecification` (70 % of the Paris places sample)               | no                                                          | only `equip_saison`, `equip_acc_libre`                               |
| Licence                 | Licence Ouverte 2.0 + CGU                                                   | Licence Ouverte 2.0                                         | Licence Ouverte 2.0                                                  |
| Attribution             | **per record**: producer (`hasBeenCreatedBy`) + `lastUpdate`; image credits | source + date                                               | source + date                                                        |
| Legal risks             | image licences (NC/ND), rights periods, CGU                                 | low                                                         | personal data in `data-es-equipement` (declarants)                   |
| Technical risks         | quota, pagination links carrying the key, API changes, event dates          | no API, label-based ids, yearly file                        | granularity, text-encoded booleans/lists                             |
| Interest for ROAM       | **high** (places with descriptions/hours, local events)                     | **medium** (cultural venues, labels)                        | **medium, later** (open-air sport; needs a ROAM category)            |
| Overlap Google/Geoapify | high for restaurants/bars/museums                                           | high for museums/theatres/cinemas; low for labels           | low–medium (parks, pools, gyms in OSM; courts, city-stades partly)   |
| Overlap Ticketmaster    | low (different events)                                                      | none                                                        | none                                                                 |
| Specific added value    | editorial descriptions, hours, local/free events, tourism classes           | official labels (Musée de France, Monument historique…)     | free-access sports places, accessibility, exhaustive legal inventory |

## 4. Overlap with existing providers

- **Google Places** ([`GOOGLE_PLACES_PROVIDER.md`](GOOGLE_PLACES_PROVIDER.md)): covers the same commercial places as
  DATAtourisme (restaurants, bars, museums) with ratings, reviews and photos that open data does not have. Open data adds:
  editorial French descriptions by tourist offices, official classifications (stars, labels), institutional labels
  (Basilic), and non-commercial places (free-access sports grounds, remarkable gardens, heritage) that Google knows
  poorly or without context. Google stays the reference for ratings and photos; open data must not overwrite them.
- **Geoapify** (OpenStreetMap, [`GEOAPIFY_PROVIDER.md`](GEOAPIFY_PROVIDER.md)): overlaps on geometry and names of parks,
  museums, sports places. It has no description, no ratings, no price — exactly where DATAtourisme is richer. Data ES is
  more exhaustive than OSM for sports equipment (legal declaration) but less "outing-shaped".
- **Ticketmaster** ([`TICKETMASTER_PROVIDER.md`](TICKETMASTER_PROVIDER.md)): ticketed concerts, shows and exhibitions
  with absolute instants and booking links. DATAtourisme events are a different population: local, often free (markets,
  fairs, heritage days, exhibitions announced by tourist offices), with local dates and frequently no time. Overlap is
  possible on major exhibitions (observed: "Louvre Photo" at the Louvre in DATAtourisme); dedup rules are DATA-6's.
  **Around Paris DATAtourisme cannot replace Ticketmaster**: 154 events within 10 km, 42 upcoming (observed).
- **Where open data really adds something**: local tourism content outside big cities (the MVP is Paris, but coverage is
  national); heritage and cultural labels; free-access sports and outdoor places (`equip_acc_libre`: 123,935 records);
  accessibility facts (Data ES `equip_pmr_*`, DATAtourisme amenities); institutional provenance ("source: Ministère de la
  Culture") that is a trust signal.

## 5. Normalization strategy

The existing contracts — `NormalizedPlace` (name, address, city, coordinates, price level, rating, review count, active
flag, category slugs, source) and `NormalizedEvent` (title, description, instants, timezone, images, prices, booking URL,
active flag, category, venue) — and the Prisma models absorb the core of all three sources **without a schema change**.
Two gaps are documented for DATA-6 instead of being patched here:

1. **`NormalizedPlace` carries no description, photos, opening hours, website or attributes**, although `Place` has
   `description`, `photos`, `openingHours` (JSON) and `attributes` (JSON). DATAtourisme's main value is precisely there.
   A contract extension (optional fields, written by `PlaceIngestionService` under the existing ownership rules) is
   needed — not a Prisma change. `Place` has no website column: `attributes` or a decision in DATA-6.
2. **`Event` has no location of its own and no "date only" marker**: its location is its venue `Place`, and `startDate`
   is a required instant. DATAtourisme events carry an inline location without a venue id, and dates without time or
   zone. See the Event row below. This is a real incompatibility — documented, not fixed.

ROAM categories are the DATA-1 slugs: `cafe`, `restaurant`, `bar`, `park`, `culture`, `nature`, `experience`. No new
category is created by this study.

### Place

| Source       | → `Place` / `NormalizedPlace`                                                                                                                                                                                                                                                                                                                                                                                                                                      | Transformation                                                                                                                                                                                                                                                                                                                          | Kept as provenance only                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| DATAtourisme | `name` ← `label.@fr` (else first language); `address` ← `streetAddress` + `postalCode` + `addressLocality`; `city` ← `addressLocality`; lat/lon ← `isLocatedAt[0].geo`; `isActive` ← `!isObsolete`; `priceLevel` `UNKNOWN`; `rating`/`reviewCount` null (`hasReview` is a classification, **not** a rating); after the contract extension: `description`, `openingHours`, website                                                                                  | language-map flattening; `type` array → explicit class table, most specific class first: `Restaurant`→`restaurant`, `BarOrPub`→`bar`, `CafeOrTeahouse`→`cafe`, `Museum`/`CulturalSite`/`Theater`/`Cinema`→`culture`, `ParkAndGarden`→`park`, `NaturalHeritage`/`NaturalPark`→`nature`; any other class → no category                    | `type` array, producer, `lastUpdate`, `uri`, `identifier`, RNB reference, classifications                                               |
| Basilic      | `name` ← `Nom`; `address` ← `Adresse` + `Code Postal` (null when `Adresse` is empty — 31,397 rows); `city` ← commune (arrondissement label to be normalized, e.g. "Paris 11e Arrondissement" → "Paris"); lat/lon ← `Latitude`, `Longitude` (range-checked; rows outside France's boxes rejected); `isActive` ← not "sorti/désactivé" in `Demographie_detail_sortie` (the `Demographie_AP` column says `Actif` for all rows, observed); rating/price null/`UNKNOWN` | **filter by type**: Musée, Théâtre, Scène, Opéra, Cinéma, Centre d'art, Centre culturel, Lieu de mémoire → `culture`; Parc et jardin → `park`. Excluded: Monument (unless labelled and visitable — needs a rule), Bibliothèque, Papeterie et maisons de la presse, Librairie, Service d'archives, Conservatoire, enseignement supérieur | `Type équipement ou lieu`, `Label et appellation`, `Domaine`, `Sous_domaine` as `providerCategories`; `Identifiant origine`; label year |
| Data ES      | one `Place` per **installation** (not per equipment): `name` ← `inst_nom`; `address` ← `inst_adresse` + `inst_cp`; `city` ← `new_name`; lat/lon ← the equipments' `equip_coordonnees` (the installation has an address but no coordinates — pick the first equipment or their centroid: a DATA-6 rule); `isActive` ← `inst_hs_bool` not yes (case-insensitive)                                                                                                     | **filter**: `equip_acc_libre = true` or public-use types (pools, skateparks, climbing walls, parcours de santé…); `equip_url` → website with `https://` added only when it is a bare host; category: **none** today (no `sport` slug; creating one is a product decision)                                                               | `equip_type_name`, `equip_type_famille`, `aps_name` as `providerCategories`; equipment numbers; accessibility flags → `attributes`      |

### Event

| Source       | → `Event` / `NormalizedEvent`                                                                                                                                                                                                                                                                                                                                                   | Transformation / open decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DATAtourisme | `title` ← `label`; `description` ← `hasDescription`; `startDate`/`endDate` ← `takesPlaceAt`; `priceMin`/`priceMax`/`currency` ← the first coherent `offers.priceSpecification`; `priceLevel` `UNKNOWN`; `bookingUrl` ← `hasContact.homepage`; `isActive` ← `!isObsolete`; category: `Concert`, `Exhibition`, `Festival`, `CulturalEvent`, `ShowEvent`… → `culture`, others none | **Dates**: `startDate` + `startTime` are local, without zone → combine with the zone of the commune (`Europe/Paris` in metropolitan France; overseas départements have their own zones) — never the server zone. 57 % of the Paris sample has **no `startTime`**: DATA-6 must choose between dropping them (the Ticketmaster rule for TBA events) and adding a date-only marker to `Event` (schema decision). **Periods**: long exhibitions and recurring events (`appliesOnDay`) — one `Event` per record (identity = `uuid`), holding the current or next period; never expand recurrences into invented occurrences. **Venue**: no venue id — the inline `isLocatedAt` cannot become a `Place` with a stable identity; DATA-6 decides (link by dedup to an existing place, or a place identified by the event's `uuid`). Events ending in the past or with `endDate < startDate` are skipped. |
| Basilic      | —                                                                                                                                                                                                                                                                                                                                                                               | no events                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Data ES      | —                                                                                                                                                                                                                                                                                                                                                                               | no events                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Experience

None of the sources is an `Experience` source. `Experience` is what ROAM recommends — a composed, curated outing
(EXPERIENCE.md) — while these sources describe places and dated events. DATAtourisme `Product` (tastings, guided tours,
rentals) and `Tour` (itineraries) are the closest; they are **not imported** until a curation flow exists (an
experience made of a DATAtourisme itinerary would need its steps as places and a ROAM editorial decision). Open-data
places and events can later be **linked** to experiences (`ExperiencePlace`, `Event.experienceId`) like any provider's.

### Enrichment

Open data provides **evidence** for the ROAM enrichment (DATA-5, [`ROAM_ENRICHMENT.md`](ROAM_ENRICHMENT.md)), never
enrichment itself: e.g. Data ES `equip_nature = découvert` or DATAtourisme `ParkAndGarden` supports `OUTDOOR`; a Basilic
"Musée de France" label supports `CULTURAL`; Data ES accessibility flags are facts. Rules using them are DATA-5 work.

## 6. Identity and provenance

Existing storage: `Provider` row (key, name) + `ExternalSource (providerId, entityType, externalId)` unique, with
`externalUrl`, `providerCategories`, `fetchedAt`, `providerUpdatedAt` (DATABASE_SCHEMA.md). The provider keys below are
proposals for DATA-6 (snake_case like `google_places`); the ids are those the publishers define.

| Provider key   | Entity | `externalId`                               | `externalUrl`                                               | `providerUpdatedAt`                                      | Stability                                                                                             |
| -------------- | ------ | ------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `datatourisme` | PLACE  | `uuid`                                     | `uri` (persistent URI, not a human page)                    | `lastUpdate` (producer date)                             | the API's lookup key; derivation undocumented; a producer re-creating a record gives a new one        |
| `datatourisme` | EVENT  | `uuid`                                     | `uri`                                                       | `lastUpdate`                                             | same                                                                                                  |
| `basilic`      | PLACE  | `Identifiant_deps_a_partir_de_2022`        | null                                                        | the resource date (no per-row date)                      | **changes with the label code**; scheme changed in 2022; `Rang` is the stable part (unique, observed) |
| `data_es`      | PLACE  | `inst_numero` (one place per installation) | null (`equip_url` is the place's website, not the record's) | `max(equip_maj_date)` of its equipments, from 2025-03-31 | documented national id, composition documented; reliable                                              |

Provenance that must also be kept, because the licences require it or DATA-6 needs it:

- **Attribution data** (licence obligation): DATAtourisme `hasBeenCreatedBy.legalName` + `lastUpdate` per record;
  Basilic and Data ES: publisher + dataset date. `ExternalSource` has no producer column: `providerCategories` is for
  classifications — DATA-6 must decide where the producer name lives (a column, or a documented convention) before
  DATAtourisme data is shown.
- **Image rights** (DATAtourisme): credits, `isCoveredBy`, `rightsStartDate`, `rightsEndDate` per image. `Place.photos`
  is a list of strings: storing a DATAtourisme image URL without its rights would lose a display condition. **Do not
  store DATAtourisme images until a place for their rights exists.**
- **Secondary ids** for future joins: DATAtourisme RNB reference (`hasExternalReference`), Data ES `equip_rnb`, Basilic
  `Identifiant origine`, INSEE commune codes (all three).

## 7. Deduplication risks

No cross-provider merge is done or designed here (DATA-6, SYNC_CACHE_AND_COST_CONTROL.md; EXPERIENCE.md: "provider IDs
first, then normalized name/address/coordinates… Never merge solely on similar names"). What DATA-6 will face:

- **Same place in several providers**: a Paris museum can exist in Google, Geoapify, DATAtourisme and Basilic (and a
  pool in Geoapify, DATAtourisme and Data ES). None shares an id with another, except:
  - **RNB building ids**: present in DATAtourisme (`hasExternalReference`, 56 % of the Paris places sample) and Data ES
    (`equip_rnb`) — a genuine cross-source key for buildings (not for events, not for open-air places);
  - **INSEE commune code**: all three — a blocking key, not an identity.
- **Duplicates inside a source**:
  - Basilic: one site per label (monument + museum), 977 rows sharing name and coordinates, `Identifiant origine` shared
    by up to 3 rows;
  - Data ES: many equipments per installation at the same point (handled by the installation-level mapping);
  - DATAtourisme: several producers cover the same area (observed around Paris: the city's tourist office, the
    regional body, a territorial body), so the same POI may be described twice; nothing in the API links such records.
- **Events**: DATAtourisme vs Ticketmaster for the same exhibition or show — only title, date and venue are comparable,
  and DATAtourisme dates are local and often without time.
- **Coordinates are not reliable enough to merge on alone**: Basilic has swapped latitude/longitude for Saint-Pierre-et-
  Miquelon (observed `-56.159, 46.775`), 28,899 rows sharing exact coordinates; Data ES coordinates are the equipment's,
  not the entrance.

## 8. Data quality risks

| Source       | Completeness                                                                                                                | Geolocation                                                                                | Identity                                             | Categorization                                           | Freshness                                                                   | Potential issues                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATAtourisme | good texts (descriptions 98–99 %, website 91 %, hours 70 % in the Paris places sample); prices rare; no images around Paris | present in 100/100 + 100/100 sampled records                                               | `uuid` present; `identifier` is producer-local       | multi-valued, unordered `type`; needs a precedence table | 84 % of places updated in 2026; events include records last updated in 2016 | **events**: 40/100 already over, 22/100 with `endDate < startDate`, 57/100 without time (Paris sample); producer-dependent coverage; machine translations flagged since 2026-09-25 |
| Basilic      | names and coordinates always; address empty for 31,397 rows; no description/URL/hours                                       | all rows; lat/lon swapped for Saint-Pierre-et-Miquelon; commune-level duplicates of points | new id missing on 16 rows; id changes with the label | clear types/labels; most types are not outings           | ≈ yearly file (last 2026-02-18)                                             | status columns contradict (`Actif` for rows marked "sorti de la base"); publisher-acknowledged duplicates and address errors                                                       |
| Data ES      | names always; address empty for 17,118 records; activities empty for 3,760; website ≈ 14 %                                  | 1,740 records without coordinates                                                          | documented national ids                              | 29 families, types and activities; not ROAM categories   | daily; `equip_maj_date` reliable only from 2025-03-31                       | text-encoded booleans with mixed case; list fields split on commas; equipment-level granularity; out-of-service flag rarely filled                                                 |

Rules DATA-6 should apply (the existing adapters' policy): drop records without a name or valid coordinates; range-check
coordinates (and reject known-swapped ones rather than "fix" them silently); never invent a time, a price, a category or
an end date; keep unknowns `null`/`UNKNOWN`.

## 9. DATA-6 recommendations

Order: **DATAtourisme places first** (richest, API, Paris covered), then Basilic cultural venues, then Data ES
(after a product decision on a sport category), DATAtourisme events last (after the date decision).

1. **Contract**: extend `NormalizedPlace` with optional `description`, `photos`, `openingHours`, `attributes` (and a
   website decision); write them through `PlaceIngestionService` with the existing ownership rules. No Prisma change.
2. **Attribution storage**: decide where the DATAtourisme producer name lives per record (it is mandatory to display);
   show "source + date of last update" wherever open data is shown (DATA-7/DATA-8).
3. **Images**: no DATAtourisme image stored until per-image rights (licence, credit, rights period) have a home; filter
   out non-commercial / no-derivative licences and expired rights.
4. **Events**: decide date-only events (drop, like Ticketmaster TBA events, or a schema marker); local date + commune
   time zone → instant; one event per `uuid`; venue linking rule.
5. **Access**:

   | Source       | Endpoint                                                                                     | Auth               | Quota                            | Timeout                | Pagination / size                                                                       | Geo / category                                                              |
   | ------------ | -------------------------------------------------------------------------------------------- | ------------------ | -------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
   | DATAtourisme | `api.datatourisme.fr/v1/placeOfInterest`, `/entertainmentAndEvent`, `/catalog/{uuid}`        | `X-API-Key` header | 1,000/h, ≤ 20 concurrent, ≤ 10/s | 5 s (observed ≤ 0.2 s) | `page_size` ≤ 100; one page per call like the other adapters; `next` links never logged | `geo_distance`, `type`, `update` for incremental refresh; explicit `fields` |
   | Basilic      | CSV resource (whole file, ≈ 49 MB) or tabular API                                            | none               | 100 req/s (tabular)              | 30 s for the file      | whole-file import filtered by type and region (a few thousand rows for Île-de-France)   | none — filter on `N_Département` / box                                      |
   | Data ES      | `equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/records` or `/exports` | none               | 5,000/day (observed)             | 5 s (records)          | `limit` ≤ 100, `offset + limit` ≤ 10,000; `exports` filtered with `where` for bulk      | `within_distance`, `equip_type_famille`, `equip_acc_libre`                  |

6. **Refresh / TTL**: DATAtourisme places weekly with `update=<last run>`; events daily; Basilic when a new resource is
   published (compare the data.gouv.fr resource date); Data ES weekly by `equip_maj_date`. Deactivate (never delete)
   records a full refresh no longer returns; honour `isObsolete` and Data ES out-of-service flags.
7. **Dedup**: provider ids first (existing unique key); then RNB id where both sides have it; then name + address +
   distance with conservative thresholds; never on names alone; keep every `ExternalSource` of a merged place.
8. **Scope**: Paris and nearby areas first (DATA_FOUNDATION.md), no national import; never read Data ES declarant fields;
   never call the DATAtourisme contact endpoint.
9. **Observability**: per call — provider, operation, latency, result count, skipped records by reason, remaining quota
   (`x-ratelimit-remaining` on both APIs); never the key or a URL that may contain it.

### Sources candidates non retenues

| Source                                                      | Why it looks interesting                                                                                | Why not selected now                                                                                                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Que faire à Paris ?" (Ville de Paris, `opendata.paris.fr`) | 3,634 Paris events and activities (observed), with dates, prices, cover image and credit, accessibility | licence **ODbL** (share-alike on derived databases — a legal review is needed before mixing it into the ROAM catalogue); Paris-only; outside the three sources of this step. Strongest candidate to complement Ticketmaster for Paris |
| Mérimée / Palissy (monuments, heritage objects)             | detailed heritage records                                                                               | Basilic already aggregates the monuments (Mérimée ids appear in `Identifiant origine`); descriptions are for specialists, not outings                                                                                                 |

## 10. Sources and official documentation

Checked on 2026-09-27.

- DATAtourisme API documentation: <https://api.datatourisme.fr/v1/docs>; OpenAPI: <https://api.datatourisme.fr/v1/openapi.yml>
  (Swagger UI: <https://api.datatourisme.fr/v1/swagger/>)
- DATAtourisme FAQ (licence, attribution, photos, update frequency, quotas): <https://www.datatourisme.fr/faq/>
- DATAtourisme — using the data, API key form: <https://www.datatourisme.fr/utiliser-les-donnees/>; CGU:
  <https://support.datatourisme.fr/tos>; available data: <https://www.datatourisme.fr/les-donnees-disponibles/>
- DATAtourisme API launch (2026-03-16): <https://www.datatourisme.fr/2026/03/16/lapi-datatourisme-un-acces-direct-aux-donnees-touristiques/>
- DATAtourisme on data.gouv.fr: <https://www.data.gouv.fr/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data>
- Basilic on data.gouv.fr (licence, frequency, resources): <https://www.data.gouv.fr/datasets/base-des-lieux-et-equipements-culturels-basilic>
  — API: `https://www.data.gouv.fr/api/1/datasets/base-des-lieux-et-equipements-culturels-basilic/`
- data.gouv.fr tabular API (beta, limits): <https://www.data.gouv.fr/dataservices/673b0e6774a23d9eac2af8ce>, <https://tabular-api.data.gouv.fr/api/doc>
- Data ES portal: <https://equipements.sports.gouv.fr/>; dataset `data-es`: <https://equipements.sports.gouv.fr/explore/assets/data-es/>;
  methodology: <https://equipements.sports.gouv.fr/pages/methodologie/>; ministry page:
  <https://www.sports.gouv.fr/recensement-des-equipements-sportifs-data-es-671>
- Data ES on data.gouv.fr: <https://www.data.gouv.fr/datasets/recensement-des-equipements-sportifs-espaces-et-sites-de-pratiques>
- Licence Ouverte / Etalab 2.0: <https://github.com/etalab/licence-ouverte/blob/master/LO.md>
- Que faire à Paris ?: <https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/>

**How the observations were made** (manual, not in CI, nothing written to any database): DATAtourisme — about 25 read
requests with the local key (header only; the key appeared in no output, and the stored responses were checked for
`api_key`), counts around Paris (48.8566, 2.3522) and one page of 100 places and 100 events within 10 km; Basilic — the
CSV of 2026-02-18 profiled in a temporary directory; Data ES — aggregate queries (`group_by`, `count`) and two sample
records through the public API. No data from these checks is kept in the repository.

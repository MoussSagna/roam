# ROAM — Agent Prompt: DATA-1 Data Foundation

## Mission

Implement DATA-1: the ROAM Data Foundation.

Prepare the codebase for real external data without connecting Google Places or Ticketmaster yet.

## 1. Read documentation first

Before changing anything:

- Read every relevant `.md` file.
- Inspect architecture, stack, current models, repository patterns, tests, navigation and previous sprint decisions.
- Inspect existing implementation before creating files.
- Reuse existing types, repositories, hooks, services and utilities.
- Do not duplicate architecture.

## 2. Audit current data architecture

Identify:

- Experience models
- recommendation models
- mock repositories
- services/hooks
- backend/API structure
- Journey models
- Map models
- location/source types
- existing tests

Preserve compatibility.

## 3. Implement canonical models

Create or adapt:

- Experience
- Event
- Place
- Location
- Pricing
- Source metadata
- Atmosphere/enrichment
- recommendation metadata where appropriate

Follow the other DATA foundation documents.

## 4. Provider abstraction

Create provider interfaces/adapters for future:

- Google Places
- Ticketmaster
- Open Data

Do NOT call external APIs in this sprint.

Keep provider DTOs separate from canonical ROAM models.

## 5. Preserve the app

Existing mock data must continue working.

Do not rewrite unrelated screens or navigation.

Do not break Home, Discover, Search, Map, Experience Detail, Journey or Profile.

## 6. Repository layer

Adapt repositories so the future flow is:

Provider → normalization → repository → ROAM model

Never expose raw provider payloads.

## 7. Tests

Add tests for:

- canonical transformations
- provider contracts
- normalization
- pricing normalization
- missing data
- source metadata
- repositories
- compatibility with existing mock data

Do not weaken existing tests.

## 8. Documentation

Update existing docs where necessary. Avoid redundant documentation.

## 9. Validation

Run TypeScript, ESLint, unit tests and relevant integration/build checks. Fix issues introduced by this sprint. Do not hide problems with unsafe casts or disabled rules.

## 10. Git

Create one focused DATA-1 commit with a clear message. No unrelated changes.

## STOP

Do not implement Google Places.
Do not implement Ticketmaster.
Do not implement database synchronization.
Do not implement the recommendation engine.

Stop after DATA-1 and wait for validation.

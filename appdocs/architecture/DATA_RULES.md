# ROAM — Data Rules & Guardrails

1. Never invent provider facts.
2. Never expose provider JSON to mobile.
3. Never place API keys in React Native source.
4. Never assume an event price if unavailable.
5. Never assume an exact duration without sufficient evidence.
6. Never present ROAM inference as a provider fact.
7. Keep provenance for imported data.
8. Respect quotas, pricing and provider terms.
9. Request only necessary fields.
10. Keep mock data functional during migration.
11. Do not couple recommendation logic to one provider.
12. Make provider replacement possible through adapters.

## Provenance
Retain provider, external ID, retrieval time and source URL when available.

## Licensing
Before production ingestion, review provider terms, content/photo usage, attribution, caching restrictions and dataset licenses.

## Accuracy
Use `UNKNOWN`/null rather than fabricated precision.

## Future AI
AI may assist enrichment later, but must not silently become a factual data source. AI-derived enrichment needs validation and provenance.

# ROAM — Normalization & Enrichment

## Pipeline

```text
Provider response
      ↓
Validation
      ↓
Provider DTO
      ↓
Normalization
      ↓
ROAM Experience
      ↓
ROAM Enrichment
      ↓
Persistence
```

## Pricing normalization

```text
FREE
LOW
MEDIUM
HIGH
VERY_HIGH
UNKNOWN
```

Also retain numeric min/max/currency when available. Never invent missing prices.

## Atmosphere examples

`CHILL, COZY, ROMANTIC, FESTIVE, CULTURAL, IMMERSIVE, SOCIAL, CREATIVE, OUTDOOR, QUIET`

## Energy

`LOW | MEDIUM | HIGH`

## Suitable for

`SOLO | COUPLE | FRIENDS | FAMILY | GROUP`

## Best moments

`MORNING | AFTERNOON | EVENING | NIGHT | ANYTIME`

## Duration

Prefer explicit provider duration. If inferred, mark it as derived and retain the rule/basis.

## Confidence

Derived enrichment may use:

```text
{
  value: "ROMANTIC",
  confidence: 0.78,
  source: "roam_rules"
}
```

## Rule-based first version

Use deterministic, explainable rules.

Example:
`liveMusic=true + bar=true + lateOpening=true → potentially HIGH energy`

This is an inference, not a provider fact.

Future enrichment may use curated data, feedback or ML without changing the domain model.

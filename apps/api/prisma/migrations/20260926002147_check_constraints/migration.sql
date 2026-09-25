-- Integrity rules Prisma cannot declare in the schema (hand-written; Prisma leaves CHECK constraints alone
-- when it compares the database with the schema). The services check the same rules first, to return a
-- clear error (src/database/domain-constraints.ts); these constraints guarantee them for every writer.
-- See apps/api/apidocs/DATABASE_SCHEMA.md → "Constraints".

-- Journey feedback: 1–5 stars (FEEDBACK.md, mobile D-83).
ALTER TABLE "journey_feedbacks"
  ADD CONSTRAINT "journey_feedbacks_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

-- Provenance: exactly the record its entity type names (DATA_RULES.md "Provenance").
ALTER TABLE "external_sources"
  ADD CONSTRAINT "external_sources_single_target_check" CHECK (
    ("entityType" = 'PLACE' AND "placeId" IS NOT NULL AND "eventId" IS NULL AND "experienceId" IS NULL)
    OR ("entityType" = 'EVENT' AND "eventId" IS NOT NULL AND "placeId" IS NULL AND "experienceId" IS NULL)
    OR ("entityType" = 'EXPERIENCE' AND "experienceId" IS NOT NULL AND "placeId" IS NULL AND "eventId" IS NULL)
  );

-- ROAM enrichment: one place or one experience, never both or neither.
ALTER TABLE "roam_enrichments"
  ADD CONSTRAINT "roam_enrichments_single_target_check" CHECK (num_nonnulls("placeId", "experienceId") = 1);

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "localEndDate" DATE,
ADD COLUMN     "localEndTime" TEXT,
ADD COLUMN     "localStartDate" DATE,
ADD COLUMN     "localStartTime" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ALTER COLUMN "startDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "external_sources" ADD COLUMN     "attribution" TEXT,
ADD COLUMN     "images" JSONB,
ADD COLUMN     "obsoleteAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "rnbId" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" UUID NOT NULL,
    "jobKey" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "finishedAt" TIMESTAMPTZ(3),
    "leaseUntil" TIMESTAMPTZ(3) NOT NULL,
    "cursor" JSONB,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "unchanged" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_runs_jobKey_status_finishedAt_idx" ON "sync_runs"("jobKey", "status", "finishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sync_runs_one_running_per_provider" ON "sync_runs"("providerKey") WHERE ("status" = 'RUNNING');

-- CreateIndex
CREATE INDEX "events_localStartDate_idx" ON "events"("localStartDate");

-- CreateIndex
CREATE INDEX "places_rnbId_idx" ON "places"("rnbId");

-- DATA-6 (hand-written): an event always has a start — an instant, or at least a local date (a date-only event never
-- gets an invented time). Local times are "HH:MM".
ALTER TABLE "events" ADD CONSTRAINT "events_start_known_check"
  CHECK ("startDate" IS NOT NULL OR "localStartDate" IS NOT NULL);
ALTER TABLE "events" ADD CONSTRAINT "events_local_times_check"
  CHECK (("localStartTime" IS NULL OR "localStartTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
     AND ("localEndTime" IS NULL OR "localEndTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PriceLevel" AS ENUM ('FREE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EnergyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('SOLO', 'COUPLE', 'FRIENDS', 'FAMILY', 'GROUP', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Moment" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'ANYTIME');

-- CreateEnum
CREATE TYPE "BudgetRange" AS ENUM ('FREE', 'UNDER_10', 'FROM_10_TO_25', 'FROM_25_TO_50', 'OVER_50');

-- CreateEnum
CREATE TYPE "Company" AS ENUM ('ALONE', 'COUPLE', 'FRIENDS', 'FAMILY');

-- CreateEnum
CREATE TYPE "SourceEntityType" AS ENUM ('PLACE', 'EVENT', 'EXPERIENCE');

-- CreateEnum
CREATE TYPE "EnrichmentSource" AS ENUM ('ROAM_RULES', 'CURATED', 'USER_FEEDBACK');

-- CreateEnum
CREATE TYPE "JourneyStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "JourneyMood" AS ENUM ('CALM', 'DISCOVER', 'FOOD', 'CULTURE', 'ENERGETIC', 'ROMANTIC', 'FESTIVE');

-- CreateEnum
CREATE TYPE "JourneyDuration" AS ENUM ('ONE_HOUR', 'TWO_HOURS', 'THREE_HOURS', 'HALF_DAY', 'DAY');

-- CreateEnum
CREATE TYPE "JourneyBudget" AS ENUM ('FREE', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "JourneyStartKind" AS ENUM ('CURRENT', 'PLACE', 'ADDRESS', 'EXPERIENCE');

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('WALK', 'METRO');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "age" INTEGER,
    "city" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "userId" UUID NOT NULL,
    "interests" TEXT[],
    "activities" TEXT[],
    "usualBudget" "BudgetRange",
    "maxDistanceKm" INTEGER,
    "usualCompany" "Company",
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "photos" TEXT[],
    "openingHours" JSONB,
    "priceLevel" "PriceLevel" NOT NULL DEFAULT 'UNKNOWN',
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "attributes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_categories" (
    "placeId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "place_categories_pkey" PRIMARY KEY ("placeId","categoryId")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "coverImage" TEXT,
    "images" TEXT[],
    "startDate" TIMESTAMPTZ(3),
    "endDate" TIMESTAMPTZ(3),
    "openingHours" JSONB,
    "priceLevel" "PriceLevel" NOT NULL DEFAULT 'UNKNOWN',
    "priceMin" DECIMAL(10,2),
    "priceMax" DECIMAL(10,2),
    "currency" CHAR(3),
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "popularity" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_places" (
    "experienceId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "experience_places_pkey" PRIMARY KEY ("experienceId","placeId")
);

-- CreateTable
CREATE TABLE "experience_categories" (
    "experienceId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "experience_categories_pkey" PRIMARY KEY ("experienceId","categoryId")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "experienceId" UUID,
    "placeId" UUID,
    "categoryId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "endDate" TIMESTAMPTZ(3),
    "timezone" TEXT,
    "images" TEXT[],
    "priceMin" DECIMAL(10,2),
    "priceMax" DECIMAL(10,2),
    "currency" CHAR(3),
    "priceLevel" "PriceLevel" NOT NULL DEFAULT 'UNKNOWN',
    "bookingUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_sources" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "entityType" "SourceEntityType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT,
    "providerCategories" TEXT[],
    "confidence" DOUBLE PRECISION,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "providerUpdatedAt" TIMESTAMPTZ(3),
    "placeId" UUID,
    "eventId" UUID,
    "experienceId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "external_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roam_enrichments" (
    "id" UUID NOT NULL,
    "placeId" UUID,
    "experienceId" UUID,
    "atmosphere" TEXT[],
    "energyLevel" "EnergyLevel" NOT NULL DEFAULT 'UNKNOWN',
    "suitableFor" "Audience"[],
    "bestMoments" "Moment"[],
    "tags" TEXT[],
    "estimatedDurationMin" INTEGER,
    "durationIsDerived" BOOLEAN NOT NULL DEFAULT false,
    "source" "EnrichmentSource" NOT NULL DEFAULT 'ROAM_RULES',
    "confidence" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roam_enrichments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journeys" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "JourneyStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "mood" "JourneyMood" NOT NULL,
    "duration" "JourneyDuration" NOT NULL,
    "budget" "JourneyBudget" NOT NULL,
    "startKind" "JourneyStartKind" NOT NULL,
    "startLabel" TEXT NOT NULL,
    "startDetail" TEXT,
    "startLatitude" DOUBLE PRECISION NOT NULL,
    "startLongitude" DOUBLE PRECISION NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "estimatedDurationMin" INTEGER NOT NULL,
    "estimatedBudgetEur" INTEGER NOT NULL,
    "totalDistanceM" INTEGER NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_steps" (
    "id" UUID NOT NULL,
    "journeyId" UUID NOT NULL,
    "experienceId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "estimatedArrival" VARCHAR(5) NOT NULL,
    "estimatedDurationMin" INTEGER NOT NULL,
    "travelDurationMin" INTEGER NOT NULL,
    "travelDistanceM" INTEGER NOT NULL,
    "travelMode" "TravelMode" NOT NULL,

    CONSTRAINT "journey_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "experienceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_feedbacks" (
    "id" UUID NOT NULL,
    "journeyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" VARCHAR(300),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "places_city_idx" ON "places"("city");

-- CreateIndex
CREATE INDEX "places_latitude_longitude_idx" ON "places"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "place_categories_categoryId_idx" ON "place_categories"("categoryId");

-- CreateIndex
CREATE INDEX "experiences_city_idx" ON "experiences"("city");

-- CreateIndex
CREATE INDEX "experiences_latitude_longitude_idx" ON "experiences"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "experiences_isActive_idx" ON "experiences"("isActive");

-- CreateIndex
CREATE INDEX "experience_places_placeId_idx" ON "experience_places"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_places_experienceId_position_key" ON "experience_places"("experienceId", "position");

-- CreateIndex
CREATE INDEX "experience_categories_categoryId_idx" ON "experience_categories"("categoryId");

-- CreateIndex
CREATE INDEX "events_startDate_idx" ON "events"("startDate");

-- CreateIndex
CREATE INDEX "events_experienceId_idx" ON "events"("experienceId");

-- CreateIndex
CREATE INDEX "events_placeId_idx" ON "events"("placeId");

-- CreateIndex
CREATE INDEX "events_categoryId_idx" ON "events"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "providers_key_key" ON "providers"("key");

-- CreateIndex
CREATE INDEX "external_sources_placeId_idx" ON "external_sources"("placeId");

-- CreateIndex
CREATE INDEX "external_sources_eventId_idx" ON "external_sources"("eventId");

-- CreateIndex
CREATE INDEX "external_sources_experienceId_idx" ON "external_sources"("experienceId");

-- CreateIndex
CREATE INDEX "external_sources_providerId_fetchedAt_idx" ON "external_sources"("providerId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "external_sources_providerId_entityType_externalId_key" ON "external_sources"("providerId", "entityType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "roam_enrichments_placeId_key" ON "roam_enrichments"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "roam_enrichments_experienceId_key" ON "roam_enrichments"("experienceId");

-- CreateIndex
CREATE INDEX "journeys_userId_status_idx" ON "journeys"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "journeys_one_active_per_user" ON "journeys"("userId") WHERE ("status" = 'ACTIVE');

-- CreateIndex
CREATE INDEX "journey_steps_experienceId_idx" ON "journey_steps"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "journey_steps_journeyId_order_key" ON "journey_steps"("journeyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "journey_steps_journeyId_experienceId_key" ON "journey_steps"("journeyId", "experienceId");

-- CreateIndex
CREATE INDEX "favorites_experienceId_idx" ON "favorites"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_experienceId_key" ON "favorites"("userId", "experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "journey_feedbacks_journeyId_key" ON "journey_feedbacks"("journeyId");

-- CreateIndex
CREATE INDEX "journey_feedbacks_userId_idx" ON "journey_feedbacks"("userId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_categories" ADD CONSTRAINT "place_categories_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_categories" ADD CONSTRAINT "place_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_places" ADD CONSTRAINT "experience_places_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_places" ADD CONSTRAINT "experience_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_categories" ADD CONSTRAINT "experience_categories_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_categories" ADD CONSTRAINT "experience_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sources" ADD CONSTRAINT "external_sources_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sources" ADD CONSTRAINT "external_sources_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sources" ADD CONSTRAINT "external_sources_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sources" ADD CONSTRAINT "external_sources_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roam_enrichments" ADD CONSTRAINT "roam_enrichments_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roam_enrichments" ADD CONSTRAINT "roam_enrichments_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_feedbacks" ADD CONSTRAINT "journey_feedbacks_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_feedbacks" ADD CONSTRAINT "journey_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


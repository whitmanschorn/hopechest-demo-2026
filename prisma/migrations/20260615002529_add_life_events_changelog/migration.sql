-- CreateEnum
CREATE TYPE "LifeEventKind" AS ENUM ('birth', 'death', 'marriage', 'immigration', 'residence', 'military', 'education', 'work', 'other');

-- CreateEnum
CREATE TYPE "ChangelogEntityType" AS ENUM ('person', 'life_event');

-- CreateTable
CREATE TABLE "life_events" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" "LifeEventKind" NOT NULL,
    "title" TEXT NOT NULL,
    "date" JSONB NOT NULL,
    "locationId" TEXT,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "life_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changelog" (
    "id" TEXT NOT NULL,
    "entityType" "ChangelogEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "editedById" TEXT NOT NULL,
    "editedAt" TEXT NOT NULL,
    "summary" TEXT,

    CONSTRAINT "changelog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "life_events_personId_idx" ON "life_events"("personId");

-- CreateIndex
CREATE INDEX "changelog_personId_idx" ON "changelog"("personId");

-- AddForeignKey
ALTER TABLE "life_events" ADD CONSTRAINT "life_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "life_events" ADD CONSTRAINT "life_events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "life_events" ADD CONSTRAINT "life_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog" ADD CONSTRAINT "changelog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog" ADD CONSTRAINT "changelog_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

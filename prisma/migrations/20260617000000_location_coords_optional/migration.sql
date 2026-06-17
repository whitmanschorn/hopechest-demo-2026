-- Places entered while uploading a photo don't have coordinates yet, so the
-- map omits them until someone supplies a pin. Make lat/lng nullable.
ALTER TABLE "locations" ALTER COLUMN "lat" DROP NOT NULL;
ALTER TABLE "locations" ALTER COLUMN "lng" DROP NOT NULL;

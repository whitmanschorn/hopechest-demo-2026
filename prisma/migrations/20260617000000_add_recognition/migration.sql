-- Face recognition subsystem.
--
-- pgvector + four tables. The vector(128) columns and HNSW indexes are NOT
-- modeled by Prisma (Unsupported columns / unsupported index opclass), so they
-- are authored by hand here. All vector reads/writes go through raw SQL in
-- src/lib/recognition/db.ts. Distance metric is L2 (dlib/face-api lineage,
-- same-person threshold ~0.6); vectors are stored raw (not L2-normalized).

-- Enable pgvector (available on Neon; local native Postgres needs the extension
-- installed first — see docs/recognition.md).
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "face_identities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "app_person_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_photos" (
    "id" TEXT NOT NULL,
    "blob_url" TEXT NOT NULL,
    "app_photo_id" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_clusters" (
    "id" TEXT NOT NULL,
    "centroid" vector(128) NOT NULL,
    "size" INTEGER NOT NULL,
    "representative_face_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faces" (
    "id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "bbox" JSONB NOT NULL,
    "embedding" vector(128) NOT NULL,
    "thumb_url" TEXT,
    "quality" DOUBLE PRECISION,
    "cluster_id" TEXT,
    "identity_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "face_identities_app_person_id_idx" ON "face_identities"("app_person_id");

-- CreateIndex
CREATE INDEX "face_photos_app_photo_id_idx" ON "face_photos"("app_photo_id");

-- CreateIndex (btree scratch lookups)
CREATE INDEX "faces_cluster_id_idx" ON "faces"("cluster_id");

-- CreateIndex
CREATE INDEX "faces_identity_id_idx" ON "faces"("identity_id");

-- CreateIndex
CREATE INDEX "faces_photo_id_idx" ON "faces"("photo_id");

-- CreateIndex (general kNN for recognize fallback / sweep)
CREATE INDEX "faces_embedding_hnsw" ON "faces" USING hnsw ("embedding" vector_l2_ops);

-- CreateIndex (recognize only ever searches labeled faces -> partial index keeps it small/fast)
CREATE INDEX "faces_labeled_embedding_hnsw" ON "faces" USING hnsw ("embedding" vector_l2_ops)
    WHERE "identity_id" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "face_identities" ADD CONSTRAINT "face_identities_app_person_id_fkey" FOREIGN KEY ("app_person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_photos" ADD CONSTRAINT "face_photos_app_photo_id_fkey" FOREIGN KEY ("app_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faces" ADD CONSTRAINT "faces_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "face_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faces" ADD CONSTRAINT "faces_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "face_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

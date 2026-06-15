import type { Metadata } from "next";

import { SectionHeader } from "@/components/SectionHeader";
import { UploadWizard } from "@/components/UploadWizard";
import { getPerson, getPhotos } from "@/data";
import { requireCurrentPerson } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Upload" };

export default async function Upload() {
  const [photos, me] = await Promise.all([getPhotos(), requireCurrentPerson()]);
  // Use a sample photo that has a restoration so the before/after preview works.
  const photo = photos.find((p) => p.restoration) ?? photos[0];
  const faceNames = (
    await Promise.all(photo.faceTags.slice(0, 2).map((t) => getPerson(t.personId)))
  ).map((p) => p.shortName);

  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeader
        title="Add to the chest"
        subtitle="Photos and documents go in; faces, places, originals, and copies get sorted out automatically."
      />
      <UploadWizard photo={photo} scannerName={me.shortName} faceNames={faceNames} />
    </div>
  );
}

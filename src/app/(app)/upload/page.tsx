import type { Metadata } from "next";

import { SectionHeader } from "@/components/SectionHeader";
import { UploadWizard } from "@/components/UploadWizard";
import { getLocations } from "@/data";
import { requireCurrentPerson } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Upload" };

export default async function Upload() {
  await requireCurrentPerson();
  const locations = await getLocations();

  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeader
        title="Add to the chest"
        subtitle="Photos go in; the family fills in the title, date, and place."
      />
      <UploadWizard
        locations={locations.map((l) => ({ id: l.id, label: l.label }))}
      />
    </div>
  );
}

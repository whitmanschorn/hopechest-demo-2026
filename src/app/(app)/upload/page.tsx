import type { Metadata } from "next";

import { SectionHeader } from "@/components/SectionHeader";
import { UploadWizard } from "@/components/UploadWizard";

export const metadata: Metadata = { title: "Upload" };

export default function Upload() {
  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeader
        title="Add to the chest"
        subtitle="Photos and documents go in; faces, places, originals, and copies get sorted out automatically."
      />
      <UploadWizard />
    </div>
  );
}

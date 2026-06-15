import type { Metadata } from "next";
import Link from "next/link";

import { DocumentCard } from "@/components/DocumentCard";
import { SectionHeader } from "@/components/SectionHeader";
import { AskIcon, UploadIcon } from "@/components/icons";
import { getDocuments } from "@/data";

export const metadata: Metadata = { title: "Documents" };

export default async function Documents() {
  const documents = await getDocuments();
  return (
    <>
      <SectionHeader
        title="Documents"
        subtitle="Letters, records, recipes — transcribed and searchable, so Ask can quote them."
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-xl border-2 border-dashed border-sepia/35 bg-cream px-5 py-4 text-sm text-ink-soft">
          <UploadIcon className="size-5 shrink-0 text-sepia" />
          Drop a scan or snapshot of any paper here — Hopechest transcribes the
          handwriting.
        </div>
        <Link
          href="/ask"
          className="flex items-center justify-center gap-2 rounded-xl bg-cream px-5 py-4 text-sm font-medium text-sepia ring-1 ring-hairline transition-colors hover:ring-sepia/50"
        >
          <AskIcon className="size-5" />
          Ask across all 38 documents
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </div>
    </>
  );
}

import type { Metadata } from "next";

import { AskChat } from "@/components/AskChat";
import { SectionHeader } from "@/components/SectionHeader";
import {
  getDocument,
  getExchanges,
  getFallbackExchange,
  getPeople,
  getPhoto,
  type Photo,
} from "@/data";
import { requireCurrentPerson } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Ask" };

export default async function Ask() {
  const [me, people, exchanges, fallbackExchange] = await Promise.all([
    requireCurrentPerson(),
    getPeople(),
    getExchanges(),
    getFallbackExchange(),
  ]);

  // Pre-resolve photos/documents referenced by answer blocks so the client
  // component can render them without server data access.
  const photoIds = new Set<string>();
  const docIds = new Set<string>();
  for (const ex of [...exchanges, fallbackExchange]) {
    for (const block of ex.answer) {
      if (block.kind === "photo") photoIds.add(block.photoId);
      if (block.kind === "source") docIds.add(block.documentId);
    }
  }
  const photos = await Promise.all([...photoIds].map((id) => getPhoto(id)));
  const docs = await Promise.all([...docIds].map((id) => getDocument(id)));
  const photosById: Record<string, Photo> = Object.fromEntries(photos.map((p) => [p.id, p]));
  const docsById: Record<string, { id: string; title: string }> = Object.fromEntries(
    docs.map((d) => [d.id, { id: d.id, title: d.title }]),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        title="Ask"
        subtitle="Retrieval across every photo and document in the chest."
      />
      <AskChat
        me={me}
        people={people}
        exchanges={exchanges}
        fallbackExchange={fallbackExchange}
        photosById={photosById}
        docsById={docsById}
      />
    </div>
  );
}

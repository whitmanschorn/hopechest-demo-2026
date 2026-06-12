import type { Metadata } from "next";

import { AskChat } from "@/components/AskChat";
import { SectionHeader } from "@/components/SectionHeader";

export const metadata: Metadata = { title: "Ask" };

export default function Ask() {
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        title="Ask"
        subtitle="Retrieval across every photo and document in the chest."
      />
      <AskChat />
    </div>
  );
}

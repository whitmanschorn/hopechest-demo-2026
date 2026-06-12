import { Badge } from "./Badge";
import { DocumentIcon } from "./icons";
import { getPerson, type FamilyDocument } from "@/data";

const KIND_LABEL: Record<FamilyDocument["kind"], string> = {
  letter: "Letter",
  record: "Record",
  recipe: "Recipe",
  telegram: "Telegram",
};

/** Typographic "paper" card — every document reads like the artifact itself. */
export function DocumentCard({ doc }: { doc: FamilyDocument }) {
  const by = getPerson(doc.uploadedById);
  const telegram = doc.kind === "telegram";
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-cream ring-1 ring-hairline transition-shadow hover:shadow-lg hover:shadow-walnut/10">
      <div
        className={`relative flex-1 px-5 py-6 ${
          telegram ? "bg-[#efe6cf]" : "bg-[#fbf6ea]"
        }`}
        style={{
          backgroundImage: telegram
            ? "repeating-linear-gradient(0deg, transparent 0 26px, rgba(74,53,38,.07) 26px 27px)"
            : "repeating-linear-gradient(0deg, transparent 0 24px, rgba(74,53,38,.05) 24px 25px)",
        }}
      >
        <p
          className={`leading-7 text-walnut ${
            telegram
              ? "font-mono text-[13px] uppercase tracking-wider"
              : "font-display text-[15px] italic"
          }`}
        >
          {doc.excerpt}
        </p>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-cream to-transparent" />
      </div>
      <div className="flex items-start justify-between gap-3 px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-ink">{doc.title}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            {doc.year ? `${doc.year} · ` : ""}added by {by.shortName}
          </p>
        </div>
        <Badge tone="plain">
          <DocumentIcon className="size-3.5" />
          {KIND_LABEL[doc.kind]}
        </Badge>
      </div>
    </article>
  );
}

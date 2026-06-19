// Shared helpers for the Ocean's Eleven debug tabs (showcase + identify).

// One committed Ocean's Eleven descriptor + where its photo lives. The image is
// served by /api/oceans11/<identity>/<file>.
export interface OceansSample {
  id: string; // `${identity}/${file}`
  identity: string; // actor slug, e.g. "george-clooney"
  file: string; // e.g. "george-clooney-01.jpg"
  embedding: number[];
}

// slug -> Title Case, e.g. "george-clooney" -> "George Clooney".
export const prettify = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const imgSrc = (s: { identity: string; file: string }) =>
  `/api/oceans11/${encodeURIComponent(s.identity)}/${encodeURIComponent(s.file)}`;

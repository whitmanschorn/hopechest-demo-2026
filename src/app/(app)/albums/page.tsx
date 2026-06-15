import type { Metadata } from "next";

import { AlbumCard } from "@/components/AlbumCard";
import { AlbumCreators, type SmartFacet } from "@/components/AlbumCreators";
import { SectionHeader, SubHeader } from "@/components/SectionHeader";
import { SparkleIcon } from "@/components/icons";
import { getAlbums, locationsWithCounts, getPeople, getPhotos, photosForPerson } from "@/data";

export const metadata: Metadata = { title: "Albums" };

/** Real facets the smart-album wizard can interpret a description into. */
async function buildFacets(): Promise<SmartFacet[]> {
  const facets: SmartFacet[] = [];
  const photos = await getPhotos();

  for (const person of await getPeople()) {
    const ps = await photosForPerson(person.id);
    if (ps.length < 2) continue;
    facets.push({
      id: `person-${person.id}`,
      kind: "person",
      rule: `Everyone tagged: ${person.name}`,
      terms: [...person.name.toLowerCase().split(/\s+/), ...(person.nicknames ?? []).map((n) => n.toLowerCase())],
      count: ps.length,
      sampleSrcs: ps.slice(0, 4).map((p) => p.src),
    });
  }

  for (const { location, count, coverPhotoId } of await locationsWithCounts()) {
    if (count < 2) continue;
    void coverPhotoId;
    const samples = photos.filter((p) => p.locationId === location.id).slice(0, 4).map((p) => p.src);
    facets.push({
      id: `loc-${location.id}`,
      kind: "location",
      rule: `Taken at ${location.label}`,
      terms: [...location.label.toLowerCase().split(/\s+/), ...(location.city ? [location.city.toLowerCase()] : [])],
      count,
      sampleSrcs: samples,
    });
  }

  const byDecade = new Map<number, typeof photos>();
  for (const p of photos) {
    if (!p.date.year) continue;
    const decade = Math.floor(p.date.year / 10) * 10;
    (byDecade.get(decade) ?? byDecade.set(decade, []).get(decade)!).push(p);
  }
  for (const [decade, ps] of [...byDecade].sort((a, b) => a[0] - b[0])) {
    if (ps.length < 2) continue;
    facets.push({
      id: `decade-${decade}`,
      kind: "decade",
      rule: `Taken in the ${decade}s`,
      terms: [`${decade}`, `${decade}s`],
      count: ps.length,
      sampleSrcs: ps.slice(0, 4).map((p) => p.src),
    });
  }

  return facets;
}

export default async function Albums() {
  const allAlbums = await getAlbums();
  const standard = allAlbums.filter((a) => a.kind === "standard");
  const smart = allAlbums.filter((a) => a.kind === "smart");
  const pickablePhotos = (await getPhotos()).map((p) => ({ id: p.id, src: p.src, title: p.title }));
  return (
    <>
      <SectionHeader
        title="Albums"
        subtitle="Collections the family curates — and ones Hopechest builds on its own."
      />
      <AlbumCreators facets={await buildFacets()} photos={pickablePhotos} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {standard.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
      <SubHeader>
        <span className="inline-flex items-center gap-2">
          <SparkleIcon className="size-5 text-brass" />
          Smart albums
        </span>
      </SubHeader>
      <p className="-mt-2 mb-4 text-sm text-ink-soft">
        Built automatically from face tags, places, and dates. They grow as the
        chest grows.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {smart.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </>
  );
}

import { Img } from "./Img";
import { getPerson, type Photo } from "@/data";

/**
 * The photo with hover/tap-revealed face boxes. Box coordinates are
 * percentages of the image.
 */
export async function FaceTagOverlay({ photo }: { photo: Photo }) {
  const people = await Promise.all(
    photo.faceTags.map((tag) => getPerson(tag.personId)),
  );
  return (
    <div className="group relative overflow-hidden rounded-xl ring-1 ring-hairline">
      <Img
        src={photo.src}
        alt={photo.title}
        width={photo.width}
        height={photo.height}
        loading="eager"
        className="block w-full"
      />
      {photo.faceTags.map((tag, i) => {
        const person = people[i];
        return (
          <span
            key={tag.personId}
            className="absolute rounded-md border-2 border-cream/0 transition-colors duration-300 group-hover:border-cream/90"
            style={{
              left: `${tag.box.x}%`,
              top: `${tag.box.y}%`,
              width: `${tag.box.w}%`,
              height: `${tag.box.h}%`,
            }}
          >
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-walnut/90 px-2.5 py-0.5 text-xs font-medium text-cream opacity-0 shadow transition-opacity duration-300 group-hover:opacity-100">
              {person.shortName}
            </span>
          </span>
        );
      })}
      {photo.faceTags.length > 0 ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-walnut/75 px-2.5 py-1 text-xs text-cream backdrop-blur transition-opacity duration-300 group-hover:opacity-0">
          {photo.faceTags.length} face{photo.faceTags.length > 1 ? "s" : ""}{" "}
          recognized
        </span>
      ) : null}
    </div>
  );
}

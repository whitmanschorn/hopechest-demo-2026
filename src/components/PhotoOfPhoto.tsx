import { Img } from "./Img";
import type { Photo, PhotoCapture } from "@/data";

/**
 * Stages the SAME source image as someone's cellphone photo of the physical
 * print — pure CSS scenery (table surface / album page, rotation, color cast,
 * glare). Two presets read as two clearly different captures.
 */
export function PhotoOfPhoto({
  photo,
  framing,
  className = "",
}: {
  photo: Photo;
  framing: PhotoCapture["framing"];
  className?: string;
}) {
  if (framing === "table-warm") {
    // Eleanor, 2024: print lying on a warm wooden table, indoor evening light
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-lg p-4 sm:p-5 ${className}`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(95deg, #7c5a3c 0px, #8a684a 22px, #75543a 45px, #86644a 70px, #7c5a3c 96px)",
        }}
      >
        <div className="rotate-[2.5deg] bg-[#f6f1e3] p-1.5 pb-4 shadow-lg shadow-black/40">
          <Img
            src={photo.src}
            alt={`Phone photo of the print of ${photo.title}`}
            width={photo.width}
            height={photo.height}
            className="block max-h-56 w-auto object-cover brightness-105 saturate-[1.15] sepia-[.12]"
          />
        </div>
        {/* phone-flash glare */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
      </div>
    );
  }
  // Susan, 2022: print mounted on a dark album page with photo corners, cooler light
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-[#3c342c] p-4 sm:p-5 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 30% 20%, rgba(255,255,255,.06), transparent 60%), repeating-linear-gradient(0deg, #3c342c 0px, #423a31 3px, #3c342c 6px)",
      }}
    >
      <div className="relative -rotate-[1.5deg]">
        {/* photo corners */}
        {[
          "left-0 top-0 [clip-path:polygon(0_0,100%_0,0_100%)]",
          "right-0 top-0 [clip-path:polygon(0_0,100%_0,100%_100%)]",
          "left-0 bottom-0 [clip-path:polygon(0_0,0_100%,100%_100%)]",
          "right-0 bottom-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]",
        ].map((pos) => (
          <span
            key={pos}
            className={`absolute z-10 size-5 bg-[#d9cdb4] shadow-sm ${pos}`}
          />
        ))}
        <Img
          src={photo.src}
          alt={`Phone photo of the print of ${photo.title} in an album`}
          width={photo.width}
          height={photo.height}
          className="block max-h-56 w-auto object-cover brightness-[.92] contrast-[.95] hue-rotate-[-8deg]"
        />
      </div>
      {/* dim phone-shadow along one edge */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-transparent" />
    </div>
  );
}

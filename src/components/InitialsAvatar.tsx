import { Img } from "./Img";
import type { Person } from "@/data";

const SIZES = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

export function InitialsAvatar({
  person,
  size = "md",
  className = "",
}: {
  person: Person;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  if (person.avatarSrc) {
    return (
      <Img
        src={person.avatarSrc}
        alt={person.name}
        width={80}
        height={80}
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-1 ring-hairline ${className}`}
      />
    );
  }
  return (
    <span
      className={`${SIZES[size]} shrink-0 inline-flex items-center justify-center rounded-full bg-sepia/15 font-display font-semibold text-sepia ring-1 ring-hairline ${className}`}
    >
      {initials}
    </span>
  );
}

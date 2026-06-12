import type { Person } from "./types";

export const people: Person[] = [
  {
    id: "great-grandmother-klara",
    name: "Klara Kowalski",
    shortName: "Great Grandmother K.",
    relation: "Great-grandmother",
    lifespan: "1898–1972",
    avatarSrc: "/photos/avatar-klara.jpg",
    photoCount: 6,
  },
  {
    id: "grandma-sarah",
    name: "Sarah Whitfield",
    shortName: "Grandma S.",
    relation: "Grandmother",
    lifespan: "b. 1931",
    avatarSrc: "/photos/avatar-sarah.jpg",
    photoCount: 14,
  },
  {
    id: "eleanor",
    name: "Eleanor Whitfield-Hayes",
    shortName: "Eleanor",
    relation: "Aunt · Archive admin",
    photoCount: 9,
  },
  {
    id: "susan",
    name: "Susan Whitfield",
    shortName: "Susan",
    relation: "Mother",
    photoCount: 11,
  },
  {
    id: "margaret",
    name: "Margaret Whitfield",
    shortName: "Margaret",
    relation: "You",
    photoCount: 4,
  },
  {
    id: "david",
    name: "David Hayes",
    shortName: "David",
    relation: "Cousin",
    photoCount: 3,
  },
  {
    id: "tom",
    name: "Tom Whitfield",
    shortName: "Tom",
    relation: "Grandfather",
    lifespan: "1928–2009",
    avatarSrc: "/photos/avatar-tom.jpg",
    photoCount: 8,
  },
];

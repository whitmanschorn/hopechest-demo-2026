import type { FamilyDocument } from "./types";

export const documents: FamilyDocument[] = [
  {
    id: "sarahs-baby-book",
    title: "Sarah's baby book, 1931–1935",
    kind: "record",
    scanSrc: "/photos/doc-baby-book.jpg",
    excerpt:
      "“July 14th — Mama Klara held Sarah still long enough for Mr. Andersen to try his new camera. The only picture we have of the two of them together.”",
    year: "1933",
    uploadedById: "eleanor",
  },
  {
    id: "immigration-record-1912",
    title: "Klara's immigration record",
    kind: "record",
    scanSrc: "/photos/doc-immigration.jpg",
    excerpt:
      "Kowalska, Klara — age 14, arrived Port of Baltimore aboard the SS Rhein, June 1912, bound for Green Bay, Wisconsin.",
    year: "1912",
    uploadedById: "eleanor",
  },
  {
    id: "klara-letter-1946",
    title: "Letter from Klara to Sarah",
    kind: "letter",
    scanSrc: "/photos/doc-letter.jpg",
    excerpt:
      "“The cherries came in early this year. Your father says the porch needs painting but I told him it can wait until you visit…”",
    year: "1946",
    uploadedById: "susan",
  },
  {
    id: "recipe-pierogi",
    title: "Klara's pierogi recipe card",
    kind: "recipe",
    excerpt:
      "“Flour, two eggs, sour cream — never water. Brown butter at the end, always more than you think.”",
    year: "c. 1950",
    uploadedById: "margaret",
  },
  {
    id: "telegram-1945",
    title: "Telegram — Tom coming home",
    kind: "telegram",
    excerpt:
      "ARRIVING GREEN BAY STATION DEC 21 STOP HOME FOR CHRISTMAS STOP LOVE TOM",
    year: "1945",
    uploadedById: "david",
  },
];

import type { FeedItem } from "./types";

export const feed: FeedItem[] = [
  {
    kind: "ask-highlight",
    id: "feed-ask-klara",
    question:
      "Is there a photo of Great Grandmother K. with Grandma S. as a toddler?",
    photoId: "klara-and-sarah-1933",
    when: "Yesterday",
  },
  {
    kind: "restoration",
    id: "feed-restore-hero",
    photoId: "klara-and-sarah-1933",
    when: "2 days ago",
  },
  {
    kind: "new-copy-linked",
    id: "feed-copy-eleanor",
    photoId: "klara-and-sarah-1933",
    byId: "eleanor",
    when: "2 days ago",
  },
  {
    kind: "photo-added",
    id: "feed-add-fishing",
    photoId: "tom-fishing-1972",
    byId: "david",
    when: "Last week",
    blurb: "Found this in Dad's tackle box, of all places.",
  },
  {
    kind: "person-milestone",
    id: "feed-milestone-sarah",
    personId: "sarah",
    when: "Last week",
    blurb: "Sarah Whitfield now appears in 14 photos spanning 31 years.",
  },
  {
    kind: "photo-added",
    id: "feed-add-reunion",
    photoId: "family-reunion-1968",
    byId: "susan",
    when: "2 weeks ago",
    blurb: "The big one — almost everyone is in this.",
  },
  {
    kind: "photo-added",
    id: "feed-add-wedding",
    photoId: "wedding-day-1950",
    byId: "eleanor",
    when: "3 weeks ago",
  },
  {
    kind: "person-milestone",
    id: "feed-milestone-klara",
    personId: "klara",
    when: "3 weeks ago",
    blurb: "A new face match suggests Klara appears in the 1937 county fair photo.",
  },
  {
    kind: "photo-added",
    id: "feed-add-garden",
    photoId: "klara-garden-1948",
    byId: "susan",
    when: "Last month",
  },
  {
    kind: "photo-added",
    id: "feed-add-portrait",
    photoId: "klara-portrait-1925",
    byId: "eleanor",
    when: "Last month",
    blurb: "Studio portrait from the box Aunt Rose left us.",
  },
];

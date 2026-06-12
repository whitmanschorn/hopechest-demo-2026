export interface Person {
  id: string;
  name: string;
  shortName: string;
  relation: string;
  lifespan?: string;
  avatarSrc?: string;
  photoCount: number;
}

export interface FaceTag {
  personId: string;
  /** Percentages of the image, for overlay positioning. */
  box: { x: number; y: number; w: number; h: number };
  confidence?: number;
}

/** A copy of a print: someone's cellphone pic, linked to the canonical original. */
export interface PhotoCapture {
  id: string;
  capturedById: string;
  capturedAt: string;
  device: string;
  framing: "table-warm" | "album-page";
  note?: string;
}

export interface Photo {
  id: string;
  title: string;
  src: string;
  width: number;
  height: number;
  era?: string;
  location?: string;
  description?: string;
  faceTags: FaceTag[];
  captures: PhotoCapture[];
  restoration?: { restoredSrc: string; summary: string };
  albumIds: string[];
}

export interface Album {
  id: string;
  title: string;
  kind: "standard" | "smart";
  coverPhotoId: string;
  photoIds: string[];
  rule?: string;
  subtitle?: string;
}

export interface FamilyDocument {
  id: string;
  title: string;
  kind: "letter" | "record" | "recipe" | "telegram";
  scanSrc?: string;
  excerpt: string;
  year?: string;
  uploadedById: string;
}

export type FeedItem =
  | {
      kind: "photo-added";
      id: string;
      photoId: string;
      byId: string;
      when: string;
      blurb?: string;
    }
  | { kind: "restoration"; id: string; photoId: string; when: string }
  | {
      kind: "new-copy-linked";
      id: string;
      photoId: string;
      byId: string;
      when: string;
    }
  | {
      kind: "person-milestone";
      id: string;
      personId: string;
      when: string;
      blurb: string;
    }
  | {
      kind: "ask-highlight";
      id: string;
      question: string;
      photoId: string;
      when: string;
    };

export type Role = "Admin" | "Contributor" | "Viewer";

export interface Member {
  personId: string;
  role: Role;
  joined: string;
}

export interface Invite {
  id: string;
  name: string;
  email: string;
  sent: string;
}

export interface NewsletterIssue {
  id: string;
  title: string;
  month: string;
  intro: string;
  photoIds: string[];
  highlights: { heading: string; body: string; photoId?: string }[];
  recipients: number;
}

export type AnswerBlock =
  | { kind: "text"; text: string }
  | { kind: "photo"; photoId: string; caption: string }
  | { kind: "source"; documentId: string }
  | { kind: "people"; personIds: string[] };

export interface ScriptedExchange {
  id: string;
  prompt: string;
  keywords: string[];
  thinkingLabel: string;
  answer: AnswerBlock[];
}

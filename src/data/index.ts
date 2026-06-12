import { albums } from "./albums";
import { documents } from "./documents";
import { people } from "./people";
import { photos } from "./photos";
import type { Album, FamilyDocument, Person, Photo } from "./types";

export * from "./types";
export { people } from "./people";
export { photos } from "./photos";
export { albums } from "./albums";
export { documents } from "./documents";
export { feed } from "./feed";
export { members, invites, currentMemberId } from "./family";
export { currentIssue, pastIssues } from "./newsletter";
export { exchanges, fallbackExchange } from "./ask-script";

export function getPhoto(id: string): Photo {
  const photo = photos.find((p) => p.id === id);
  if (!photo) throw new Error(`Unknown photo: ${id}`);
  return photo;
}

export function getPerson(id: string): Person {
  const person = people.find((p) => p.id === id);
  if (!person) throw new Error(`Unknown person: ${id}`);
  return person;
}

export function getAlbum(id: string): Album {
  const album = albums.find((a) => a.id === id);
  if (!album) throw new Error(`Unknown album: ${id}`);
  return album;
}

export function getDocument(id: string): FamilyDocument {
  const doc = documents.find((d) => d.id === id);
  if (!doc) throw new Error(`Unknown document: ${id}`);
  return doc;
}

export function photosForAlbum(album: Album): Photo[] {
  return album.photoIds.map(getPhoto);
}

export function photosForPerson(personId: string): Photo[] {
  return photos.filter((p) =>
    p.faceTags.some((t) => t.personId === personId),
  );
}

export function albumsForPhoto(photo: Photo): Album[] {
  return photo.albumIds.map(getAlbum);
}

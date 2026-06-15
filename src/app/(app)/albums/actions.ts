"use server";

import { revalidatePath } from "next/cache";

import { getPhotos } from "@/data";
import { insertAlbum, insertAlbumPhotos } from "@/data/db/mutations";
import { requireCurrentPerson } from "@/lib/auth/session";

export interface AlbumResult {
  ok: boolean;
  albumId?: string;
  errors?: string[];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a standard album from a hand-picked set of photos. */
export async function createAlbum(title: string, photoIds: string[]): Promise<AlbumResult> {
  const name = title.trim();
  const errors: string[] = [];
  if (!name) errors.push("Give the album a title.");
  if (photoIds.length === 0) errors.push("Pick at least one photo.");

  const known = new Set((await getPhotos()).map((p) => p.id));
  const chosen = photoIds.filter((id) => known.has(id));
  if (photoIds.length > 0 && chosen.length === 0) errors.push("Those photos are no longer in the chest.");
  if (errors.length > 0) return { ok: false, errors };

  await requireCurrentPerson();

  const id = genId("album");
  const now = new Date().toISOString();
  await insertAlbum({
    id,
    title: name,
    kind: "standard",
    coverPhotoId: chosen[0],
    createdAt: now,
    updatedAt: now,
  });
  await insertAlbumPhotos(chosen.map((photoId, position) => ({ albumId: id, photoId, position })));

  revalidatePath("/albums");
  return { ok: true, albumId: id };
}

"use server";

import { revalidatePath } from "next/cache";

import { insertPerson } from "@/data/db/mutations";
import type { Gender, Person } from "@/data/db/schema";
import { requireCurrentPerson } from "@/lib/auth/session";

export interface CreatePersonResult {
  ok: boolean;
  person?: Person;
  errors?: string[];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Add a new family member — used when tagging someone who isn't in the chest yet.
 * Captures the minimum the schema (and kinship) need: a name and gender. The
 * relation defaults to "Relative" and everything else is editable later on the
 * person's page.
 */
export async function createPerson(input: {
  name: string;
  gender: string;
  relation?: string;
}): Promise<CreatePersonResult> {
  const name = input.name.trim();
  const errors: string[] = [];
  if (!name) errors.push("Enter a name.");
  if (input.gender !== "f" && input.gender !== "m") errors.push("Choose whether they're female or male.");
  if (errors.length > 0) return { ok: false, errors };

  await requireCurrentPerson();

  const person: Person = {
    id: genId("person"),
    name,
    shortName: name.split(/\s+/)[0],
    fullName: name,
    relation: input.relation?.trim() || "Relative",
    gender: input.gender as Gender,
    nicknames: [],
    alternateNames: [],
    photoCount: 0,
  };
  await insertPerson(person);

  revalidatePath("/family");
  revalidatePath("/people");
  return { ok: true, person };
}

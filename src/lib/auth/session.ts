/**
 * Session resolution. Replaces the old hardcoded `currentMemberId`: the current
 * user comes from an opaque session token in an httpOnly cookie, resolved
 * through Session → User → Member → Person. Memoized per request with cache().
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@/lib/auth/constants";
import type { Member, Person } from "@/data";

export { SESSION_COOKIE, SESSION_TTL_DAYS };

export interface CurrentUser {
  userId: string;
  phone: string;
  onboardingComplete: boolean;
  member: Member | null;
  person: Person | null;
}

/** The signed-in user (or null). Onboarded users have a member + person. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { member: { include: { person: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const { user } = session;
  const m = user.member;
  return {
    userId: user.id,
    phone: user.phone,
    onboardingComplete: user.onboardingComplete,
    member: m ? { personId: m.personId, role: m.role, joined: m.joined } : null,
    person: m?.person
      ? {
          id: m.person.id,
          name: m.person.name,
          shortName: m.person.shortName,
          fullName: m.person.fullName,
          maidenName: m.person.maidenName ?? undefined,
          nicknames: m.person.nicknames,
          alternateNames: m.person.alternateNames,
          relation: m.person.relation,
          gender: m.person.gender,
          lifespan: m.person.lifespan ?? undefined,
          avatarSrc: m.person.avatarSrc ?? undefined,
          photoCount: m.person.photoCount,
          suggestedMatchPhotoId: m.person.suggestedMatchPhotoId ?? undefined,
        }
      : null,
  };
});

/** The signed-in person, or null. Convenience for pages that just need "me". */
export async function getCurrentPerson(): Promise<Person | null> {
  return (await getCurrentUser())?.person ?? null;
}

/** Require a signed-in user; redirect to the login page if absent. */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** Require a fully-onboarded "me" (Person); redirect to login/onboarding otherwise. */
export async function requireCurrentPerson(): Promise<Person> {
  const user = await requireCurrentUser();
  if (!user.person) redirect("/signup");
  return user.person;
}

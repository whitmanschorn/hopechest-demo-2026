"use server";

/**
 * Phone + one-time-code auth server actions.
 *   requestCode → store a code, "send" it (dev provider surfaces it on screen)
 *   verifyCode  → validate, find-or-create the user, open a session cookie
 *   completeOnboarding → create Person + Member for a brand-new user
 *   logout      → drop the session
 */
import { randomBytes, randomInt } from "node:crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getPhoneProvider } from "@/lib/auth/phone-provider";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/session";

const CODE_TTL_MIN = 10;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function requestCode(
  phoneRaw: string,
): Promise<{ ok: boolean; phone?: string; surfacedCode?: string; error?: string }> {
  const phone = normalizePhone(phoneRaw);
  if (phone.replace(/\D/g, "").length < 10) return { ok: false, error: "Enter a valid phone number." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.verificationCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000) },
  });

  const { surfacedCode } = await getPhoneProvider().sendCode(phone, code);
  return { ok: true, phone, surfacedCode };
}

export async function verifyCode(
  phoneRaw: string,
  code: string,
): Promise<{ ok: boolean; onboardingComplete?: boolean; error?: string }> {
  const phone = normalizePhone(phoneRaw);

  const record = await prisma.verificationCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false, error: "Code expired — request a new one." };

  await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
  if (record.attempts >= 5) return { ok: false, error: "Too many attempts — request a new code." };
  if (record.code !== code.trim()) return { ok: false, error: "That code didn't match." };

  await prisma.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone, status: "ACTIVE" },
    include: { member: true },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000) },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  });

  return { ok: true, onboardingComplete: user.onboardingComplete && Boolean(user.memberId) };
}

/** Create a family profile for a freshly-signed-up user and mark onboarding done. */
export async function completeOnboarding(
  displayName: string,
): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Please sign in again." };
  if (me.member) return { ok: true }; // already onboarded

  const name = displayName.trim();
  if (!name) return { ok: false, error: "Tell us your name." };

  const first = name.split(/\s+/)[0];
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${me.userId.slice(0, 6)}`;

  await prisma.person.create({
    data: {
      id,
      name,
      shortName: first,
      fullName: name,
      relation: "You",
      gender: "f",
      photoCount: 0,
      member: { create: { role: "Contributor", joined: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" }) } },
    },
  });
  await prisma.user.update({
    where: { id: me.userId },
    data: { memberId: id, displayName: first, onboardingComplete: true },
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  jar.delete(SESSION_COOKIE);
}

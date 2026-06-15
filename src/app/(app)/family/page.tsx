import type { Metadata } from "next";

import { Badge } from "@/components/Badge";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { InviteForm } from "@/components/InviteForm";
import { SectionHeader, SubHeader } from "@/components/SectionHeader";
import { MailIcon } from "@/components/icons";
import {
  getInvites,
  getMembers,
  getPerson,
  type Role,
} from "@/data";
import { requireCurrentPerson } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Family" };

const ROLE_TONE: Record<Role, "sepia" | "brass" | "plain"> = {
  Admin: "sepia",
  Contributor: "brass",
  Viewer: "plain",
};

const ROLE_HINT: Record<Role, string> = {
  Admin: "manages members & settings",
  Contributor: "adds photos & documents",
  Viewer: "browses and comments",
};

export default async function Family() {
  const me = await requireCurrentPerson();
  const members = await getMembers();
  const invites = await getInvites();
  const memberRows = await Promise.all(
    members.map(async (member) => ({
      member,
      person: await getPerson(member.personId),
    })),
  );
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        title="Family"
        subtitle="Everyone with a key to the Kowalski–Whitfield chest."
      />
      <div className="overflow-hidden rounded-xl bg-cream ring-1 ring-hairline">
        {memberRows.map(({ member, person }, i) => {
          const isMe = member.personId === me.id;
          return (
            <div
              key={member.personId}
              className={`flex items-center gap-4 px-5 py-4 ${
                i > 0 ? "border-t border-hairline" : ""
              }`}
            >
              <InitialsAvatar person={person} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">
                  {person.name}
                  {isMe ? (
                    <span className="ml-2 text-xs text-ink-soft">(you)</span>
                  ) : null}
                </p>
                <p className="text-sm text-ink-soft">
                  {person.relation} · joined {member.joined}
                </p>
              </div>
              <div className="text-right">
                <Badge tone={ROLE_TONE[member.role]}>{member.role}</Badge>
                <p className="mt-1 hidden text-xs text-ink-soft sm:block">
                  {ROLE_HINT[member.role]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <SubHeader>Pending invites</SubHeader>
      <div className="flex flex-col gap-3">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center gap-4 rounded-xl bg-cream px-5 py-4 ring-1 ring-hairline"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
              <MailIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ink">{invite.name}</p>
              <p className="truncate text-sm text-ink-soft">
                {invite.email} · invited {invite.sent.toLowerCase()}
              </p>
            </div>
            <Badge tone="rosewood">Pending</Badge>
          </div>
        ))}
      </div>

      <SubHeader>Invite someone</SubHeader>
      <InviteForm />
    </div>
  );
}

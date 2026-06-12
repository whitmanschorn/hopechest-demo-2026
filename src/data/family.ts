import type { Invite, Member } from "./types";

export const members: Member[] = [
  { personId: "eleanor", role: "Admin", joined: "January 2026" },
  { personId: "susan", role: "Contributor", joined: "January 2026" },
  { personId: "margaret", role: "Contributor", joined: "February 2026" },
  { personId: "david", role: "Viewer", joined: "March 2026" },
];

export const invites: Invite[] = [
  {
    id: "invite-anne",
    name: "Cousin Anne",
    email: "anne.kowalski@example.com",
    sent: "Last week",
  },
];

/** The signed-in demo identity. */
export const currentMemberId = "margaret";

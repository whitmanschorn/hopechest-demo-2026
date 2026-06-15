import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { requireCurrentPerson } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireCurrentPerson();
  return <AppShell me={me}>{children}</AppShell>;
}

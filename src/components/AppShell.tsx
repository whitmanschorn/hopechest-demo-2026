import Link from "next/link";
import type { ReactNode } from "react";

import { InitialsAvatar } from "./InitialsAvatar";
import { NavLink } from "./NavLink";
import {
  AlbumsIcon,
  AskIcon,
  ChestIcon,
  DocumentIcon,
  FamilyIcon,
  HomeIcon,
  MailIcon,
  MapPinIcon,
  PeopleIcon,
  UploadIcon,
} from "./icons";
import { currentMemberId, getPerson } from "@/data";

const PRIMARY_NAV = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/albums", label: "Albums", Icon: AlbumsIcon },
  { href: "/ask", label: "Ask", Icon: AskIcon },
  { href: "/people", label: "People", Icon: PeopleIcon },
  { href: "/upload", label: "Upload", Icon: UploadIcon },
] as const;

const SECONDARY_NAV = [
  { href: "/map", label: "Map", Icon: MapPinIcon },
  { href: "/documents", label: "Documents", Icon: DocumentIcon },
  { href: "/family", label: "Family", Icon: FamilyIcon },
  { href: "/newsletter", label: "Newsletter", Icon: MailIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const me = getPerson(currentMemberId);
  return (
    <div className="flex min-h-dvh flex-1">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-walnut text-cream lg:flex">
        <Link
          href="/home"
          className="flex items-center gap-2.5 px-6 pt-7 pb-6"
        >
          <ChestIcon className="size-7 text-brass" />
          <span className="font-display text-2xl font-semibold tracking-tight">
            Hopechest
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {PRIMARY_NAV.map(({ href, label, Icon }) => (
            <NavLink
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-cream/75 transition-colors hover:bg-white/5 hover:text-cream"
              activeClassName="bg-white/10 !text-cream font-medium"
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
          <div className="mx-3 my-3 border-t border-white/10" />
          {SECONDARY_NAV.map(({ href, label, Icon }) => (
            <NavLink
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-cream/75 transition-colors hover:bg-white/5 hover:text-cream"
              activeClassName="bg-white/10 !text-cream font-medium"
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link
          href="/family"
          className="mx-3 mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
        >
          <InitialsAvatar person={me} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {me.name}
            </span>
            <span className="block text-xs text-cream/60">
              The Kowalski–Whitfield chest
            </span>
          </span>
        </Link>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-hairline bg-parchment/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/home" className="flex items-center gap-2">
          <ChestIcon className="size-6 text-sepia" />
          <span className="font-display text-xl font-semibold tracking-tight text-walnut">
            Hopechest
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {SECONDARY_NAV.map(({ href, label, Icon }) => (
            <NavLink
              key={href}
              href={href}
              className="rounded-lg p-2 text-ink-soft transition-colors hover:text-sepia"
              activeClassName="!text-sepia"
            >
              <Icon className="size-5" />
              <span className="sr-only">{label}</span>
            </NavLink>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="min-w-0 flex-1 px-4 pb-24 pt-18 sm:px-6 lg:ml-60 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-hairline bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {PRIMARY_NAV.map(({ href, label, Icon }) => (
          <NavLink
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-ink-soft"
            activeClassName="!text-sepia font-medium"
          >
            <Icon className="size-6" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

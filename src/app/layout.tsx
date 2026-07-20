import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";

import { DemoBanner } from "@/components/DemoBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "Hopechest — Your family's living archive",
    template: "%s · Hopechest",
  },
  description:
    "Hopechest keeps your family's photos, documents, and stories safe — and helps you rediscover them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full`}
    >
      <body className="min-h-full flex flex-col pt-[var(--banner-h)]">
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}

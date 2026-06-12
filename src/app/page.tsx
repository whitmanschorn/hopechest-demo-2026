import Link from "next/link";

import { FauxAuthButton } from "@/components/FauxAuthButton";
import { Img } from "@/components/Img";
import { ChestIcon } from "@/components/icons";
import { getPhoto } from "@/data";

export default function Welcome() {
  const hero = getPhoto("klara-and-sarah-1933");
  const wedding = getPhoto("wedding-day-1950");
  const picnic = getPhoto("family-picnic-1962");
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2.5">
            <ChestIcon className="size-9 text-sepia" />
            <span className="font-display text-3xl font-semibold tracking-tight text-walnut">
              Hopechest
            </span>
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-walnut sm:text-5xl">
            Your family&rsquo;s living archive
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg leading-7 text-ink-soft lg:mx-0">
            Keep every photo, letter, and story safe in one chest — and let the
            whole family rediscover them together.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <FauxAuthButton label="Sign in" busyLabel="Opening the chest…" />
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full border border-sepia/40 px-7 text-[15px] font-medium text-sepia transition-colors hover:bg-sepia/10"
            >
              Create your chest
            </Link>
          </div>
          <p className="mt-5 text-sm text-ink-soft">
            <Link
              href="/forgot-password"
              className="underline decoration-hairline underline-offset-4 hover:text-sepia"
            >
              Forgot your password?
            </Link>
          </p>
        </div>

        {/* Photo collage */}
        <div className="order-1 mx-auto flex h-72 w-full max-w-md items-center justify-center sm:h-96 lg:order-2">
          <div className="relative h-full w-full">
            <div className="absolute left-1/2 top-1/2 z-0 w-48 -translate-x-[85%] -translate-y-[60%] rotate-[-6deg] bg-cream p-2 pb-7 shadow-xl shadow-walnut/20 ring-1 ring-hairline sm:w-60">
              <Img
                src={wedding.src}
                alt={wedding.title}
                width={wedding.width}
                height={wedding.height}
                loading="eager"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute left-1/2 top-1/2 z-0 w-44 -translate-x-[10%] -translate-y-[35%] rotate-[7deg] bg-cream p-2 pb-7 shadow-xl shadow-walnut/20 ring-1 ring-hairline sm:w-56">
              <Img
                src={picnic.src}
                alt={picnic.title}
                width={picnic.width}
                height={picnic.height}
                loading="eager"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute left-1/2 top-1/2 z-10 w-40 -translate-x-1/2 -translate-y-1/2 rotate-[1deg] bg-cream p-2 pb-8 shadow-2xl shadow-walnut/30 ring-1 ring-hairline sm:w-48">
              <Img
                src={hero.src}
                alt={hero.title}
                width={hero.width}
                height={hero.height}
                loading="eager"
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="mt-2 block text-center font-display text-xs italic text-ink-soft">
                Klara &amp; Sarah, c. 1933
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-14 text-xs text-ink-soft/70">
        Demo — every name and photo here is a fictional family assembled from
        public-domain archives.
      </p>
    </main>
  );
}

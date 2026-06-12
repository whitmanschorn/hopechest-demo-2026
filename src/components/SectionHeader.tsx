import type { ReactNode } from "react";

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-walnut sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-ink-soft">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SubHeader({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 font-display text-xl font-semibold tracking-tight text-walnut">
      {children}
    </h2>
  );
}

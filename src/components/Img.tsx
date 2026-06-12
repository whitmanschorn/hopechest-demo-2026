import type { ComponentProps } from "react";

/**
 * Plain <img> wrapper. The demo serves small committed assets directly, so we
 * deliberately skip next/image and the Vercel image optimizer.
 */
export function Img({ alt, loading = "lazy", ...rest }: ComponentProps<"img">) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt ?? ""} loading={loading} {...rest} />;
}

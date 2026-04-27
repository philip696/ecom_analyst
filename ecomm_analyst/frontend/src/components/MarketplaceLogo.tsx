"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { getApiBaseUrl } from "@/lib/product-image";

const EXT_ORDER = ["png", "svg", "webp"] as const;

type Props = {
  assetSlug: string | null;
  emoji: string;
  label: string;
  /** Pixel size for the image (width & height). */
  size?: number;
  className?: string;
  imgClassName?: string;
};

/**
 * Tries `{API}/marketplace-assets/{slug}.png`, then `.svg`, then `.webp`.
 * If none load, shows `emoji`.
 */
export default function MarketplaceLogo({
  assetSlug,
  emoji,
  label,
  size = 20,
  className,
  imgClassName,
}: Props) {
  const [extIdx, setExtIdx] = useState(0);
  const base = getApiBaseUrl();

  const src = useMemo(() => {
    if (!assetSlug || extIdx >= EXT_ORDER.length) return null;
    return `${base}/marketplace-assets/${assetSlug}.${EXT_ORDER[extIdx]}`;
  }, [assetSlug, extIdx, base]);

  if (!assetSlug || extIdx >= EXT_ORDER.length) {
    return (
      <span className={clsx("inline-flex shrink-0 items-center justify-center", className)} aria-hidden>
        {emoji}
      </span>
    );
  }

  return (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center", className)}
      title={label}
      role="img"
      aria-label={label}
    >
      <img
        key={`${assetSlug}-${extIdx}`}
        src={src!}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={clsx("object-contain", imgClassName)}
        onError={() => setExtIdx((i) => i + 1)}
      />
    </span>
  );
}

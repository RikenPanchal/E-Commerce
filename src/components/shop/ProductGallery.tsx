"use client";

import { useState } from "react";
import { ProductImage } from "@/components/shop/ProductImage";
import type { ProductCategory } from "@/lib/data/categories";
import type { ProductMediaView } from "@/types/product";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

/**
 * The main image plus a strip of clickable thumbnails. Previously the
 * thumbnails were just static images below a fixed main photo - clicking
 * one did nothing. This makes the whole gallery interactive.
 */
export function ProductGallery({
  media,
  name,
  category,
  badge,
}: {
  media: ProductMediaView[];
  name: string;
  category?: ProductCategory;
  badge?: string;
}) {
  const [activeId, setActiveId] = useState(media[0]?.id);
  const active = media.find((item) => item.id === activeId) ?? media[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-rose-100 ring-1 ring-rose-100/70 dark:shadow-none dark:ring-white/10">
        {badge ? (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-background shadow-sm">
            {badge}
          </span>
        ) : null}
        {active?.type === "video" ? (
          <video
            key={active.id}
            src={active.url}
            controls
            className="aspect-square w-full bg-black/5 object-cover dark:bg-white/5"
          />
        ) : (
          <ProductImage
            media={active ? [active] : []}
            name={name}
            category={category}
            className="aspect-square w-full"
            priority
          />
        )}
      </div>

      {media.length > 1 ? (
        <div className="flex gap-3 relative overflow-x-auto pb-1">
          {media.map((item) => {
            const isActive = item.id === active?.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                aria-label={item.type === "video" ? "Show video" : "Show image"}
                aria-current={isActive}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl transition-all ${
                  isActive
                    ? "ring-2 ring-rose-500 ring-offset-2 ring-offset-background"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {item.type === "video" ? (
                  <>
                    <video src={item.url} className="h-full w-full object-cover" muted />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                      <PlayIcon />
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.alt ?? name} className="h-full w-full object-cover" loading="lazy" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

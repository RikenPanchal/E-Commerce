"use client";

import { useState } from "react";
import { ProductImage } from "@/components/shop/ProductImage";
import type { ProductCategory } from "@/lib/data/categories";
import type { ProductMediaView } from "@/types/product";

/**
 * A compact main-image-plus-thumbnails gallery for Quick View - the same
 * "click a thumbnail to switch the main image" interaction as the full
 * product page's `ProductGallery`, but sized and styled for the smaller
 * modal/sheet context (and this app's current warm-neutral design tokens)
 * rather than reusing that component's larger, rose-tinted chrome
 * directly. Real product media only - no invented images, and video items
 * are skipped here (a still frame in a small quick-view thumbnail strip
 * isn't worth the added complexity; the full product page already plays
 * video for anyone who continues there).
 */
export function QuickViewGallery({
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
  const images = media.filter((item) => item.type === "image");
  const [activeId, setActiveId] = useState(images[0]?.id);
  const active = images.find((item) => item.id === activeId) ?? images[0];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md border border-surface-border bg-background">
        {badge ? (
          <span className="absolute top-2 left-2 z-10 rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold tracking-wide text-background uppercase">
            {badge}
          </span>
        ) : null}
        <ProductImage media={active ? [active] : []} name={name} category={category} className="h-full w-full" />
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 relative overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((item) => {
            const isActive = item.id === active?.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                aria-label={`Show image ${item.alt ?? ""}`.trim()}
                aria-current={isActive}
                className={`relative h-16 w-13 shrink-0 overflow-hidden rounded-sm border transition-colors ${
                  isActive ? "border-foreground" : "border-surface-border opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.alt ?? name} className="h-full w-full object-cover" loading="lazy" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

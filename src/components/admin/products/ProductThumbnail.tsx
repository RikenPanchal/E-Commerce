import type { ProductMediaView } from "@/types/product";

export function ProductThumbnail({ media, name }: { media: ProductMediaView[]; name: string }) {
  const primary = media.find((item) => item.type === "image") ?? media[0];

  if (!primary) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/5 text-xs text-foreground/40 dark:bg-white/10">
        No photo
      </div>
    );
  }

  if (primary.type === "video") {
    return <video src={primary.url} className="h-12 w-12 shrink-0 rounded-lg object-cover" muted />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={primary.url} alt={name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />;
}

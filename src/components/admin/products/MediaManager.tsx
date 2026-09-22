"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductMediaView } from "@/types/product";

interface MediaManagerProps {
  existingMedia: ProductMediaView[];
  removedMediaIds: string[];
  onRemoveExisting: (id: string) => void;
  onRestoreExisting: (id: string) => void;
  newFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveNewFile: (index: number) => void;
}

function NewFilePreview({ file }: { file: File }) {
  // Creating the object URL in useMemo and revoking it in a separate
  // useEffect looked fine, but desynced under React Strict Mode's dev-only
  // double-invoke: the effect's cleanup revoked that memoized URL right
  // after creating it, before the <img> ever got to load it - so every
  // freshly-added photo rendered as a broken image. Creating AND revoking
  // the URL inside the same effect (via state) keeps them paired correctly
  // even when the effect runs, cleans up, and reruns.
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // Creating the object URL and revoking it must happen in the same
    // effect invocation, or React Strict Mode's dev-only double-invoke
    // revokes it before the <img> can ever load it. This is the necessary
    // bootstrap read, same exception as CartProvider's localStorage read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) {
    return null;
  }

  if (file.type.startsWith("video/")) {
    return <video src={url} className="h-full w-full object-cover" muted />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={file.name} className="h-full w-full object-cover" />;
}

export function MediaManager({
  existingMedia,
  removedMediaIds,
  onRemoveExisting,
  onRestoreExisting,
  newFiles,
  onAddFiles,
  onRemoveNewFile,
}: MediaManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {existingMedia.map((item) => {
          const isRemoved = removedMediaIds.includes(item.id);
          return (
            <div
              key={item.id}
              className={`relative aspect-square overflow-hidden rounded-lg border border-black/10 dark:border-white/15 ${
                isRemoved ? "opacity-30" : ""
              }`}
            >
              {item.type === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.alt ?? ""} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => (isRemoved ? onRestoreExisting(item.id) : onRemoveExisting(item.id))}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white"
              >
                {isRemoved ? "Undo" : "Remove"}
              </button>
            </div>
          );
        })}

        {newFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="relative aspect-square overflow-hidden rounded-lg border border-rose-300 dark:border-rose-800"
          >
            <NewFilePreview file={file} />
            <button
              type="button"
              onClick={() => onRemoveNewFile(index)}
              className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white"
            >
              Remove
            </button>
            <span className="absolute bottom-1 left-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-medium text-background">
              New
            </span>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/20 text-xs text-foreground/60 transition-colors hover:border-black/40 dark:border-white/20 dark:hover:border-white/40"
        >
          <span className="text-xl">+</span>
          Add photos / video
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) {
            onAddFiles(files);
          }
          event.target.value = "";
        }}
      />
      <p className="text-xs text-foreground/50">
        Images up to 8MB, videos up to 60MB. JPG, PNG, WEBP, GIF, MP4, WEBM, MOV.
      </p>
    </div>
  );
}

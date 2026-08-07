"use client";

import { useState } from "react";
import Icon from "./Icon";
import type { UnitPhoto } from "@/lib/types";

export default function PhotoCarousel({
  photos,
  aspect = "4/3",
  rounded = "rounded-xl",
}: {
  photos: Pick<UnitPhoto, "id" | "url" | "caption">[];
  aspect?: string;
  rounded?: string;
}) {
  const [i, setI] = useState(0);
  const has = photos.length > 0;
  const go = (delta: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setI((v) => (v + delta + photos.length) % photos.length);
  };

  return (
    <div className={`group relative overflow-hidden bg-soft ${rounded}`} style={{ aspectRatio: aspect }}>
      {has ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photos[i].url}
          alt={photos[i].caption || "Unit photo"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-ink-3">
          <Icon name="camera" size={28} />
        </div>
      )}

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => go(-1, e)}
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-[var(--shadow-card)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => go(1, e)}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-[var(--shadow-card)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Icon name="chevronRight" size={16} />
          </button>
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            {photos.map((p, n) => (
              <span
                key={p.id}
                className={`h-1.5 rounded-full bg-white transition-all ${
                  n === i ? "w-4 opacity-100" : "w-1.5 opacity-60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Icon from "./Icon";
import type { UnitPhoto } from "@/lib/types";

export default function PhotoManager({ unitId, photos }: { unitId: number; photos: UnitPhoto[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      list.forEach((f) => form.append("photos", f));
      const res = await fetch(`/api/units/${unitId}/photos`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function mutate(id: number, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${id}`, init);
      if (!res.ok) throw new Error((await res.json()).error ?? "Action failed");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => (
          <figure key={p.id} className="group relative overflow-hidden rounded-xl bg-soft" style={{ aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption} className="h-full w-full object-cover" loading="lazy" />
            {p.is_cover && (
              <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold">
                Cover
              </span>
            )}
            <div className="reveal-on-hover absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/65 to-transparent px-2.5 pb-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <span className="truncate text-[12px] font-medium text-white">{p.caption || "Photo"}</span>
              <span className="flex gap-1.5">
                {!p.is_cover && (
                  <button
                    type="button" title="Make cover photo" disabled={busy}
                    className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink hover:bg-white"
                    onClick={() =>
                      mutate(p.id, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ is_cover: true }),
                      })
                    }
                  >
                    <Icon name="star" size={14} />
                  </button>
                )}
                <button
                  type="button" title="Delete photo" disabled={busy}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[var(--color-bad)] hover:bg-white"
                  onClick={() => {
                    if (confirm("Delete this photo?")) mutate(p.id, { method: "DELETE" });
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </span>
            </div>
          </figure>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            upload(e.dataTransfer.files);
          }}
          className={`grid place-items-center rounded-xl border-2 border-dashed text-ink-2 transition-colors ${
            dragOver ? "border-rausch bg-rausch-50 text-rausch" : "border-line hover:border-ink hover:text-ink"
          }`}
          style={{ aspectRatio: "4/3" }}
        >
          <span className="flex flex-col items-center gap-1.5 px-3 text-center">
            <Icon name={busy ? "refresh" : "camera"} size={22} />
            <span className="text-[13px] font-semibold">{busy ? "Uploading…" : "Add photos"}</span>
            <span className="text-[11px]">JPG, PNG or WebP · up to 12 MB</span>
          </span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />

      {error && (
        <p className="mt-3 rounded-lg border border-[#e3b5aa] bg-[var(--color-bad-soft)] px-3 py-2 text-[13px] text-[var(--color-bad)]">
          {error}
        </p>
      )}
    </div>
  );
}

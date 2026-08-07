"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";
import { AMENITY_OPTIONS, type UnitWithPhotos } from "@/lib/types";
import { idr } from "@/lib/format";

const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Loft", "Penthouse"];

type Draft = {
  name: string;
  code: string;
  type: string;
  building: string;
  address: string;
  floor: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  description: string;
  base_rate: number;
  min_hours: number;
  cleaning_fee: number;
  extra_guest_fee: number;
  status: string;
};

const EMPTY: Draft = {
  name: "",
  code: "",
  type: "Studio",
  building: "",
  address: "",
  floor: "",
  capacity: 2,
  bedrooms: 1,
  bathrooms: 1,
  amenities: ["Wi-Fi", "Air conditioning"],
  description: "",
  base_rate: 75000,
  min_hours: 3,
  cleaning_fee: 35000,
  extra_guest_fee: 25000,
  status: "active",
};

export default function UnitForm({ unit }: { unit?: UnitWithPhotos }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(unit ? { ...EMPTY, ...unit, code: unit.code ?? "" } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((p) => ({ ...p, [key]: value }));

  const toggleAmenity = (a: string) =>
    setD((p) => ({
      ...p,
      amenities: p.amenities.includes(a) ? p.amenities.filter((x) => x !== a) : [...p.amenities, a],
    }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(unit ? `/api/units/${unit.id}` : "/api/units", {
        method: unit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save the unit");
      router.push(`/units/${unit ? unit.id : json.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const sample4h = d.base_rate * 4 + d.cleaning_fee;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <fieldset className="panel">
          <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-2">Basics</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Unit name</label>
              <input
                id="name" className="input-lg" required value={d.name}
                placeholder="Skyline Studio 12A"
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="code">Short code</label>
              <input id="code" className="input" value={d.code} placeholder="SKY-12A"
                onChange={(e) => set("code", e.target.value)} />
              <p className="hint">Shown on bookings and receipts.</p>
            </div>
            <div>
              <label className="label" htmlFor="type">Type</label>
              <select id="type" className="input" value={d.type} onChange={(e) => set("type", e.target.value)}>
                {UNIT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="building">Building</label>
              <input id="building" className="input" value={d.building}
                onChange={(e) => set("building", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="floor">Floor</label>
              <input id="floor" className="input" value={d.floor} onChange={(e) => set("floor", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">Address</label>
              <input id="address" className="input" value={d.address}
                onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">Description</label>
              <textarea id="description" className="input" value={d.description}
                placeholder="What makes this unit worth booking?"
                onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-2">Capacity</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Counter label="Guests" value={d.capacity} min={1} onChange={(v) => set("capacity", v)} />
            <Counter label="Bedrooms" value={d.bedrooms} min={0} onChange={(v) => set("bedrooms", v)} />
            <Counter label="Bathrooms" value={d.bathrooms} min={0} onChange={(v) => set("bathrooms", v)} />
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-2">Amenities</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`chip ${d.amenities.includes(a) ? "chip-active" : ""}`}
              >
                {d.amenities.includes(a) && <Icon name="check" size={13} />}
                {a}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* pricing sidebar */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <fieldset className="panel">
          <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-2">Pricing</legend>
          <div className="mt-3 space-y-4">
            <div>
              <label className="label" htmlFor="base_rate">Base rate per hour (IDR)</label>
              <input id="base_rate" type="number" min={0} step={1000} className="input-lg tabular"
                value={d.base_rate} onChange={(e) => set("base_rate", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="min_hours">Minimum hours</label>
              <input id="min_hours" type="number" min={1} max={24} className="input tabular"
                value={d.min_hours} onChange={(e) => set("min_hours", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="cleaning_fee">Cleaning fee</label>
              <input id="cleaning_fee" type="number" min={0} step={1000} className="input tabular"
                value={d.cleaning_fee} onChange={(e) => set("cleaning_fee", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="extra_guest_fee">Extra guest fee</label>
              <input id="extra_guest_fee" type="number" min={0} step={1000} className="input tabular"
                value={d.extra_guest_fee} onChange={(e) => set("extra_guest_fee", Number(e.target.value))} />
              <p className="hint">Charged per guest above capacity.</p>
            </div>
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" className="input" value={d.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active — bookable</option>
                <option value="maintenance">Maintenance — hidden from new bookings</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="rounded-lg bg-soft px-3 py-2.5 text-[13px]">
              <p className="text-ink-2">A plain 4-hour booking would cost</p>
              <p className="text-[17px] font-semibold tabular">{idr(sample4h)}</p>
              <p className="mt-0.5 text-[11px] text-ink-2">before weekend, night or duration rules</p>
            </div>
          </div>
        </fieldset>

        {error && (
          <p className="rounded-lg border border-[#e3b5aa] bg-[var(--color-bad-soft)] px-3 py-2 text-[13px] text-[var(--color-bad)]">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : unit ? "Save changes" : "Create unit"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function Counter({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
        <button
          type="button" aria-label={`Decrease ${label}`} className="icon-btn h-7 w-7"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Icon name="minus" size={14} />
        </button>
        <span className="text-[15px] font-semibold tabular">{value}</span>
        <button
          type="button" aria-label={`Increase ${label}`} className="icon-btn h-7 w-7"
          onClick={() => onChange(value + 1)}
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  );
}

import Link from "next/link";
import Icon from "./Icon";
import PhotoCarousel from "./PhotoCarousel";
import { Pill } from "./ui";
import { idr } from "@/lib/format";
import type { UnitWithPhotos } from "@/lib/types";

export default function UnitCard({ unit }: { unit: UnitWithPhotos }) {
  return (
    <Link href={`/units/${unit.id}`} className="group block">
      <div className="relative">
        <PhotoCarousel photos={unit.photos} />
        {unit.status !== "active" && (
          <span className="absolute left-3 top-3">
            <Pill tone={unit.status === "maintenance" ? "warn" : "neutral"}>
              {unit.status === "maintenance" ? "Maintenance" : "Inactive"}
            </Pill>
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[15px] font-semibold leading-snug">{unit.name}</p>
          <span className="shrink-0 text-[13px] text-ink-2">{unit.code}</span>
        </div>
        <p className="mt-0.5 truncate text-[14px] text-ink-2">
          {unit.type} · {unit.building || unit.address || "—"}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-1">
            <Icon name="users" size={13} /> {unit.capacity}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Icon name="bed" size={13} /> {unit.bedrooms}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Icon name="bath" size={13} /> {unit.bathrooms}
          </span>
          <span>·</span>
          <span>min {unit.min_hours}h</span>
        </p>
        <p className="mt-1.5 text-[15px]">
          <span className="font-semibold">{idr(unit.base_rate)}</span>
          <span className="text-ink-2"> / hour</span>
        </p>
      </div>
    </Link>
  );
}

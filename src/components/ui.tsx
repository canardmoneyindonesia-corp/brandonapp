import Link from "next/link";
import Icon from "./Icon";
import { titleCase } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

/* ---------------------------------------------------------- page frame --- */

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
          <Icon name="chevronLeft" size={16} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="section-title">{children}</h2>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------- tiles --- */

export function StatTile({
  label,
  value,
  sub,
  delta,
  icon,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: { pct: number; label: string } | null;
  icon?: string;
  href?: string;
}) {
  const body = (
    <div className="card card-hover h-full p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        {icon && <Icon name={icon} size={18} className="text-ink-3" />}
      </div>
      <p className="mt-2 text-[24px] font-semibold leading-none tracking-tight sm:text-[28px]">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${
              delta.pct >= 0 ? "text-[var(--color-good)]" : "text-[var(--color-bad)]"
            }`}
          >
            <Icon name={delta.pct >= 0 ? "arrowUp" : "arrowDown"} size={13} />
            {Math.abs(delta.pct).toFixed(0)}%
          </span>
        )}
        {sub && <span className="text-[12px] text-ink-2">{sub}</span>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/* -------------------------------------------------------------- badges --- */

const STATUS_STYLES: Record<BookingStatus, string> = {
  inquiry: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
  confirmed: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  checked_in: "bg-[var(--color-good-soft)] text-[var(--color-good)]",
  completed: "bg-soft text-ink-2",
  cancelled: "bg-[var(--color-bad-soft)] text-[var(--color-bad)]",
  no_show: "bg-[var(--color-bad-soft)] text-[var(--color-bad)]",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? "bg-soft text-ink-2"}`}>{titleCase(status)}</span>;
}

export function SourceTag({ source }: { source: string }) {
  const icons: Record<string, string> = {
    whatsapp: "whatsapp",
    walk_in: "users",
    phone: "phone",
    instagram: "camera",
    repeat: "refresh",
  };
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-2">
      <Icon name={icons[source] ?? "more"} size={13} />
      {titleCase(source)}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const tones = {
    neutral: "bg-soft text-ink-2",
    good: "bg-[var(--color-good-soft)] text-[var(--color-good)]",
    warn: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
    bad: "bg-[var(--color-bad-soft)] text-[var(--color-bad)]",
    info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

/* --------------------------------------------------------------- empty --- */

export function EmptyState({
  icon = "sparkle",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-soft text-ink-3">
        <Icon name={icon} size={26} />
      </span>
      <p className="text-[17px] font-semibold">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#e3b5aa] bg-[var(--color-bad-soft)] p-5">
      <p className="font-semibold text-[var(--color-bad)]">{title}</p>
      <pre className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{body}</pre>
    </div>
  );
}

/* -------------------------------------------------------------- avatar --- */

export function Avatar({ name, hue = 0, size = 44 }: { name: string; hue?: number; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(150deg, hsl(${hue} 62% 58%), hsl(${(hue + 40) % 360} 58% 44%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

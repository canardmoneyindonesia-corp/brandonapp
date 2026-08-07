"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";

/** Confirm-then-DELETE button used for units, bookings, rules and expenses. */
export default function DangerButton({
  url,
  confirmText,
  redirectTo,
  label,
  icon = "trash",
  className = "btn-danger",
}: {
  url: string;
  confirmText: string;
  redirectTo?: string;
  label: string;
  icon?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          if (!confirm(confirmText)) return;
          setBusy(true);
          setError(null);
          try {
            const res = await fetch(url, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
            if (redirectTo) router.push(redirectTo);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <Icon name={icon} size={16} />
        {busy ? "Working…" : label}
      </button>
      {error && <span className="text-[12px] text-[var(--color-bad)]">{error}</span>}
    </span>
  );
}

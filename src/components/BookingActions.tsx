"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";
import { idr, isoLocal, titleCase } from "@/lib/format";
import { BOOKING_STATUSES, PAYMENT_METHODS, type BookingStatus } from "@/lib/types";

export function StatusSwitcher({
  bookingId,
  status,
}: {
  bookingId: number;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function change(next: BookingStatus) {
    setBusy(next);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not update");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {BOOKING_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy !== null || s === status}
            onClick={() => change(s)}
            className={`chip ${s === status ? "chip-active" : ""} ${busy === s ? "opacity-50" : ""}`}
          >
            {s === status && <Icon name="check" size={13} />}
            {titleCase(s)}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-[13px] text-[var(--color-bad)]">{error}</p>}
    </div>
  );
}

export function PaymentForm({
  bookingId,
  due,
}: {
  bookingId: number;
  due: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(Math.max(0, due));
  const [method, setMethod] = useState("transfer");
  const [paidAt, setPaidAt] = useState(() => isoLocal(new Date()));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method, paid_at: new Date(paidAt).toISOString(), note }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not record the payment");
      setNote("");
      setAmount(0);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pay_amount">Amount</label>
          <input
            id="pay_amount" type="number" min={1} step={1000} className="input tabular" value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          />
        </div>
        <div>
          <label className="label" htmlFor="pay_method">Method</label>
          <select id="pay_method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{titleCase(m)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pay_at">Received at</label>
          <input id="pay_at" type="datetime-local" className="input" value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pay_note">Note</label>
          <input id="pay_note" className="input" value={note} placeholder="Deposit, balance, refund…"
            onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      {due > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <button type="button" className="chip shrink-0" onClick={() => setAmount(due)}>
            Full amount {idr(due)}
          </button>
          <button type="button" className="chip shrink-0" onClick={() => setAmount(Math.round(due / 2 / 1000) * 1000)}>
            Half
          </button>
        </div>
      )}

      {error && <p className="text-[13px] text-[var(--color-bad)]">{error}</p>}

      <button type="submit" className="btn-dark w-full sm:w-auto" disabled={busy || amount <= 0}>
        {busy ? "Recording…" : "Record payment"}
      </button>
    </form>
  );
}

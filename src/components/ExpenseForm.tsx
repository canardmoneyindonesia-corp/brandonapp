"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isoDate, titleCase } from "@/lib/format";
import { EXPENSE_CATEGORIES, type UnitWithPhotos } from "@/lib/types";

export default function ExpenseForm({ units }: { units: Pick<UnitWithPhotos, "id" | "name">[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("cleaning");
  const [unitId, setUnitId] = useState("");
  const [date, setDate] = useState(() => isoDate());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          category,
          unit_id: unitId || null,
          incurred_on: date,
          note,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save the expense");
      setAmount(0);
      setNote("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="exp_amount">Amount (IDR)</label>
        <input
          id="exp_amount" type="number" min={1} step={1000} className="input tabular" value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
        />
      </div>
      <div>
        <label className="label" htmlFor="exp_category">Category</label>
        <select id="exp_category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{titleCase(c)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="exp_unit">Unit</label>
        <select id="exp_unit" className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">All units / business-wide</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="exp_date">Date</label>
        <input id="exp_date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="exp_note">Note</label>
        <input id="exp_note" className="input" value={note} placeholder="Cleaning crew, electricity, towels…"
          onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <p className="text-[13px] text-[var(--color-bad)] sm:col-span-2">{error}</p>}

      <div className="sm:col-span-2">
        <button type="submit" className="btn-dark w-full sm:w-auto" disabled={busy || amount <= 0}>
          {busy ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

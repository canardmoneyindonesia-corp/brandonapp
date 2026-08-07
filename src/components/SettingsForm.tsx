"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BusinessSettings } from "@/lib/queries";

export default function SettingsForm({ business }: { business: BusinessSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(business);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof BusinessSettings, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="biz_name">Business name</label>
          <input id="biz_name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          <p className="hint">Shown in the sidebar and on the install icon.</p>
        </div>
        <div>
          <label className="label" htmlFor="biz_phone">Contact number</label>
          <input id="biz_phone" className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="biz_tagline">Tagline</label>
          <input id="biz_tagline" className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="biz_note">Default check-in note</label>
          <textarea
            id="biz_note" className="input" value={form.checkinNote}
            onChange={(e) => set("checkinNote", e.target.value)}
          />
          <p className="hint">Handy to paste into WhatsApp when a booking is confirmed.</p>
        </div>
      </div>

      {error && <p className="text-[13px] text-[var(--color-bad)]">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-dark" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-[13px] text-[var(--color-good)]">Saved.</span>}
      </div>
    </form>
  );
}

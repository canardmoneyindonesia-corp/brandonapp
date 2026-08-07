"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { Avatar, Pill } from "./ui";
import { fmtChatStamp, fmtDateFull, fmtTime, idr } from "@/lib/format";
import type { BookingWithUnit, UnitWithPhotos, WaContact, WaMessage } from "@/lib/types";

export default function InboxClient({
  contacts,
  contact,
  messages,
  history,
  units,
  mode,
}: {
  contacts: WaContact[];
  contact: WaContact | null;
  messages: WaMessage[];
  history: BookingWithUnit[];
  units: UnitWithPhotos[];
  mode: "demo" | "live";
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Mark the open conversation as read.
  useEffect(() => {
    if (contact && contact.unread > 0) {
      fetch(`/api/inbox/${contact.id}/read`, { method: "POST" }).then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, contact?.id]);

  // Light polling stands in for a socket; the webhook writes to the same table.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);

  const filtered = contacts.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  async function send(text: string) {
    if (!contact || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/inbox/${contact.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not send");
      setDraft("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function simulate() {
    if (!contact) return;
    await fetch(`/api/inbox/${contact.id}/simulate`, { method: "POST" });
    router.refresh();
  }

  const cheapest = [...units].filter((u) => u.status === "active").sort((a, b) => a.base_rate - b.base_rate)[0];
  const templates = contact
    ? [
        {
          label: "Rates",
          text: units
            .filter((u) => u.status === "active")
            .map((u) => `${u.name}: ${idr(u.base_rate)}/hour (min ${u.min_hours}h, +${idr(u.cleaning_fee)} cleaning)`)
            .join("\n"),
        },
        {
          label: "Available?",
          text: `Hi ${contact.name.split(" ")[0]}! Which date and time were you thinking of? I'll check the schedule right away.`,
        },
        {
          label: "Door code",
          text: "Self check-in — I'll send the door code one hour before your slot starts. 🔑",
        },
        {
          label: "Payment",
          text: "To lock the slot, a 50% deposit works. Transfer or QRIS both fine — send the receipt here and I'll confirm. 🙏",
        },
        ...(cheapest
          ? [{ label: "Cheapest", text: `The best value right now is ${cheapest.name} at ${idr(cheapest.base_rate)}/hour, minimum ${cheapest.min_hours} hours.` }]
          : []),
      ]
    : [];

  return (
    <div className="grid h-[calc(100vh-9.5rem)] grid-cols-1 overflow-hidden rounded-2xl border border-hairline lg:h-[calc(100vh-8rem)] lg:grid-cols-[340px_1fr]">
      {/* ------------------------------------------------------ thread list */}
      <div className={`flex min-h-0 flex-col border-r border-hairline ${contact ? "hidden lg:flex" : "flex"}`}>
        <div className="border-b border-hairline p-3">
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
            <input
              className="input py-2 pl-9 text-[13px]"
              placeholder="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/inbox?c=${c.id}`}
              className={`flex items-center gap-3 border-b border-hairline px-3 py-3 transition-colors hover:bg-soft ${
                contact?.id === c.id ? "bg-soft" : ""
              }`}
            >
              <Avatar name={c.name} hue={c.avatar_hue} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-[14px] font-semibold">{c.name}</p>
                  <span className="ml-auto shrink-0 text-[11px] text-ink-2">{fmtChatStamp(c.last_message_at)}</span>
                </div>
                <p className={`truncate text-[13px] ${c.unread ? "font-medium text-ink" : "text-ink-2"}`}>
                  {c.preview ?? c.phone}
                </p>
                {c.labels.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {c.labels.map((l) => (
                      <span key={l} className="rounded-full bg-soft-2 px-1.5 py-0.5 text-[10px] text-ink-2">
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {c.unread > 0 && (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rausch px-1.5 text-[11px] font-bold text-white">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
          {!filtered.length && <p className="px-4 py-10 text-center text-sm text-ink-2">No conversations.</p>}
        </div>
      </div>

      {/* ----------------------------------------------------------- thread */}
      <div className={`flex min-h-0 flex-col ${contact ? "flex" : "hidden lg:flex"}`}>
        {contact ? (
          <>
            <div className="flex items-center gap-3 border-b border-hairline px-3 py-2.5">
              <Link href="/inbox" className="icon-btn lg:hidden" aria-label="Back to conversations">
                <Icon name="chevronLeft" size={16} />
              </Link>
              <Avatar name={contact.name} hue={contact.avatar_hue} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{contact.name}</p>
                <p className="truncate text-[12px] text-ink-2">{contact.phone}</p>
              </div>
              <Link
                href={`/bookings/new?guest=${encodeURIComponent(contact.name)}&phone=${encodeURIComponent(contact.phone)}`}
                className="btn-primary btn-sm"
              >
                <Icon name="plus" size={15} />
                Book
              </Link>
            </div>

            {history.length > 0 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-hairline bg-soft/60 px-3 py-2">
                <span className="shrink-0 self-center text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                  History
                </span>
                {history.map((b) => (
                  <Link
                    key={b.id}
                    href={`/bookings/${b.id}`}
                    className="shrink-0 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-[11px] hover:border-ink"
                  >
                    <span className="font-semibold">{b.unit_name}</span>
                    <span className="text-ink-2">
                      {" · "}
                      {fmtDateFull(b.starts_at)} · {idr(b.total_amount)}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f5f3] px-3 py-4">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay =
                  !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                return (
                  <div key={m.id}>
                    {newDay && (
                      <p className="my-3 text-center">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-ink-2 shadow-sm">
                          {fmtDateFull(m.created_at)}
                        </span>
                      </p>
                    )}
                    <div className={`mb-1.5 flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[78%] whitespace-pre-line rounded-2xl px-3 py-2 text-[14px] leading-snug shadow-sm ${
                          m.direction === "out" ? "bg-[#d9fdd3] text-ink" : "bg-white text-ink"
                        }`}
                      >
                        {m.body}
                        <span className="ml-2 inline-flex items-center gap-0.5 align-bottom text-[10px] text-ink-2">
                          {fmtTime(m.created_at)}
                          {m.direction === "out" && (
                            <Icon name="check" size={11} className={m.status === "read" ? "text-[#53bdeb]" : ""} />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!messages.length && (
                <p className="py-10 text-center text-sm text-ink-2">No messages yet — say hello.</p>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-hairline bg-white px-3 py-2.5">
              <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
                {templates.map((t) => (
                  <button key={t.label} type="button" className="chip shrink-0" onClick={() => setDraft(t.text)}>
                    {t.label}
                  </button>
                ))}
                {mode === "demo" && (
                  <button type="button" className="chip shrink-0" onClick={simulate}>
                    <Icon name="download" size={13} />
                    Simulate reply
                  </button>
                )}
              </div>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(draft);
                }}
              >
                <textarea
                  className="input max-h-32 min-h-11 flex-1 resize-none py-2.5"
                  placeholder="Type a message"
                  value={draft}
                  rows={1}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(draft);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rausch text-white transition-colors hover:bg-rausch-700 disabled:opacity-40"
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                >
                  <Icon name="send" size={18} />
                </button>
              </form>
              {error && <p className="mt-1.5 text-[12px] text-[var(--color-bad)]">{error}</p>}
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-soft text-ink-3">
                <Icon name="whatsapp" size={26} />
              </span>
              <p className="text-[17px] font-semibold">Pick a conversation</p>
              <p className="mt-1 text-sm text-ink-2">
                Guest history and a one-tap “Book” button appear alongside every thread.
              </p>
              {mode === "demo" && (
                <div className="mt-4 inline-block">
                  <Pill tone="warn">Demo mode — nothing is sent to WhatsApp yet</Pill>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

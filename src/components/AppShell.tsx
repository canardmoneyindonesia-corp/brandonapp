"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: "dashboard" },
  { href: "/units", label: "Units", icon: "units" },
  { href: "/schedule", label: "Schedule", icon: "calendar" },
  { href: "/bookings", label: "Bookings", icon: "bookings" },
  { href: "/inbox", label: "Inbox", icon: "inbox" },
  { href: "/income", label: "Income", icon: "income" },
  { href: "/pricing", label: "Pricing", icon: "pricing" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const TABS = ["/", "/units", "/schedule", "/inbox"];
const MORE = ["/bookings", "/income", "/pricing", "/settings"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function AppShell({
  children,
  businessName,
  unread,
}: {
  children: React.ReactNode;
  businessName: string;
  unread: number;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);

  const current = NAV.find((n) => isActive(pathname, n.href));
  const moreActive = MORE.some((h) => isActive(pathname, h));

  return (
    <div className="min-h-screen">
      {/* ---------------------------------------------------- desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-hairline bg-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-6 py-6">
          <BrandMark />
          <span className="text-[17px] font-semibold tracking-tight">{businessName}</span>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-soft text-ink" : "text-ink-2 hover:bg-soft hover:text-ink"
                }`}
              >
                <Icon name={item.icon} size={20} className={active ? "text-rausch" : ""} />
                {item.label}
                {item.href === "/inbox" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-rausch px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <Link href="/bookings/new" className="btn-primary w-full">
            <Icon name="plus" size={18} />
            New booking
          </Link>
        </div>
      </aside>

      {/* ----------------------------------------------------- mobile head */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-hairline bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <BrandMark />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">
            {current?.label ?? businessName}
          </p>
          <p className="truncate text-[11px] text-ink-2">{businessName}</p>
        </div>
        <Link href="/bookings/new" className="btn-primary btn-sm">
          <Icon name="plus" size={16} />
          Book
        </Link>
      </header>

      {/* ---------------------------------------------------------- content */}
      <main className="pb-24 lg:ml-60 lg:pb-10">{children}</main>

      {/* ------------------------------------------------------ mobile tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-hairline bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TABS.map((href) => {
          const item = NAV.find((n) => n.href === href)!;
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                active ? "text-rausch" : "text-ink-2"
              }`}
            >
              <Icon name={item.icon} size={22} />
              {item.label}
              {href === "/inbox" && unread > 0 && (
                <span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-rausch px-1 text-[9px] font-bold leading-4 text-white">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
            moreActive || moreOpen ? "text-rausch" : "text-ink-2"
          }`}
        >
          <Icon name="more" size={22} />
          More
        </button>
      </nav>

      {/* --------------------------------------------------- more bottom sheet */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-hairline bg-white pb-[calc(env(safe-area-inset-bottom)+72px)] lg:hidden">
            <div className="mx-auto my-3 h-1 w-10 rounded-full bg-line" />
            {MORE.map((href) => {
              const item = NAV.find((n) => n.href === href)!;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 border-t border-hairline px-5 py-4 text-[15px] font-medium"
                >
                  <Icon name={item.icon} size={20} className="text-ink-2" />
                  {item.label}
                  <Icon name="chevronRight" size={18} className="ml-auto text-ink-3" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function BrandMark() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#ff5a5f] to-[#e0134b] text-white">
      <Icon name="home" size={19} strokeWidth={2} />
    </span>
  );
}

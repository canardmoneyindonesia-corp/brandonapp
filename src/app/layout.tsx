import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ServiceWorker from "@/components/ServiceWorker";
import { getBusiness } from "@/lib/queries";
import { one } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brandon Stays — Hourly Rentals",
  description: "Manage hourly apartment rentals: units, schedule, bookings, pricing, income and the WhatsApp inbox.",
  manifest: "/manifest.webmanifest",
  applicationName: "Brandon Stays",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Brandon Stays",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let business = { name: "Brandon Stays" };
  let unread = 0;
  try {
    business = await getBusiness();
    const row = await one<{ n: number }>(`SELECT COALESCE(SUM(unread),0)::int AS n FROM wa_contacts`);
    unread = row?.n ?? 0;
  } catch {
    // The shell still renders if the database isn't reachable yet; individual
    // pages surface the real error.
  }

  return (
    <html lang="en">
      <body>
        <AppShell businessName={business.name} unread={unread}>
          {children}
        </AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}

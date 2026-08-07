import Icon from "@/components/Icon";
import SettingsForm from "@/components/SettingsForm";
import InstallCard from "@/components/InstallCard";
import { ErrorNote, Page, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { getBusiness, getUnits } from "@/lib/queries";
import { one } from "@/lib/db";
import { whatsappMode } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const mode = whatsappMode();

  let business, units, counts;
  try {
    [business, units, counts] = await Promise.all([
      getBusiness(),
      getUnits(),
      one<{ bookings: number; payments: number; expenses: number; messages: number }>(
        `SELECT
           (SELECT COUNT(*) FROM bookings)::int  AS bookings,
           (SELECT COUNT(*) FROM payments)::int  AS payments,
           (SELECT COUNT(*) FROM expenses)::int  AS expenses,
           (SELECT COUNT(*) FROM wa_messages)::int AS messages`
      ),
    ]);
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Settings" />
        <ErrorNote title="Cannot load settings" body={(err as Error).message} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Business profile, WhatsApp connection and app install." />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <SectionTitle>Business</SectionTitle>
            <SettingsForm business={business} />
          </section>

          <section>
            <SectionTitle
              action={<Pill tone={mode === "live" ? "good" : "warn"}>{mode === "live" ? "Connected" : "Demo mode"}</Pill>}
            >
              WhatsApp
            </SectionTitle>
            <div className="panel space-y-4 text-[14px] leading-relaxed">
              <p className="text-ink-2">
                The inbox, send endpoint and Meta webhook are already built. Nothing is sent to real numbers while
                the app is in demo mode.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-ink-2 marker:font-semibold marker:text-ink">
                <li>
                  Create a Meta Business app with the WhatsApp product, then copy the{" "}
                  <b className="text-ink">phone number ID</b> and a permanent{" "}
                  <b className="text-ink">access token</b>.
                </li>
                <li>
                  Put them in <code className="rounded bg-soft px-1.5 py-0.5">.env.local</code> together with{" "}
                  <code className="rounded bg-soft px-1.5 py-0.5">WHATSAPP_MODE=live</code> and any{" "}
                  <code className="rounded bg-soft px-1.5 py-0.5">WHATSAPP_VERIFY_TOKEN</code> you like.
                </li>
                <li>
                  Expose this machine (ngrok or a deploy) and set the Meta callback URL to{" "}
                  <code className="rounded bg-soft px-1.5 py-0.5">/api/whatsapp/webhook</code>, subscribing to the{" "}
                  <b className="text-ink">messages</b> field.
                </li>
                <li>Restart the app. Inbound messages land in the inbox; replies go out over the Cloud API.</li>
              </ol>
              <div className="rounded-lg bg-soft px-4 py-3">
                <p className="text-[13px] font-semibold">Endpoints in this build</p>
                <ul className="mt-1.5 space-y-1 text-[13px] text-ink-2">
                  <li><code>GET /api/whatsapp/webhook</code> — Meta verification handshake</li>
                  <li><code>POST /api/whatsapp/webhook</code> — inbound messages and delivery receipts</li>
                  <li><code>POST /api/inbox/&lt;id&gt;/messages</code> — send a reply</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Data</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Count label="Units" value={units.length} />
              <Count label="Bookings" value={counts?.bookings ?? 0} />
              <Count label="Payments" value={counts?.payments ?? 0} />
              <Count label="Expenses" value={counts?.expenses ?? 0} />
            </div>
            <p className="mt-3 text-[13px] text-ink-2">
              Everything lives in your local PostgreSQL database. To wipe and reseed the demo data, run{" "}
              <code className="rounded bg-soft px-1.5 py-0.5">npm run db:reset</code>.
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <InstallCard />
          <div className="card p-5">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Icon name="bolt" size={18} className="text-rausch" />
              Works offline
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
              Pages you have already opened stay readable without a connection. Anything that writes — new bookings,
              payments, messages — needs the network and will tell you if it fails.
            </p>
          </div>
        </aside>
      </div>
    </Page>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-soft px-4 py-3">
      <p className="text-[12px] font-medium text-ink-2">{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold tabular">{value}</p>
    </div>
  );
}

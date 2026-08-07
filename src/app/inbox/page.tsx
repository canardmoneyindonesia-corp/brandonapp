import InboxClient from "@/components/InboxClient";
import { ErrorNote, Page, PageHeader, Pill } from "@/components/ui";
import { getBookingsForPhone, getContact, getContacts, getThread, getUnits } from "@/lib/queries";
import { whatsappMode } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const selectedId = sp.c ? Number(sp.c) : null;
  const mode = whatsappMode();

  try {
    const [contacts, units] = await Promise.all([getContacts(), getUnits()]);
    const contact = selectedId ? await getContact(selectedId) : null;
    const [messages, history] = contact
      ? await Promise.all([getThread(contact.id), getBookingsForPhone(contact.phone)])
      : [[], []];

    return (
      <Page>
        <PageHeader
          title="Inbox"
          subtitle={`${contacts.length} conversations · ${contacts.reduce((s, c) => s + c.unread, 0)} unread`}
          action={
            <Pill tone={mode === "live" ? "good" : "warn"}>
              {mode === "live" ? "WhatsApp connected" : "Demo mode"}
            </Pill>
          }
        />

        {mode === "demo" && (
          <div className="mb-4 rounded-xl border border-hairline bg-soft px-4 py-3 text-[13px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Not connected to WhatsApp yet.</span> Messages you send are
            stored locally so the workflow is real, but nothing leaves this machine. To go live, add{" "}
            <code className="rounded bg-white px-1 py-0.5">WHATSAPP_MODE=live</code>, your phone number ID and
            access token to <code className="rounded bg-white px-1 py-0.5">.env.local</code>, then point the Meta
            webhook at <code className="rounded bg-white px-1 py-0.5">/api/whatsapp/webhook</code>. The webhook and
            send endpoint are already built.
          </div>
        )}

        <InboxClient
          contacts={contacts}
          contact={contact}
          messages={messages}
          history={history}
          units={units}
          mode={mode}
        />
      </Page>
    );
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Inbox" />
        <ErrorNote title="Cannot load the inbox" body={(err as Error).message} />
      </Page>
    );
  }
}

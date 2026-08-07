import Icon from "@/components/Icon";
import { Page } from "@/components/ui";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <Page>
      <div className="mx-auto max-w-md py-20 text-center">
        <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-soft text-ink-3">
          <Icon name="wifi" size={28} />
        </span>
        <h1 className="text-[24px] font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Screens you already opened still work. New bookings, payments and messages need a connection — reconnect
          and try again.
        </p>
        <a href="/" className="btn-primary mt-6">
          <Icon name="refresh" size={17} />
          Retry
        </a>
      </div>
    </Page>
  );
}

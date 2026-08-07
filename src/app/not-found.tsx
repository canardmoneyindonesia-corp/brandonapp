import Link from "next/link";
import Icon from "@/components/Icon";
import { Page } from "@/components/ui";

export default function NotFound() {
  return (
    <Page>
      <div className="mx-auto max-w-md py-20 text-center">
        <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-soft text-ink-3">
          <Icon name="search" size={28} />
        </span>
        <h1 className="text-[24px] font-semibold tracking-tight">Nothing here</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          That unit, booking or page doesn&apos;t exist — it may have been deleted.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Back to Today
        </Link>
      </div>
    </Page>
  );
}

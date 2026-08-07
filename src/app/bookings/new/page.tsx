import Link from "next/link";
import BookingForm from "@/components/BookingForm";
import { EmptyState, ErrorNote, Page, PageHeader } from "@/components/ui";
import { getUnits } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string; date?: string; guest?: string; phone?: string }>;
}) {
  const sp = await searchParams;

  let units;
  try {
    units = await getUnits();
  } catch (err) {
    return (
      <Page>
        <PageHeader title="New booking" />
        <ErrorNote title="Cannot load units" body={(err as Error).message} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="New booking"
        subtitle="The price updates as you type — weekend, night and duration rules are applied automatically."
        back={{ href: "/bookings", label: "Bookings" }}
      />
      {units.length ? (
        <BookingForm
          units={units}
          unitHint={sp.unit ? Number(sp.unit) : undefined}
          dateHint={sp.date}
          guestHint={sp.guest}
          phoneHint={sp.phone}
        />
      ) : (
        <EmptyState
          icon="units"
          title="Add a unit first"
          body="Bookings need somewhere to happen."
          action={
            <Link href="/units/new" className="btn-primary">
              Add a unit
            </Link>
          }
        />
      )}
    </Page>
  );
}

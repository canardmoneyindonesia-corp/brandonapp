import Link from "next/link";
import Icon from "@/components/Icon";
import UnitCard from "@/components/UnitCard";
import { EmptyState, ErrorNote, Page, PageHeader } from "@/components/ui";
import { getUnits } from "@/lib/queries";
import { idr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  let units;
  try {
    units = await getUnits();
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Units" />
        <ErrorNote title="Cannot load units" body={(err as Error).message} />
      </Page>
    );
  }

  const active = units.filter((u) => u.status === "active");
  const avgRate = active.length
    ? Math.round(active.reduce((s, u) => s + u.base_rate, 0) / active.length)
    : 0;

  return (
    <Page>
      <PageHeader
        title="Units"
        subtitle={
          units.length
            ? `${active.length} active · average ${idr(avgRate)} per hour`
            : "Add your first apartment to start taking hourly bookings"
        }
        action={
          <Link href="/units/new" className="btn-primary">
            <Icon name="plus" size={17} />
            Add unit
          </Link>
        }
      />

      {units.length ? (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <UnitCard key={u.id} unit={u} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="units"
          title="No units yet"
          body="A unit holds the photos, capacity, base hourly rate and minimum booking length that everything else prices against."
          action={
            <Link href="/units/new" className="btn-primary">
              <Icon name="plus" size={17} />
              Add your first unit
            </Link>
          }
        />
      )}
    </Page>
  );
}

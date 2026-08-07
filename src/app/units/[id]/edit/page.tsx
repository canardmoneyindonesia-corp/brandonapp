import { notFound } from "next/navigation";
import UnitForm from "@/components/UnitForm";
import { Page, PageHeader } from "@/components/ui";
import { getUnit } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const unit = await getUnit(id);
  if (!unit) notFound();

  return (
    <Page>
      <PageHeader
        title={`Edit ${unit.name}`}
        back={{ href: `/units/${unit.id}`, label: unit.name }}
      />
      <UnitForm unit={unit} />
    </Page>
  );
}

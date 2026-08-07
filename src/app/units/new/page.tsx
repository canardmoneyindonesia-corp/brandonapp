import UnitForm from "@/components/UnitForm";
import { Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function NewUnitPage() {
  return (
    <Page>
      <PageHeader
        title="Add a unit"
        subtitle="Photos can be uploaded once the unit exists."
        back={{ href: "/units", label: "Units" }}
      />
      <UnitForm />
    </Page>
  );
}

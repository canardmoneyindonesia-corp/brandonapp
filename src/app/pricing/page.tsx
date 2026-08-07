import PricingClient from "@/components/PricingClient";
import { ErrorNote, Page, PageHeader } from "@/components/ui";
import { getPricingRules, getUnits } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  try {
    const [rules, units] = await Promise.all([getPricingRules(), getUnits()]);
    return (
      <Page>
        <PageHeader
          title="Pricing"
          subtitle="Rules stack on top of each unit's base hourly rate. Order is set by priority, lowest first."
        />
        <PricingClient rules={rules} units={units} />
      </Page>
    );
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Pricing" />
        <ErrorNote title="Cannot load pricing rules" body={(err as Error).message} />
      </Page>
    );
  }
}

import Link from "next/link";
import Icon from "@/components/Icon";
import RevenueChart from "@/components/RevenueChart";
import ExpenseForm from "@/components/ExpenseForm";
import DangerButton from "@/components/DangerButton";
import { ErrorNote, Page, PageHeader, SectionTitle, StatTile } from "@/components/ui";
import { getIncome, getUnits } from "@/lib/queries";
import { fmtDate, fmtMonth, idr, startOfMonth, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

function parseMonth(v: string | undefined): Date {
  if (!v) return startOfMonth();
  const d = new Date(`${v}-01T00:00:00`);
  return Number.isNaN(d.getTime()) ? startOfMonth() : d;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default async function IncomePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const month = parseMonth(sp.m);

  let report, units;
  try {
    [report, units] = await Promise.all([getIncome(month), getUnits()]);
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Income" />
        <ErrorNote title="Cannot load the income report" body={(err as Error).message} />
      </Page>
    );
  }

  const net = report.revenue - report.expenses;
  const margin = report.revenue > 0 ? (net / report.revenue) * 100 : 0;
  const deltaPct =
    report.prevRevenue > 0 ? ((report.revenue - report.prevRevenue) / report.prevRevenue) * 100 : null;
  const avgPerHour = report.hours > 0 ? report.revenue / report.hours : 0;

  const prev = new Date(month);
  prev.setMonth(prev.getMonth() - 1);
  const next = new Date(month);
  next.setMonth(next.getMonth() + 1);
  const isCurrent = monthKey(month) === monthKey(new Date());

  const maxCategory = Math.max(1, ...report.byCategory.map((c) => Number(c.amount)));
  const maxUnitRevenue = Math.max(1, ...report.byUnit.map((u) => Number(u.revenue)));

  return (
    <Page>
      <PageHeader
        title="Income"
        subtitle={`${fmtMonth(month)} · ${report.bookings} bookings · ${report.hours}h sold`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/income?m=${monthKey(prev)}`} className="icon-btn" aria-label="Previous month">
              <Icon name="chevronLeft" size={16} />
            </Link>
            <span className="min-w-32 text-center text-[14px] font-semibold">{fmtMonth(month)}</span>
            <Link
              href={`/income?m=${monthKey(next)}`}
              className={`icon-btn ${isCurrent ? "pointer-events-none opacity-40" : ""}`}
              aria-label="Next month"
            >
              <Icon name="chevronRight" size={16} />
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Revenue"
          value={idr(report.revenue)}
          delta={deltaPct !== null ? { pct: deltaPct, label: "vs last month" } : null}
          sub="vs last month"
          icon="income"
        />
        <StatTile label="Expenses" value={idr(report.expenses)} sub="all categories" icon="wallet" />
        <StatTile label="Net profit" value={idr(net)} sub={`${margin.toFixed(0)}% margin`} icon="bolt" />
        <StatTile
          label="Cash collected"
          value={idr(report.collected)}
          sub={`${report.byMethod.reduce((s, m) => s + m.count, 0)} payments logged`}
          icon="check"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Average per hour" value={idr(Math.round(avgPerHour))} />
        <MiniStat
          label="Average per booking"
          value={idr(report.bookings ? Math.round(report.revenue / report.bookings) : 0)}
        />
        <MiniStat label="Hours sold" value={`${report.hours}h`} />
        <MiniStat label="Bookings" value={String(report.bookings)} />
      </div>

      <section className="mt-8">
        <RevenueChart daily={report.daily} />
      </section>

      <section className="mt-8">
        <SectionTitle>By unit</SectionTitle>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[620px] text-[14px]">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-2">
                <th className="px-4 py-2.5 font-medium">Unit</th>
                <th className="px-4 py-2.5 text-right font-medium">Bookings</th>
                <th className="px-4 py-2.5 text-right font-medium">Hours</th>
                <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                <th className="px-4 py-2.5 text-right font-medium">Expenses</th>
                <th className="px-4 py-2.5 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {report.byUnit.map((u) => (
                <tr key={u.unit_id}>
                  <td className="px-4 py-3">
                    <Link href={`/units/${u.unit_id}`} className="font-medium hover:underline">
                      {u.unit_name}
                    </Link>
                    <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-soft">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(Number(u.revenue) / maxUnitRevenue) * 100}%`,
                          background: "var(--color-series-1)",
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{u.bookings}</td>
                  <td className="px-4 py-3 text-right tabular">{u.hours}h</td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{idr(u.revenue)}</td>
                  <td className="px-4 py-3 text-right tabular text-ink-2">{idr(u.expenses)}</td>
                  <td className="px-4 py-3 text-right tabular">{idr(Number(u.revenue) - Number(u.expenses))}</td>
                </tr>
              ))}
              {!report.byUnit.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-2">
                    No units yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Where the money went</SectionTitle>
          <div className="card p-5">
            {report.byCategory.length ? (
              <ul className="space-y-3.5">
                {report.byCategory.map((c) => (
                  <li key={c.category}>
                    <div className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span>{titleCase(c.category)}</span>
                      <span className="font-semibold tabular">{idr(c.amount)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-soft">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(Number(c.amount) / maxCategory) * 100}%`,
                          background: "var(--color-series-2)",
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-ink-2">No expenses recorded this month.</p>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>How guests paid</SectionTitle>
          <div className="card p-5">
            {report.byMethod.length ? (
              <ul className="divide-y divide-[var(--color-hairline)]">
                {report.byMethod.map((m) => (
                  <li key={m.method} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                    <span className="inline-flex items-center gap-2">
                      <Icon name="wallet" size={16} className="text-ink-2" />
                      {titleCase(m.method)}
                      <span className="text-[12px] text-ink-2">· {m.count} payment{m.count === 1 ? "" : "s"}</span>
                    </span>
                    <span className="font-semibold tabular">{idr(m.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-ink-2">No payments received this month.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Log an expense</SectionTitle>
          <div className="card p-5">
            <ExpenseForm units={units} />
          </div>
        </section>

        <section>
          <SectionTitle>Recent expenses</SectionTitle>
          <div className="card divide-hair max-h-[420px] overflow-y-auto">
            {report.recentExpenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold tabular">{idr(e.amount)}</p>
                  <p className="truncate text-[12px] text-ink-2">
                    {titleCase(e.category)} · {fmtDate(`${e.incurred_on}T00:00:00`)}
                    {e.unit_name ? ` · ${e.unit_name}` : " · business-wide"}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <DangerButton
                  url={`/api/expenses/${e.id}`}
                  confirmText={`Delete this ${idr(e.amount)} expense?`}
                  label="Delete"
                  className="btn btn-sm border border-line bg-white text-ink-2 hover:bg-soft"
                />
              </div>
            ))}
            {!report.recentExpenses.length && (
              <p className="px-4 py-10 text-center text-sm text-ink-2">Nothing logged this month.</p>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-soft px-4 py-3">
      <p className="text-[12px] font-medium text-ink-2">{label}</p>
      <p className="mt-0.5 text-[17px] font-semibold tabular">{value}</p>
    </div>
  );
}

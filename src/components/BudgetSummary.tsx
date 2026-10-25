import { chf, type BudgetTotals } from '@/lib/portfolio'

// Stat tiles, not a chart: four headline numbers
export function BudgetSummary({ t }: { t: BudgetTotals }) {
  const tiles = [
    { label: 'Bewilligt', value: t.approved },
    { label: 'Verbraucht (Ist)', value: t.spent },
    { label: 'Rest bewilligt', value: t.rest },
    { label: 'Noch nicht bewilligt', value: t.notApproved },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((x) => (
        <div key={x.label} className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-600">{x.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{chf(x.value)}</p>
        </div>
      ))}
    </div>
  )
}

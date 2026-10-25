import { chf, type BudgetTotals } from '@/lib/portfolio'

// Four headline numbers on the navy band
export function BudgetSummary({ t }: { t: BudgetTotals }) {
  const tiles = [
    { label: 'Bewilligt', value: t.approved, accent: false },
    { label: 'Verbraucht (Ist)', value: t.spent, accent: false },
    { label: 'Rest bewilligt', value: t.rest, accent: false },
    { label: 'Noch nicht bewilligt', value: t.notApproved, accent: true },
  ]
  return (
    <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
      {tiles.map((x) => (
        <div key={x.label} className="flex flex-col gap-2.5 rounded-xl border border-mono-tile-line bg-mono-tile px-8 py-[26px]">
          <span className="text-sm text-mono-muted-dark">{x.label}</span>
          <span className={`text-4xl leading-[1.05] font-bold tabular-nums ${x.accent ? 'text-mono-accent-dark' : 'text-mono-bg'}`}>{chf(x.value)}</span>
        </div>
      ))}
    </div>
  )
}

import { Info } from 'lucide-react'
import { chf, type BudgetTotals } from '@/lib/portfolio'

// Four headline numbers on the navy band, each explained by a tooltip
export function BudgetSummary({ t }: { t: BudgetTotals }) {
  const tiles = [
    { label: 'Bewilligtes Budget', value: t.approved, accent: false, tip: 'Summe der Budgets aller Initiativen mit Budget-Status «Bewilligt».' },
    { label: 'Davon verrechnet', value: t.spent, accent: false, tip: 'Bisher verrechnete Kosten (Ist) der bewilligten Initiativen.' },
    { label: 'Noch verfügbar', value: t.rest, accent: false, tip: 'Bewilligtes Budget minus verrechnet: so viel ist von den bewilligten Mitteln noch übrig.' },
    { label: 'Beantragt oder Platzhalter', value: t.notApproved, accent: true, tip: 'Summe der Budgets, die noch nicht bewilligt sind (Status «Beantragt» oder «Platzhalter»).' },
  ]
  return (
    <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
      {tiles.map((x) => (
        <div key={x.label} className="flex flex-col gap-2.5 rounded-xl border border-mono-tile-line bg-mono-tile px-8 py-[26px]">
          <span className="group relative inline-flex items-center gap-2 self-start text-sm text-mono-muted-dark">
            {x.label}
            <button
              type="button"
              aria-label={`${x.label}: ${x.tip}`}
              className="inline-flex cursor-help rounded-full text-mono-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mono-accent-dark"
            >
              <Info className="size-4" aria-hidden />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full left-0 z-10 mt-2 hidden w-64 rounded-xl border border-mono-tile-line bg-mono-ink px-4 py-3 text-sm leading-[1.4] text-mono-bg group-focus-within:block group-hover:block"
            >
              {x.tip}
            </span>
          </span>
          <span className={`text-4xl leading-[1.05] font-bold tabular-nums ${x.accent ? 'text-mono-accent-dark' : 'text-mono-bg'}`}>{chf(x.value)}</span>
        </div>
      ))}
    </div>
  )
}

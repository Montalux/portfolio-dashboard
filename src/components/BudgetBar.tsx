import { chf, type Initiative } from '@/lib/portfolio'

// Spent (solid), forecast (light), budget (marker)
export function BudgetBar({ i, thin }: { i: Initiative; thin?: boolean }) {
  const budget = Number(i.budget_chf ?? 0)
  const spent = Number(i.actual_chf ?? 0)
  const forecast = Number(i.forecast_chf ?? 0)
  const max = Math.max(budget, spent, forecast)

  if (max === 0) return <p className="m-0 text-sm text-mono-muted">Kein Budget erfasst</p>

  const pct = (v: number) => `${(v / max) * 100}%`
  const over = budget > 0 && forecast > budget
  const title = `Budget ${chf(budget)}, Ist ${chf(i.actual_chf)}, Prognose ${chf(i.forecast_chf)}`
  const h = thin ? 10 : 12
  const mw = thin ? 2 : 3

  return (
    <div title={title}>
      <div className="relative rounded-md bg-mono-track" style={{ height: h }}>
        {forecast > 0 && <div className="absolute inset-y-0 left-0 rounded-md bg-mono-done" style={{ width: pct(forecast) }} />}
        {spent > 0 && <div className="absolute inset-y-0 left-0 rounded-md bg-mono-accent" style={{ width: pct(spent) }} />}
        {budget > 0 && (
          <div className="absolute bg-mono-ink" style={{ top: -3, height: h + 6, width: mw, left: `calc(${pct(budget)} - ${mw}px)` }} />
        )}
      </div>
      <div className="mt-2 flex justify-between gap-3 text-sm text-mono-muted">
        <span className="whitespace-nowrap">Ist {chf(i.actual_chf)}</span>
        <span className={`text-right ${over ? 'font-medium text-mono-ink' : ''}`}>
          Prognose {chf(i.forecast_chf)} / Budget {chf(i.budget_chf)}
          {over && ` (+${Math.round(((forecast - budget) / budget) * 100)} %)`}
        </span>
      </div>
    </div>
  )
}

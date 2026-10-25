import { chf, type Initiative } from '@/lib/portfolio'

// Single-series bar: spent (solid), forecast (light), budget (tick)
export function BudgetBar({ i }: { i: Initiative }) {
  const budget = Number(i.budget_chf ?? 0)
  const spent = Number(i.actual_chf ?? 0)
  const forecast = Number(i.forecast_chf ?? 0)
  const max = Math.max(budget, spent, forecast)

  if (max === 0) return <p className="text-xs text-neutral-500">Kein Budget erfasst</p>

  const pct = (v: number) => `${(v / max) * 100}%`
  const over = budget > 0 && forecast > budget
  const title = `Budget ${chf(budget)}, Ist ${chf(i.actual_chf)}, Prognose ${chf(i.forecast_chf)}`

  return (
    <div title={title}>
      <div className="relative h-2.5 rounded-full bg-neutral-100">
        {forecast > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-[#2a78d6]/30" style={{ width: pct(forecast) }} />}
        {spent > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-[#2a78d6]" style={{ width: pct(spent) }} />}
        {budget > 0 && (
          <div className="absolute -inset-y-1 w-0.5 rounded bg-neutral-800" style={{ left: `calc(${pct(budget)} - 1px)` }} />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-neutral-600">
        <span>Ist {chf(i.actual_chf)}</span>
        <span className={over ? 'font-medium text-neutral-900' : ''}>
          Prognose {chf(i.forecast_chf)} / Budget {chf(i.budget_chf)}
          {over && ` (+${Math.round(((forecast - budget) / budget) * 100)} %)`}
        </span>
      </div>
    </div>
  )
}

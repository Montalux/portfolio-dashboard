import { Link } from 'react-router-dom'
import { fmtDate, parseDate, today, type Initiative, type Milestone } from '@/lib/portfolio'

const LABEL_W = 260
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export function Timeline({ items, milestones }: { items: Initiative[]; milestones: Milestone[] }) {
  if (items.length === 0) return <p className="m-0 text-base text-mono-muted">Keine Initiativen mit Start und Due date.</p>

  const now = today()

  // Range: whole months around all bars and today
  const dates = items.flatMap((i) => [parseDate(i.start_date)!, parseDate(i.due_date)!]).concat(now)
  const min = new Date(Math.min(...dates.map((d) => d.getTime())))
  const max = new Date(Math.max(...dates.map((d) => d.getTime())))
  const start = new Date(min.getFullYear(), min.getMonth(), 1)
  const end = new Date(max.getFullYear(), max.getMonth() + 1, 1)
  const pct = (d: Date) => ((d.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100

  const months: Date[] = []
  for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d)
  const step = months.length > 18 ? 3 : 1
  const monthLabel = (m: Date, idx: number) => `${MONTHS[m.getMonth()]}${idx === 0 || m.getMonth() === 0 ? ` ${String(m.getFullYear()).slice(2)}` : ''}`

  return (
    <div className="overflow-x-auto rounded-xl border border-mono-line bg-white px-8 pt-8 pb-6">
      <div className="min-w-[900px]">
        <div className="flex">
          <div className="shrink-0" style={{ width: LABEL_W }} />
          <div className="relative h-7 flex-1">
            {months.map((m, idx) =>
              idx % step === 0 ? (
                <span key={m.toISOString()} className="absolute top-0 pl-1 text-xs whitespace-nowrap text-mono-muted" style={{ left: `${pct(m)}%` }}>
                  {monthLabel(m, idx)}
                </span>
              ) : null,
            )}
          </div>
        </div>

        <div className="relative pb-[26px]">
          <div className="pointer-events-none absolute top-0 right-0 bottom-0" style={{ left: LABEL_W }}>
            {months.map((m) => (
              <div key={m.toISOString()} className="absolute top-0 bottom-0 w-px bg-mono-rule" style={{ left: `${pct(m)}%` }} />
            ))}
            <div className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-mono-ink" style={{ left: `${pct(now)}%` }} />
            <span className="absolute -bottom-[22px] pl-1 text-xs font-bold" style={{ left: `${pct(now)}%` }}>Heute</span>
          </div>

          {items.map((i) => {
            const s = parseDate(i.start_date)!
            const d = parseDate(i.due_date)!
            const done = i.status === 'abgeschlossen' || i.status === 'abgebrochen'
            const left = pct(s)
            const width = Math.max(pct(d) - left, 0.3)
            return (
              <Link
                key={i.id}
                to={`/initiative/${i.key}`}
                className="group relative flex h-8 items-center text-inherit no-underline focus-visible:outline-2 focus-visible:outline-mono-accent"
                title={`${i.key} ${i.title}: ${fmtDate(s)} bis ${fmtDate(d)}`}
              >
                <div
                  className={`box-border shrink-0 overflow-hidden pr-3 text-[13px] text-ellipsis whitespace-nowrap underline-offset-4 group-hover:underline ${done ? 'text-mono-muted' : 'text-mono-ink'}`}
                  style={{ width: LABEL_W }}
                >
                  <span className="font-bold">{i.key}</span> {i.title}
                </div>
                <div className="relative h-8 flex-1">
                  <div className={`absolute top-2 h-4 rounded-lg ${done ? 'bg-mono-done' : 'bg-mono-accent'}`} style={{ left: `${left}%`, width: `${width}%` }} />
                  {milestones
                    .filter((m) => m.initiative_id === i.id)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="absolute top-3 size-2 rounded-full bg-rag-yellow"
                        style={{ left: `calc(${pct(parseDate(m.due_date)!)}% - 4px)` }}
                        title={`${m.title}: ${fmtDate(m.due_date)}`}
                      />
                    ))}
                </div>
              </Link>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 text-[13px] text-mono-muted">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-[22px] rounded-[5px] bg-mono-accent" />Aktiv</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-[22px] rounded-[5px] bg-mono-done" />Abgeschlossen</span>
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-rag-yellow" />Meilenstein</span>
        </div>
      </div>
    </div>
  )
}

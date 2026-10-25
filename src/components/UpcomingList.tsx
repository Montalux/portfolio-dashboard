import { fmtDate, type UpcomingItem } from '@/lib/portfolio'

const KIND = { start: 'Start', due: 'Ende', milestone: 'Meilenstein', epic: 'Epic' }

export function UpcomingList({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) return <p className="m-0 text-base text-mono-muted">Keine Termine in den nächsten 8 Wochen.</p>
  return (
    <ul className="m-0 list-none overflow-hidden rounded-xl border border-mono-line bg-white p-0">
      {items.map((x, idx) => (
        <li key={idx} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-mono-rule px-8 py-5 text-base last:border-b-0">
          <span className="w-28 font-bold tabular-nums">{fmtDate(x.date)}</span>
          <span className="w-28 text-mono-muted">{KIND[x.kind]}</span>
          <span className="flex-[1_1_240px] font-medium">
            {x.initiative.title}
            {(x.kind === 'milestone' || x.kind === 'epic') && <span className="font-normal text-mono-muted">: {x.label}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

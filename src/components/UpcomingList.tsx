import { fmtDate, type UpcomingItem } from '@/lib/portfolio'

const KIND = { start: 'Start', due: 'Ende', milestone: 'Meilenstein', epic: 'Epic' }

export function UpcomingList({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) return <p className="text-sm text-neutral-500">Keine Termine in den nächsten 8 Wochen.</p>
  return (
    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
      {items.map((x, idx) => (
        <li key={idx} className="flex gap-4 px-4 py-2.5 text-sm">
          <span className="w-24 shrink-0 tabular-nums text-neutral-600">{fmtDate(x.date)}</span>
          <span className="w-24 shrink-0 text-neutral-500">{KIND[x.kind]}</span>
          <span className="min-w-0">
            <span className="font-medium">{x.initiative.title}</span>
            {(x.kind === 'milestone' || x.kind === 'epic') && <span className="text-neutral-600">: {x.label}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

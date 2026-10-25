import { CircleAlert, CircleCheck, CircleDashed, Clock, TriangleAlert } from 'lucide-react'
import type { RagState } from '@/lib/portfolio'

// Status colors are reserved for RAG and always paired with icon + label
const CONFIG: Record<RagState, { label: string; dot: string; Icon: typeof CircleCheck }> = {
  rot: { label: 'Rot', dot: 'bg-[#d03b3b]', Icon: CircleAlert },
  gelb: { label: 'Gelb', dot: 'bg-[#fab219]', Icon: TriangleAlert },
  gruen: { label: 'Grün', dot: 'bg-[#0ca30c]', Icon: CircleCheck },
  veraltet: { label: 'Veraltet', dot: 'bg-neutral-400', Icon: Clock },
  offen: { label: 'Kein Status', dot: 'bg-neutral-300', Icon: CircleDashed },
}

export function RagBadge({ state, size = 'sm' }: { state: RagState; size?: 'sm' | 'lg' }) {
  const { label, dot, Icon } = CONFIG[state]
  const big = size === 'lg'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white font-medium text-neutral-800 ${big ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}
    >
      <span className={`inline-flex items-center justify-center rounded-full text-white ${dot} ${big ? 'size-5' : 'size-4'}`}>
        <Icon className={big ? 'size-3.5' : 'size-3'} strokeWidth={2.5} aria-hidden />
      </span>
      {label}
    </span>
  )
}

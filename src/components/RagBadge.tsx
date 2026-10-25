import type { RagState } from '@/lib/portfolio'

// The traffic light is the only signal color: a filled circle without text, named for screen readers
const CONFIG: Record<RagState, { label: string; bg: string }> = {
  rot: { label: 'Rot', bg: 'bg-rag-red' },
  gelb: { label: 'Gelb', bg: 'bg-rag-yellow' },
  gruen: { label: 'Grün', bg: 'bg-rag-green' },
  veraltet: { label: 'Veraltet', bg: 'bg-rag-none' },
  offen: { label: 'Kein Status', bg: 'bg-rag-none' },
}

export function RagBadge({ state, size = 20 }: { state: RagState; size?: 20 | 22 | 24 }) {
  const { label, bg } = CONFIG[state]
  return (
    <span role="img" aria-label={label} className={`inline-block shrink-0 rounded-full ${bg}`} style={{ width: size, height: size }} />
  )
}

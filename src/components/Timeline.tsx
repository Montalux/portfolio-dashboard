import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtDate, parseDate, ragState, today, type Initiative, type JiraLink, type Milestone, type RagState } from '@/lib/portfolio'

const ROW = 30
const BAR = 14
const AXIS = 28
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const RAG_LABEL: Record<RagState, string> = { rot: 'Rot', gelb: 'Gelb', gruen: 'Grün', veraltet: 'Veraltet', offen: 'Kein Status' }

type Tip = { x: number; y: number; lines: string[] }

export function Timeline({ items, milestones, links }: { items: Initiative[]; milestones: Milestone[]; links: JiraLink[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)
  const [tip, setTip] = useState<Tip | null>(null)
  const navigate = useNavigate()

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (items.length === 0) return <p className="text-sm text-neutral-500">Keine Initiativen mit Start und Due date.</p>

  const now = today()
  const label = width < 640 ? 110 : 240
  const plotW = Math.max(width - label - 8, 100)

  // Range: whole months around all bars and today
  const dates = items.flatMap((i) => [parseDate(i.start_date)!, parseDate(i.due_date)!]).concat(now)
  const min = new Date(Math.min(...dates.map((d) => d.getTime())))
  const max = new Date(Math.max(...dates.map((d) => d.getTime())))
  const start = new Date(min.getFullYear(), min.getMonth(), 1)
  const end = new Date(max.getFullYear(), max.getMonth() + 1, 1)
  const x = (d: Date) => label + ((d.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * plotW

  const months: Date[] = []
  for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d)
  const monthStep = plotW / months.length < 34 ? 3 : 1

  const height = AXIS + items.length * ROW + 8

  const show = (e: React.MouseEvent, lines: string[]) => {
    const box = wrap.current!.getBoundingClientRect()
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, lines })
  }

  return (
    <div ref={wrap} className="relative rounded-xl border border-neutral-200 bg-white p-2" onMouseLeave={() => setTip(null)}>
      <svg width={width - 16} height={height} role="img" aria-label="Timeline der Initiativen">
        {/* month grid */}
        {months.map((m, idx) => (
          <g key={m.toISOString()}>
            <line x1={x(m)} x2={x(m)} y1={AXIS - 6} y2={height} stroke="#e7e6e2" strokeWidth={1} />
            {idx % monthStep === 0 && (
              <text x={x(m) + 4} y={AXIS - 12} fontSize={11} fill="#52514e">
                {MONTHS[m.getMonth()]}{m.getMonth() === 0 || idx === 0 ? ` ${String(m.getFullYear()).slice(2)}` : ''}
              </text>
            )}
          </g>
        ))}

        {items.map((i, row) => {
          const y = AXIS + row * ROW
          const s = parseDate(i.start_date)!
          const d = parseDate(i.due_date)!
          const done = i.status === 'abgeschlossen' || i.status === 'abgebrochen'
          const state = ragState(i)
          const x1 = x(s)
          const x2 = Math.max(x(d), x1 + 4)
          const ms = milestones.filter((m) => m.initiative_id === i.id)
          const epics = links.filter((l) => l.initiative_id === i.id && l.kind === 'epic' && l.due_date)
          return (
            <g key={i.id} className="cursor-pointer" onClick={() => navigate(`/initiative/${i.key}`)}>
              <text x={0} y={y + ROW / 2 + 4} fontSize={12} fill={done ? '#8a8984' : '#0b0b0b'}>
                <tspan fontWeight={600}>{i.key}</tspan>
                {width >= 640 && <tspan dx={6}>{truncate(i.title, 26)}</tspan>}
              </text>
              <rect
                x={x1}
                y={y + (ROW - BAR) / 2}
                width={x2 - x1}
                height={BAR}
                rx={4}
                fill={done ? '#d6d5cf' : '#2a78d6'}
                onMouseMove={(e) =>
                  show(e, [
                    `${i.key} ${i.title}`,
                    `${fmtDate(s)} bis ${fmtDate(d)}`,
                    done ? 'Abgeschlossen' : `Status: ${RAG_LABEL[state]}`,
                  ])
                }
              />
              {/* RAG marker before the bar start, so it never collides with epic or milestone marks */}
              {!done && (state === 'rot' || state === 'gelb') && (
                <circle cx={x1 - 9} cy={y + ROW / 2} r={4} fill={state === 'rot' ? '#d03b3b' : '#fab219'} stroke="#fff" strokeWidth={2} />
              )}
              {ms.map((m) => {
                const mx = x(parseDate(m.due_date)!)
                const cy = y + ROW / 2
                return (
                  <path
                    key={m.id}
                    d={`M${mx} ${cy - 6} L${mx + 6} ${cy} L${mx} ${cy + 6} L${mx - 6} ${cy} Z`}
                    fill={m.done ? '#8a8984' : '#0b0b0b'}
                    stroke="#fff"
                    strokeWidth={2}
                    onMouseMove={(e) => show(e, [m.title, fmtDate(m.due_date), m.done ? 'Erledigt' : 'Offen'])}
                  />
                )
              })}
              {epics.map((l) => {
                const ex = x(parseDate(l.due_date)!)
                const cy = y + ROW / 2
                return (
                  <rect
                    key={l.id}
                    x={ex - 4}
                    y={cy - 4}
                    width={8}
                    height={8}
                    rx={2}
                    fill="#fff"
                    stroke="#0b0b0b"
                    strokeWidth={2}
                    onMouseMove={(e) => show(e, [`${l.issue_key} ${l.summary ?? ''}`, `Ende ${fmtDate(l.due_date)}`, l.status ?? ''])}
                  />
                )
              })}
            </g>
          )
        })}

        {/* today */}
        <line x1={x(now)} x2={x(now)} y1={AXIS - 6} y2={height} stroke="#d03b3b" strokeWidth={1.5} strokeDasharray="3 3" />
        <text x={x(now) + 4} y={height - 4} fontSize={10} fill="#52514e">Heute</text>
      </svg>

      <div className="flex flex-wrap gap-4 px-2 pb-1 pt-2 text-xs text-neutral-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded bg-[#2a78d6]" />Aktiv</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded bg-[#d6d5cf]" />Abgeschlossen</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rotate-45 bg-[#0b0b0b]" />Meilenstein</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border-2 border-[#0b0b0b]" />Epic-Ende</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#d03b3b]" /><span className="size-2.5 rounded-full bg-[#fab219]" />Rot / Gelb</span>
      </div>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: Math.min(tip.x + 12, width - 220), top: tip.y + 12 }}
        >
          {tip.lines.filter(Boolean).map((l, idx) => (
            <p key={idx} className={idx === 0 ? 'font-medium' : 'text-neutral-600'}>{l}</p>
          ))}
        </div>
      )}
    </div>
  )
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

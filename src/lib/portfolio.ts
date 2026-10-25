import type { Tables } from './database.types'

export type Initiative = Tables<'initiative'>
export type Milestone = Tables<'milestone'>
export type JiraLink = Tables<'jira_link'>

// Display state of the traffic light. "veraltet" = not updated for 14 days, "offen" = never set.
export type RagState = 'rot' | 'gelb' | 'gruen' | 'veraltet' | 'offen'

export const STALE_DAYS = 14
export const UPCOMING_DAYS = 56 // 8 weeks
export const DONE_VISIBLE_DAYS = 92 // done initiatives stay visible (grey) for ~3 months

const DAY = 24 * 60 * 60 * 1000

export const today = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const parseDate = (s: string | null) => (s ? new Date(`${s}T00:00:00`) : null)
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY)

export const isActive = (i: Initiative) => i.status === 'laufend' || i.status === 'geplant'

export function ragState(i: Initiative, now = today()): RagState {
  if (!i.rag) return 'offen'
  if (i.rag_updated_at && daysBetween(new Date(i.rag_updated_at), now) > STALE_DAYS) return 'veraltet'
  return i.rag
}

const RAG_ORDER: Record<RagState, number> = { rot: 0, gelb: 1, veraltet: 2, offen: 3, gruen: 4 }
export const byRag = (a: Initiative, b: Initiative) =>
  RAG_ORDER[ragState(a)] - RAG_ORDER[ragState(b)] || (a.due_date ?? '').localeCompare(b.due_date ?? '')

// Worst set traffic light among running initiatives
export function portfolioRag(items: Initiative[]): RagState {
  const running = items.filter((i) => i.status === 'laufend')
  const set = running.map((i) => i.rag).filter(Boolean)
  if (set.includes('rot')) return 'rot'
  if (set.includes('gelb')) return 'gelb'
  if (set.length > 0) return 'gruen'
  return 'offen'
}

export type Warning = { kind: 'ueberfaellig' | 'epic_spaeter' | 'veraltet' | 'kein_status'; text: string }

export function warnings(i: Initiative, links: JiraLink[], now = today()): Warning[] {
  if (!isActive(i)) return []
  const out: Warning[] = []
  const due = parseDate(i.due_date)
  if (due && due < now) out.push({ kind: 'ueberfaellig', text: `Due date seit ${daysBetween(due, now)} Tagen überschritten` })
  const lateEpics = links.filter((l) => l.kind === 'epic' && l.due_date && due && parseDate(l.due_date)! > due)
  for (const l of lateEpics) out.push({ kind: 'epic_spaeter', text: `${l.issue_key} endet nach der Initiative` })
  const state = ragState(i, now)
  if (state === 'veraltet') out.push({ kind: 'veraltet', text: `Status seit über ${STALE_DAYS} Tagen nicht aktualisiert` })
  if (state === 'offen' && i.status === 'laufend') out.push({ kind: 'kein_status', text: 'Kein Status gesetzt' })
  return out
}

// Tiles: running, plus planned ones starting within the next 8 weeks
export function tileInitiatives(items: Initiative[], now = today()) {
  const horizon = new Date(now.getTime() + UPCOMING_DAYS * DAY)
  return items
    .filter((i) => i.status === 'laufend' || (i.status === 'geplant' && (parseDate(i.start_date) ?? horizon) < horizon))
    .sort(byRag)
}

export type BudgetTotals = { approved: number; spent: number; rest: number; notApproved: number }

export function budgetTotals(items: Initiative[]): BudgetTotals {
  const active = items.filter((i) => i.status !== 'abgebrochen')
  const approvedItems = active.filter((i) => i.budget_status === 'bewilligt')
  const approved = sum(approvedItems.map((i) => i.budget_chf))
  const spentApproved = sum(approvedItems.map((i) => i.actual_chf))
  return {
    approved,
    spent: sum(active.map((i) => i.actual_chf)),
    rest: approved - spentApproved,
    notApproved: sum(active.filter((i) => i.budget_status !== 'bewilligt').map((i) => i.budget_chf)),
  }
}

export type UpcomingItem = { date: Date; label: string; initiative: Initiative; kind: 'start' | 'due' | 'milestone' | 'epic' }

export function upcoming(items: Initiative[], milestones: Milestone[], links: JiraLink[], now = today()): UpcomingItem[] {
  const horizon = new Date(now.getTime() + UPCOMING_DAYS * DAY)
  const inRange = (d: Date | null): d is Date => !!d && d >= now && d <= horizon
  const byId = new Map(items.map((i) => [i.id, i]))
  const out: UpcomingItem[] = []
  for (const i of items.filter(isActive)) {
    const start = parseDate(i.start_date)
    const due = parseDate(i.due_date)
    if (i.status === 'geplant' && inRange(start)) out.push({ date: start, label: 'Start', initiative: i, kind: 'start' })
    if (inRange(due)) out.push({ date: due, label: 'Due date', initiative: i, kind: 'due' })
  }
  for (const m of milestones.filter((m) => !m.done)) {
    const i = byId.get(m.initiative_id)
    const d = parseDate(m.due_date)
    if (i && isActive(i) && inRange(d)) out.push({ date: d, label: m.title, initiative: i, kind: 'milestone' })
  }
  for (const l of links.filter((l) => l.kind === 'epic')) {
    const i = byId.get(l.initiative_id)
    const d = parseDate(l.due_date)
    if (i && isActive(i) && inRange(d)) out.push({ date: d, label: `${l.issue_key} ${l.summary ?? ''}`.trim(), initiative: i, kind: 'epic' })
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// Timeline: everything not archived, done ones only for the last ~3 months
export function timelineInitiatives(items: Initiative[], now = today()) {
  const cutoff = new Date(now.getTime() - DONE_VISIBLE_DAYS * DAY)
  return items
    .filter((i) => i.start_date && i.due_date)
    .filter((i) => isActive(i) || (parseDate(i.due_date)! >= cutoff))
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!))
}

const sum = (xs: (number | null)[]) => xs.reduce<number>((s, x) => s + Number(x ?? 0), 0)

// Swiss formatting
export const chf = (v: number | null) =>
  v === null ? '-' : `CHF ${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}`
export const fmtDate = (d: Date | string | null) => {
  const x = typeof d === 'string' ? parseDate(d) : d
  if (!x) return '-'
  return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`
}

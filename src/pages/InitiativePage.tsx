import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import { ArrowLeft, CircleHelp, ExternalLink, TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { errorText } from '@/lib/errors'
import type { Database } from '@/lib/database.types'
import { chf, fmtDate, ragState, warnings, type Initiative, type JiraLink, type Milestone } from '@/lib/portfolio'
import { Button } from '@/components/ui/button'
import { RagBadge } from '@/components/RagBadge'
import { BudgetBar } from '@/components/BudgetBar'
import { InitiativeForm } from '@/components/InitiativeForm'
import { MilestoneList, type MilestoneActions } from '@/components/MilestoneEditor'

type Update = Database['public']['Tables']['initiative']['Update']
export type LinkWithSource = JiraLink & { jira_source: { base_url: string } | null }
export type Dep = { direction: 'blocks' | 'blocked_by'; key: string; title: string }

export type DetailData = {
  initiative: Initiative
  milestones: Milestone[]
  links: LinkWithSource[]
  deps: Dep[]
}

const STATUS_LABEL = { geplant: 'Geplant', laufend: 'Laufend', abgeschlossen: 'Abgeschlossen', abgebrochen: 'Abgebrochen' }

export default function InitiativePage() {
  const { key } = useParams()
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DetailData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: i, error: e } = await supabase.from('initiative').select('*').eq('key', key!).maybeSingle()
    if (e || !i) return setError(e?.message ?? 'Initiative nicht gefunden.')
    const [m, l, out, inc] = await Promise.all([
      supabase.from('milestone').select('*').eq('initiative_id', i.id),
      supabase.from('jira_link').select('*, jira_source(base_url)').eq('initiative_id', i.id),
      supabase.from('dependency').select('other:initiative!dependency_blocks_initiative_id_fkey(key, title)').eq('initiative_id', i.id),
      supabase.from('dependency').select('other:initiative!dependency_initiative_id_fkey(key, title)').eq('blocks_initiative_id', i.id),
    ])
    type DepRow = { other: { key: string; title: string } | null }
    const deps: Dep[] = [
      ...((out.data ?? []) as unknown as DepRow[]).filter((r) => r.other).map((r) => ({ direction: 'blocks' as const, ...r.other! })),
      ...((inc.data ?? []) as unknown as DepRow[]).filter((r) => r.other).map((r) => ({ direction: 'blocked_by' as const, ...r.other! })),
    ]
    setData({ initiative: i, milestones: m.data ?? [], links: (l.data ?? []) as unknown as LinkWithSource[], deps })
  }, [key])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <Page><Back /><p className="text-sm text-red-700">{error}</p></Page>
  if (!data) return <Page><Back /><p className="text-sm text-neutral-500">Lade …</p></Page>

  const id = data.initiative.id
  const actions = {
    save: async (values: Update) => {
      const { error } = await supabase.from('initiative').update(values).eq('id', id)
      if (!error) await load()
      return errorText(error)
    },
    archive: async () => {
      const { error } = await supabase.from('initiative').update({ archived_at: new Date().toISOString() } as Update).eq('id', id)
      if (!error) navigate('/')
      return errorText(error)
    },
    milestones: {
      add: async (title: string, due: string) => {
        const { error } = await supabase.from('milestone').insert({ initiative_id: id, title, due_date: due })
        if (!error) await load()
        return errorText(error)
      },
      toggle: async (m: Milestone) => {
        const { error } = await supabase.from('milestone').update({ done: !m.done }).eq('id', m.id)
        if (!error) await load()
        return errorText(error)
      },
      remove: async (m: Milestone) => {
        const { error } = await supabase.from('milestone').delete().eq('id', m.id)
        if (!error) await load()
        return errorText(error)
      },
    },
  }

  return <InitiativeView data={data} canEdit={appUser?.role === 'pm'} actions={actions} />
}

export function InitiativeView({
  data,
  canEdit,
  actions,
}: {
  data: DetailData
  canEdit: boolean
  actions: { save: (v: Update) => Promise<string | null>; archive: () => Promise<string | null>; milestones: MilestoneActions }
}) {
  const [editing, setEditing] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const { initiative: i, milestones, links, deps } = data
  const warn = warnings(i, links)
  const epics = links.filter((l) => l.kind === 'epic')
  const jpd = links.filter((l) => l.kind === 'jpd')

  return (
    <Page>
      <Back />
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">{i.key} · {STATUS_LABEL[i.status]}</p>
          <h1 className="text-2xl font-semibold">{i.title}</h1>
          <p className="mt-1 text-sm text-neutral-600">{fmtDate(i.start_date)} bis {fmtDate(i.due_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <RagBadge state={ragState(i)} size="lg" />
          {canEdit && !editing && <Button variant="outline" onClick={() => setEditing(true)}>Bearbeiten</Button>}
        </div>
      </header>

      {editing ? (
        <InitiativeForm
          initial={i}
          onCancel={() => setEditing(false)}
          onSave={async (v) => {
            const err = await actions.save(v)
            if (!err) setEditing(false)
            return err
          }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {(i.rag_reason || warn.length > 0) && (
              <Box title="Status">
                {i.rag_reason && <p className="text-sm">{i.rag_reason}</p>}
                {i.rag_updated_at && <p className="mt-1 text-xs text-neutral-500">Aktualisiert {fmtDate(new Date(i.rag_updated_at))}</p>}
                {warn.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {warn.map((w) => (
                      <li key={w.kind + w.text} className="flex items-center gap-1.5 text-sm">
                        <TriangleAlert className="size-4 shrink-0 text-[#c27c00]" aria-hidden />{w.text}
                      </li>
                    ))}
                  </ul>
                )}
              </Box>
            )}
            {i.decision_needed && (
              <div className="flex gap-3 rounded-xl border border-neutral-300 bg-white p-4">
                <CircleHelp className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="text-xs text-neutral-500">Entscheid nötig</p>
                  <p className="font-medium">{i.decision_question}</p>
                </div>
              </div>
            )}
            <Box title="Beschreibung">
              {i.description ? (
                <div className="prose-sm space-y-2 text-sm [&_a]:text-[#2a78d6] [&_a]:underline [&_a]:break-all">
                  <Markdown>{i.description}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Keine Beschreibung.</p>
              )}
            </Box>
            <Box title="Meilensteine">
              <MilestoneList items={milestones} canEdit={canEdit} actions={actions.milestones} />
            </Box>
          </div>

          <div className="space-y-6">
            <Box title="Budget">
              <BudgetBar i={i} />
              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-neutral-600">Budget</dt><dd className="text-right tabular-nums">{chf(i.budget_chf)}</dd>
                <dt className="text-neutral-600">Status</dt><dd className="text-right capitalize">{i.budget_status}</dd>
                <dt className="text-neutral-600">Ist</dt><dd className="text-right tabular-nums">{chf(i.actual_chf)}</dd>
                <dt className="text-neutral-600">Prognose</dt><dd className="text-right tabular-nums">{chf(i.forecast_chf)}</dd>
              </dl>
            </Box>
            <Box title="Jira">
              {links.length === 0 && <p className="text-sm text-neutral-500">Keine verknüpften Items.</p>}
              {[['Epics', epics], ['Discovery (JPD)', jpd]].map(([label, list]) =>
                (list as LinkWithSource[]).length > 0 ? (
                  <div key={label as string} className="mb-3">
                    <p className="mb-1 text-xs text-neutral-500">{label as string}</p>
                    <ul className="space-y-1 text-sm">
                      {(list as LinkWithSource[]).map((l) => (
                        <li key={l.id}>
                          <a
                            className="inline-flex items-center gap-1 text-[#2a78d6] hover:underline"
                            href={l.jira_source ? `${l.jira_source.base_url}/browse/${l.issue_key}` : undefined}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {l.issue_key}<ExternalLink className="size-3" aria-hidden />
                          </a>
                          {l.summary && <span className="text-neutral-700"> {l.summary}</span>}
                          {l.status && <span className="text-neutral-500"> · {l.status}</span>}
                          {l.due_date && <span className="text-neutral-500"> · bis {fmtDate(l.due_date)}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </Box>
            {deps.length > 0 && (
              <Box title="Abhängigkeiten">
                <ul className="space-y-1 text-sm">
                  {deps.map((d) => (
                    <li key={d.direction + d.key}>
                      <span className="text-neutral-500">{d.direction === 'blocks' ? 'Blockiert ' : 'Wartet auf '}</span>
                      <Link className="text-[#2a78d6] hover:underline" to={`/initiative/${d.key}`}>{d.key}</Link> {d.title}
                    </li>
                  ))}
                </ul>
              </Box>
            )}
            {canEdit && (
              <div>
                <Button
                  variant="ghost"
                  className="text-neutral-600"
                  onClick={async () => {
                    if (window.confirm(`${i.key} archivieren? Sie verschwindet aus dem Dashboard, bleibt aber in der Datenbank.`)) {
                      setArchiveError(await actions.archive())
                    }
                  }}
                >
                  Archivieren
                </Button>
                {archiveError && <p className="text-sm text-red-700">{archiveError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  )
}

function Back() {
  return (
    <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
      <ArrowLeft className="size-4" aria-hidden /> Übersicht
    </Link>
  )
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

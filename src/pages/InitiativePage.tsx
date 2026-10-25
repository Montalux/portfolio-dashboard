import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import { TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { errorText } from '@/lib/errors'
import type { Database } from '@/lib/database.types'
import { STATUS_LABEL, chf, fmtDate, ragState, warnings, type Initiative, type Milestone } from '@/lib/portfolio'
import { Content, ErrorNote, Page, PageHeader, Panel, btnNav, btnText } from '@/components/mono'
import { RagBadge } from '@/components/RagBadge'
import { BudgetBar } from '@/components/BudgetBar'
import { MilestoneList, type MilestoneActions } from '@/components/MilestoneEditor'
import { JiraLinkList, type LinkActions, type LinkWithSource, type SourceOption } from '@/components/JiraLinkList'

type Update = Database['public']['Tables']['initiative']['Update']
export type Dep = { direction: 'blocks' | 'blocked_by'; key: string; title: string }

export type DetailData = {
  initiative: Initiative
  milestones: Milestone[]
  links: LinkWithSource[]
  deps: Dep[]
  sources: SourceOption[]
}

const BUDGET_STATUS_LABEL = { platzhalter: 'Platzhalter', beantragt: 'Beantragt', bewilligt: 'Bewilligt' }

export default function InitiativePage() {
  const { key } = useParams()
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DetailData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: i, error: e } = await supabase.from('initiative').select('*').eq('key', key!).maybeSingle()
    if (e || !i) return setError(e?.message ?? 'Initiative nicht gefunden.')
    const [m, l, out, inc, src] = await Promise.all([
      supabase.from('milestone').select('*').eq('initiative_id', i.id),
      supabase.from('jira_link').select('*, jira_source(base_url)').eq('initiative_id', i.id),
      supabase.from('dependency').select('other:initiative!dependency_blocks_initiative_id_fkey(key, title)').eq('initiative_id', i.id),
      supabase.from('dependency').select('other:initiative!dependency_initiative_id_fkey(key, title)').eq('blocks_initiative_id', i.id),
      supabase.from('jira_source').select('id, name').eq('active', true).order('name'),
    ])
    type DepRow = { other: { key: string; title: string } | null }
    const deps: Dep[] = [
      ...((out.data ?? []) as unknown as DepRow[]).filter((r) => r.other).map((r) => ({ direction: 'blocks' as const, ...r.other! })),
      ...((inc.data ?? []) as unknown as DepRow[]).filter((r) => r.other).map((r) => ({ direction: 'blocked_by' as const, ...r.other! })),
    ]
    setData({ initiative: i, milestones: m.data ?? [], links: (l.data ?? []) as unknown as LinkWithSource[], deps, sources: src.data ?? [] })
  }, [key])

  useEffect(() => {
    load()
  }, [load])

  if (error || !data) {
    return (
      <Page>
        <PageHeader back={{ to: '/', label: 'Übersicht' }} title={key ?? ''} />
        <Content>
          <p className="m-0 text-base text-mono-muted">{error ?? 'Lade …'}</p>
        </Content>
      </Page>
    )
  }

  const id = data.initiative.id
  const actions = {
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
    links: {
      sources: data.sources,
      add: async (sourceId: string, issueKey: string, kind: 'epic' | 'jpd') => {
        const { error } = await supabase.from('jira_link').insert({ initiative_id: id, source_id: sourceId, issue_key: issueKey, kind })
        if (!error) await load()
        if (error?.code === '23505') return `${issueKey} ist bereits verknüpft.`
        return errorText(error)
      },
      remove: async (l: LinkWithSource) => {
        const { error } = await supabase.from('jira_link').delete().eq('id', l.id)
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
  actions: {
    archive: () => Promise<string | null>
    milestones: MilestoneActions
    links: LinkActions
  }
}) {
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const { initiative: i, milestones, links, deps } = data
  const warn = warnings(i, links)

  return (
    <Page>
      <PageHeader
        back={{ to: '/', label: 'Übersicht' }}
        eyebrow={`${i.key} · ${STATUS_LABEL[i.status]}`}
        title={i.title}
        subtitle={`${fmtDate(i.start_date)} bis ${fmtDate(i.due_date)}`}
        right={
          <>
            <RagBadge state={ragState(i)} size={24} />
            {canEdit && <Link to={`/initiative/${i.key}/bearbeiten`} className={`${btnNav} no-underline`}>Bearbeiten</Link>}
          </>
        }
      />
      <Content>
        <div className="flex flex-wrap items-start gap-12">
          <div className="flex min-w-0 flex-[5_1_560px] flex-col gap-12">
            {(i.rag_reason || i.decision_needed || warn.length > 0) && (
              <Panel title="Status">
                {i.rag_reason && <p className="m-0 text-base leading-[1.55]">{i.rag_reason}</p>}
                {i.decision_needed && <p className="m-0 text-base leading-[1.55] font-bold">Entscheid nötig: {i.decision_question}</p>}
                {warn.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {warn.map((w) => (
                      <li key={w.kind + w.text} className="flex items-center gap-2 text-base">
                        <TriangleAlert className="size-4 shrink-0 text-mono-accent" aria-hidden />
                        {w.text}
                      </li>
                    ))}
                  </ul>
                )}
                {i.rag_updated_at && <p className="m-0 text-sm text-mono-muted">Status aktualisiert {fmtDate(new Date(i.rag_updated_at))}</p>}
              </Panel>
            )}
            <Panel title="Beschreibung">
              {i.description ? (
                <div className="flex flex-col gap-5 text-base leading-[1.55] break-words [&_a]:text-mono-accent [&_a]:underline [&_p]:m-0">
                  <Markdown>{i.description}</Markdown>
                </div>
              ) : (
                <p className="m-0 text-base text-mono-muted">Keine Beschreibung.</p>
              )}
            </Panel>
            <Panel title="Meilensteine">
              <MilestoneList items={milestones} canEdit={canEdit} actions={actions.milestones} />
            </Panel>
          </div>

          <div className="flex min-w-0 flex-[3_1_340px] flex-col gap-12">
            <Panel title="Budget">
              <BudgetBar i={i} thin />
              <dl className="m-0 flex flex-col gap-2.5 text-base">
                <Row label="Budget" value={chf(i.budget_chf)} />
                <Row label="Status" value={BUDGET_STATUS_LABEL[i.budget_status]} />
                <Row label="Ist" value={chf(i.actual_chf)} />
                <Row label="Prognose" value={chf(i.forecast_chf)} />
              </dl>
            </Panel>
            <Panel title="Jira">
              <JiraLinkList links={links} canEdit={canEdit} actions={actions.links} />
            </Panel>
            {deps.length > 0 && (
              <Panel title="Abhängigkeiten">
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-base">
                  {deps.map((d) => (
                    <li key={d.direction + d.key}>
                      <span className="text-mono-muted">{d.direction === 'blocks' ? 'Blockiert ' : 'Wartet auf '}</span>
                      <Link className="text-mono-accent underline" to={`/initiative/${d.key}`}>{d.key}</Link> {d.title}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
            {canEdit && (
              <div className="flex flex-col items-start gap-2">
                <button
                  type="button"
                  className={btnText}
                  onClick={async () => {
                    if (window.confirm(`${i.key} archivieren? Sie verschwindet aus dem Dashboard, bleibt aber in der Datenbank.`)) {
                      setArchiveError(await actions.archive())
                    }
                  }}
                >
                  Archivieren
                </button>
                {archiveError && <ErrorNote>{archiveError}</ErrorNote>}
              </div>
            )}
          </div>
        </div>
      </Content>
    </Page>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-mono-muted">{label}</dt>
      <dd className="m-0 tabular-nums">{value}</dd>
    </div>
  )
}

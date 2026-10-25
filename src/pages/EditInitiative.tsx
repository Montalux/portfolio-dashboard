import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { errorText } from '@/lib/errors'
import { STATUS_LABEL, fmtDate, ragState, type Initiative } from '@/lib/portfolio'
import { Content, Page, PageHeader } from '@/components/mono'
import { RagBadge } from '@/components/RagBadge'
import { InitiativeForm } from '@/components/InitiativeForm'
import type { Database } from '@/lib/database.types'

type Update = Database['public']['Tables']['initiative']['Update']

export default function EditInitiative() {
  const { key } = useParams()
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [i, setI] = useState<Initiative | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('initiative').select('*').eq('key', key!).maybeSingle().then(({ data, error: e }) => {
      if (e || !data) setError(e?.message ?? 'Initiative nicht gefunden.')
      else setI(data)
    })
  }, [key])

  if (appUser?.role !== 'pm') return <Navigate to={`/initiative/${key}`} replace />

  const back = { to: `/initiative/${key}`, label: 'Zurück' }
  if (!i) {
    return (
      <Page>
        <PageHeader back={back} title={key ?? ''} />
        <Content>
          <p className="m-0 text-base text-mono-muted">{error ?? 'Lade …'}</p>
        </Content>
      </Page>
    )
  }

  return (
    <EditView
      initiative={i}
      onCancel={() => navigate(`/initiative/${i.key}`)}
      onSave={async (v) => {
        const { error: e } = await supabase.from('initiative').update(v).eq('id', i.id)
        if (!e) navigate(`/initiative/${i.key}`)
        return errorText(e)
      }}
    />
  )
}

export function EditView({
  initiative: i,
  onSave,
  onCancel,
}: {
  initiative: Initiative
  onSave: (values: Update) => Promise<string | null>
  onCancel: () => void
}) {
  return (
    <Page>
      <PageHeader
        back={{ to: `/initiative/${i.key}`, label: 'Zurück' }}
        eyebrow={`${i.key} · ${STATUS_LABEL[i.status]}`}
        title={i.title}
        subtitle={`${fmtDate(i.start_date)} bis ${fmtDate(i.due_date)}`}
        right={<RagBadge state={ragState(i)} size={24} />}
      />
      <Content>
        <InitiativeForm initial={i} onCancel={onCancel} onSave={onSave} />
      </Content>
    </Page>
  )
}

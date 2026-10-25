import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { errorText } from '@/lib/errors'
import { Content, Page, PageHeader } from '@/components/mono'
import { InitiativeForm } from '@/components/InitiativeForm'

export default function NewInitiative() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  if (appUser?.role !== 'pm') return <Navigate to="/" replace />

  return (
    <Page>
      <PageHeader back={{ to: '/', label: 'Übersicht' }} title="Neue Initiative" />
      <Content>
        <InitiativeForm
          initial={{}}
          onCancel={() => navigate('/')}
          onSave={async (v) => {
            // key is assigned by the database (MON-21, MON-22, ...)
            const { data, error } = await supabase.from('initiative').insert({ ...v, title: v.title! }).select('key').single()
            if (!error && data) navigate(`/initiative/${data.key}`)
            return errorText(error)
          }}
        />
      </Content>
    </Page>
  )
}

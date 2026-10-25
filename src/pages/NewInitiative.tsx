import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { errorText } from '@/lib/errors'
import { InitiativeForm } from '@/components/InitiativeForm'

export default function NewInitiative() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  if (appUser?.role !== 'pm') return <Navigate to="/" replace />

  return (
    <div className="min-h-svh bg-neutral-50">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="size-4" aria-hidden /> Übersicht
        </Link>
        <h1 className="mb-6 text-2xl font-semibold">Neue Initiative</h1>
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
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Tables } from '@/lib/database.types'
import { Button } from '@/components/ui/button'

// Placeholder until the real start page (tiles, budget, timeline) is built
export default function Start() {
  const { appUser } = useAuth()
  const [rows, setRows] = useState<Tables<'initiative'>[]>([])

  useEffect(() => {
    supabase
      .from('initiative')
      .select('*')
      .is('archived_at', null)
      .order('due_date')
      .then(({ data }) => setRows(data ?? []))
  }, [])

  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Portfolio-Dashboard</h1>
        <div className="flex items-center gap-3 text-sm">
          <span>{appUser?.display_name}</span>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Abmelden</Button>
        </div>
      </header>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.id}>{r.key} · {r.title}</li>
        ))}
        {rows.length === 0 && <li className="text-neutral-500">Noch keine Initiativen.</li>}
      </ul>
    </div>
  )
}

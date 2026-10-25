import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { btnDarkGhost } from '@/components/mono'

// Triggers the jira-sync Edge Function (PM only, checked server-side)
export function SyncButton({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setMsg(null)
    const { data, error } = await supabase.functions.invoke<{ ok: boolean; errors?: string[] }>('jira-sync', { body: { trigger: 'manual' } })
    setRunning(false)
    if (error) setMsg('Sync fehlgeschlagen.')
    else if (!data?.ok) setMsg(`Sync mit Fehlern: ${data?.errors?.join('; ')}`)
    else setMsg('Jira aktualisiert.')
    onDone()
  }

  return (
    <span className="flex items-center gap-3">
      {msg && <span className="hidden max-w-64 truncate text-sm text-mono-muted-dark md:inline" title={msg}>{msg}</span>}
      <button type="button" className={btnDarkGhost} onClick={run} disabled={running}>
        <RefreshCw className={`size-[18px] text-mono-accent-dark ${running ? 'animate-spin' : ''}`} aria-hidden />
        {running ? 'Aktualisiert …' : 'Jetzt aktualisieren'}
      </button>
    </span>
  )
}

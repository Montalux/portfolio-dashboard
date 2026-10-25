import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Invite-only: never create a new user from the login form
      options: { shouldCreateUser: false, emailRedirectTo: window.location.href.split('#')[0] },
    })
    if (error) setError('Anmeldung nicht möglich. Ist die Adresse freigeschaltet?')
    else setSent(true)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Portfolio-Dashboard</CardTitle>
          <CardDescription>Montalux AG</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm">Wir haben dir einen Anmeldelink an {email} geschickt.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full">Anmeldelink senden</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

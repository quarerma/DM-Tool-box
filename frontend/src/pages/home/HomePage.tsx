import { useNavigate } from 'react-router-dom'

import { logout as logoutRequest } from '@/boot/axios'
import { SectionCard } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'
import { useAuth, useAuthActions } from '@/lib/useAuth'

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { clearAuthenticated } = useAuthActions()

  async function handleLogout() {
    try {
      await logoutRequest()
    } finally {
      clearAuthenticated()
      navigate('/login')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">DM-Tool-box</h1>
          <p className="text-muted-foreground">
            Lightweight audio control for TTRPG Dungeon Masters.
          </p>
        </div>
        {isAuthenticated ? (
          <Button variant="outline" onClick={handleLogout}>
            Sign out
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/login')}>
              Sign in
            </Button>
            <Button onClick={() => navigate('/register')}>Create account</Button>
          </div>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Soundboard">
          Scene-based music control with smooth transitions and looping — wired
          up once auth and tracks are connected.
        </SectionCard>
        <SectionCard title="Status">
          {isAuthenticated
            ? 'Signed in. You can reach the secure area.'
            : 'Not signed in — create an account or sign in to continue.'}
        </SectionCard>
      </div>
    </main>
  )
}

import { SectionCard } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">DM-Tool-box</h1>
        <p className="text-muted-foreground">
          Initial React setup with route wrappers, axios boot module, and base
          page structure.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="OpenPage wrapper">
          Public pages can live behind this wrapper with placeholder checks for
          redirect behavior.
        </SectionCard>
        <SectionCard title="SecurePage wrapper">
          Protected routes can live behind this wrapper with placeholder auth
          checks until full auth is connected.
        </SectionCard>
      </div>
      <div>
        <Button>shadcn is configured</Button>
      </div>
    </main>
  )
}

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/lib/useAuth'

type OpenPageProps = {
  children: ReactNode
  redirectWhenAuthenticated?: boolean
}

export function OpenPage({
  children,
  redirectWhenAuthenticated = false,
}: OpenPageProps) {
  const { isAuthenticated, isResolving } = useAuth()

  if (redirectWhenAuthenticated && isResolving) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    )
  }

  if (redirectWhenAuthenticated && isAuthenticated) {
    return <Navigate replace to="/secure" />
  }

  return <>{children}</>
}

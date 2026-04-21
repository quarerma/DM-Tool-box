import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/lib/useAuth'

type SecurePageProps = {
  children: ReactNode
}

export function SecurePage({ children }: SecurePageProps) {
  const { isAuthenticated, isResolving } = useAuth()

  if (isResolving) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  return <>{children}</>
}

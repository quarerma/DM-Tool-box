import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { isAuthenticated } from '@/lib/auth'

type OpenPageProps = {
  children: ReactNode
  redirectWhenAuthenticated?: boolean
}

export function OpenPage({
  children,
  redirectWhenAuthenticated = false,
}: OpenPageProps) {
  const authenticated = isAuthenticated()

  // Placeholder branch for public-only routes (e.g. login/register).
  if (redirectWhenAuthenticated && authenticated) {
    return <Navigate replace to="/secure" />
  }

  return <>{children}</>
}

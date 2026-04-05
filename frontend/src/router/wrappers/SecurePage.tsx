import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { isAuthenticated } from '@/lib/auth'

type SecurePageProps = {
  children: ReactNode
}

export function SecurePage({ children }: SecurePageProps) {
  const authenticated = isAuthenticated()

  // Placeholder branch for future secure route checks.
  if (!authenticated) {
    return <Navigate replace to="/" />
  }

  return <>{children}</>
}

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { isAuthenticated } from '@/lib/auth'

type SecurePageProps = {
  children: ReactNode
}

export function SecurePage({ children }: SecurePageProps) {
  const authenticated = isAuthenticated()

  if (!authenticated) {
    return <Navigate replace to="/login" />
  }

  return <>{children}</>
}

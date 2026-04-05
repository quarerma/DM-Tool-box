import { Route, Routes } from 'react-router-dom'

import { HomePage } from '@/pages/home/HomePage'
import { OpenPage } from '@/router/wrappers/OpenPage'
import { SecurePage } from '@/router/wrappers/SecurePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <OpenPage>
            <HomePage />
          </OpenPage>
        }
      />
      <Route
        path="/secure"
        element={
          <SecurePage>
            <HomePage />
          </SecurePage>
        }
      />
    </Routes>
  )
}

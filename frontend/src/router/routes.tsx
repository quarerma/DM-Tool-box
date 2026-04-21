import { Route, Routes } from 'react-router-dom'

import { HomePage } from '@/pages/home/HomePage'
import { LoginPage } from '@/pages/login/LoginPage'
import { RegisterPage } from '@/pages/register/RegisterPage'
import { VerifyDevicePage } from '@/pages/verify-device/VerifyDevicePage'
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
        path="/login"
        element={
          <OpenPage redirectWhenAuthenticated>
            <LoginPage />
          </OpenPage>
        }
      />
      <Route
        path="/register"
        element={
          <OpenPage redirectWhenAuthenticated>
            <RegisterPage />
          </OpenPage>
        }
      />
      <Route
        path="/register-device"
        element={
          <OpenPage>
            <VerifyDevicePage />
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

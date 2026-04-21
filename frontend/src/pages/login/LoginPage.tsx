import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { login } from '@/boot/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthActions } from '@/lib/useAuth'

type FormErrors = {
  email?: string
  password?: string
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {}
  if (!email) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Must be a valid email'
  if (!password) errors.password = 'Password is required'
  return errors
}

export function LoginPage() {
  const navigate = useNavigate()
  const { markAuthenticated } = useAuthActions()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const errors = useMemo(() => validate(email, password), [email, password])
  const isFormValid = !errors.email && !errors.password && email && password

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ email: true, password: true })
    if (!isFormValid) return

    setLoginError(null)
    try {
      setLoading(true)
      await login(email.toLowerCase().trim(), password)
      markAuthenticated()
      navigate('/secure')
    } catch (error) {
      if ((error as { redirected?: boolean }).redirected) {
        return
      }
      console.error('Login failed:', error)
      setLoginError('Login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-background">
      <div className="lg:w-[600px] sm:w-[500px] w-[90%] bg-gradient-to-b from-blue-500 via-blue-300 via-10% to-transparent p-1 rounded-[50px]">
        <div className="relative px-4 sm:px-10 py-6 bg-card rounded-[50px] border border-border shadow-md flex flex-col space-y-8">
          <div className="flex flex-col text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">DM-Tool-box</h1>
            <p className="text-sm font-light text-muted-foreground">
              Sign in to continue
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col space-y-4">
            <div>
              <Label htmlFor="email" className="block mb-2 font-semibold">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="Email Address"
                className={
                  touched.email && errors.email
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
              <div className="h-5 text-sm text-red-500">
                {touched.email ? errors.email : ''}
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="block mb-2 font-semibold">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="Password"
                className={
                  touched.password && errors.password
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
              <div className="h-5 text-sm text-red-500">
                {touched.password ? errors.password : ''}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full rounded-2xl"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="h-5 text-base text-red-500 text-center">
              {loginError}
            </div>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="text-blue-500 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

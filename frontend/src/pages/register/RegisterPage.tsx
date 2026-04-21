import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { register as registerRequest } from '@/boot/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.name) errors.name = 'Name is required'
  else if (values.name.length < 2) errors.name = 'Name must be at least 2 characters'

  if (!values.email) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = 'Please enter a valid email address'

  if (!values.password) errors.password = 'Password is required'
  else if (values.password.length < 8)
    errors.password = 'Password must be at least 8 characters'

  if (!values.confirmPassword)
    errors.confirmPassword = 'Confirm Password is required'
  else if (values.confirmPassword !== values.password)
    errors.confirmPassword = 'Passwords must match'

  return errors
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState<Record<keyof FormValues, boolean>>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  })
  const [loading, setLoading] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  const errors = useMemo(() => validate(values), [values])
  const isFormValid =
    Object.keys(errors).length === 0 &&
    values.name &&
    values.email &&
    values.password &&
    values.confirmPassword

  function onChange(key: keyof FormValues) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [key]: event.target.value }))
    }
  }

  function onBlur(key: keyof FormValues) {
    return () => setTouched((t) => ({ ...t, [key]: true }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    })
    if (!isFormValid) return

    setRegisterError(null)
    try {
      setLoading(true)
      await registerRequest(
        values.name.trim(),
        values.email.toLowerCase().trim(),
        values.password,
      )
      navigate('/login', { state: { justRegistered: true } })
    } catch (error: unknown) {
      console.error('Registration failed:', error)
      const maybeMessage = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setRegisterError(
        typeof maybeMessage === 'string'
          ? maybeMessage
          : 'Registration failed. Please try again.',
      )
      setLoading(false)
    }
  }

  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-background">
      <div className="lg:w-[600px] sm:w-[500px] w-[90%] bg-gradient-to-b from-blue-500 via-blue-300 via-10% to-transparent p-1 rounded-[50px]">
        <div className="relative px-4 sm:px-10 py-6 bg-card rounded-[50px] border border-border shadow-md flex flex-col space-y-8">
          <div className="flex flex-col text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
            <p className="text-sm font-light text-muted-foreground">
              Sign up to get started
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col space-y-4">
            <FormField
              id="name"
              label="Name"
              type="text"
              placeholder="Full name"
              value={values.name}
              onChange={onChange('name')}
              onBlur={onBlur('name')}
              error={touched.name ? errors.name : undefined}
            />
            <FormField
              id="email"
              label="Email"
              type="email"
              placeholder="Email Address"
              value={values.email}
              onChange={onChange('email')}
              onBlur={onBlur('email')}
              error={touched.email ? errors.email : undefined}
            />
            <FormField
              id="password"
              label="Password"
              type="password"
              placeholder="Password (min 8 characters)"
              value={values.password}
              onChange={onChange('password')}
              onBlur={onBlur('password')}
              error={touched.password ? errors.password : undefined}
            />
            <FormField
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Confirm Password"
              value={values.confirmPassword}
              onChange={onChange('confirmPassword')}
              onBlur={onBlur('confirmPassword')}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
            />

            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full rounded-2xl"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <div className="h-5 text-base text-red-500 text-center">
              {registerError}
            </div>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-500 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

type FormFieldProps = {
  id: string
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  error?: string
}

function FormField({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
}: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="block mb-2 font-semibold">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
      />
      <div className="h-5 text-sm text-red-500">{error ?? ''}</div>
    </div>
  )
}

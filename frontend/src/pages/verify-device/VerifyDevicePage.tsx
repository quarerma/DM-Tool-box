import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { verifyDevice } from '@/boot/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { markAuthenticated } from '@/lib/auth'

export function VerifyDevicePage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<number | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('pending_user_id')
    if (!stored) {
      navigate('/login', { replace: true })
      return
    }
    setPendingUserId(Number(stored))
  }, [navigate])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pendingUserId) return
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }

    setError(null)
    try {
      setLoading(true)
      await verifyDevice(pendingUserId, code.trim())
      localStorage.removeItem('pending_user_id')
      markAuthenticated()
      navigate('/secure')
    } catch (err) {
      console.error('Device verification failed:', err)
      setError('Verification failed. Check the code and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-background">
      <div className="lg:w-[600px] sm:w-[500px] w-[90%] bg-gradient-to-b from-blue-500 via-blue-300 via-10% to-transparent p-1 rounded-[50px]">
        <div className="relative px-4 sm:px-10 py-6 bg-card rounded-[50px] border border-border shadow-md flex flex-col space-y-8">
          <div className="flex flex-col text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Verify this device
            </h1>
            <p className="text-sm font-light text-muted-foreground">
              Enter the 6-digit code we sent to your email.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col space-y-4">
            <div>
              <Label htmlFor="code" className="block mb-2 font-semibold">
                Verification code
              </Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="123456"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-2xl"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>

            <div className="h-5 text-base text-red-500 text-center">
              {error}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

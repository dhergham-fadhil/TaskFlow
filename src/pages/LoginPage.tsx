import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MailCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthProvider'
import { useToast } from '../context/ToastProvider'
import { Logo } from '../components/brand/Logo'
import { Button } from '../components/ui/Button'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, register, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      setError('Enter your email to continue.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (mode === 'register' && !name.trim()) {
      setError('Enter your name to create an account.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password)
      } else {
        await login(email.trim(), password)
      }
      toast({
        title: mode === 'register' ? 'Account created' : 'Welcome back',
        description: mode === 'register' ? 'Signed up to TaskFlow Studio.' : 'Signed in to TaskFlow Studio.',
      })
      navigate('/', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ambient relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="card grain overflow-hidden p-7">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <MailCheck size={19} />
            </div>
            <h1 className="text-[19px] font-extrabold tracking-[-0.025em] text-ink">
              {mode === 'login' ? 'Sign in to TaskFlow' : 'Create your account'}
            </h1>
            <p className="mt-1 text-[12px] text-muted">
              {mode === 'login'
                ? 'Focus on what matters. We will handle the rest.'
                : 'Join TaskFlow Studio and start organizing your work.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="field-label">
                  Full name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Cooper"
                  autoComplete="name"
                  className="input"
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="field-label">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="field-label">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="input"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-[11px] font-medium text-rose-500"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              iconAfter={<ArrowRight size={15} />}
            >
              {mode === 'login' ? 'Continue' : 'Create account'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError(null)
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-[11.5px] font-semibold text-muted transition hover:border-accent/40 hover:text-accent"
          >
            <Sparkles size={13} />
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
          </button>
        </div>

        <p className="mt-5 text-center text-[10.5px] text-muted/70">
          TaskFlow Studio — local development instance.
        </p>
      </motion.div>
    </div>
  )
}

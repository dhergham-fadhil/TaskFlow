import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Database,
  Loader2,
  Moon,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Sun,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { ACCENTS, type AccentKey } from '../types'
import { useTheme } from '../context/ThemeProvider'
import { useWorkspace } from '../context/WorkspaceProvider'
import { useToast } from '../context/ToastProvider'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionTitle } from '../components/ui/Skeleton'

function AppearanceCard() {
  const { theme, resolvedTheme, accent, setTheme, setAccent } = useTheme()

  return (
    <section className="card p-5">
      <SectionTitle title="Appearance" subtitle="Choose how TaskFlow looks on this device." />

      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Theme
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ] as const
            ).map((option) => {
              const Icon = option.icon
              const active = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] font-semibold transition-all',
                    active
                      ? 'border-accent/50 bg-accent/[0.07] text-accent shadow-[0_0_0_1px_rgb(var(--accent)/0.4)]'
                      : 'border-line bg-surface text-muted hover:bg-raised hover:text-ink',
                  )}
                  aria-pressed={active}
                >
                  <Icon size={16} />
                  {option.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[10.5px] text-muted/70">
            Currently showing the {resolvedTheme} theme.
          </p>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <Palette size={12} />
            Accent colour
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAccent(key)}
                title={ACCENTS[key].label}
                aria-label={`Use ${ACCENTS[key].label} accent`}
                aria-pressed={accent === key}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                  accent === key
                    ? 'scale-110 ring-2 ring-ink/30 ring-offset-2 ring-offset-surface'
                    : 'hover:scale-105',
                )}
                style={{
                  backgroundColor: ACCENTS[key].value,
                }}
              >
                {accent === key && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-white"
                  >
                    <Save size={13} />
                  </motion.span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-muted/70">
            The accent drives buttons, highlights, charts and focus rings.
          </p>
        </div>
      </div>
    </section>
  )
}

function ProfileCard() {
  const { currentUser, updateProfile } = useWorkspace()
  const { toast } = useToast()
  const [name, setName] = useState(currentUser?.name ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [saving, setSaving] = useState(false)

  // Keep the form in sync if the profile changes elsewhere (e.g. after login).
  useEffect(() => {
    setName(currentUser?.name ?? '')
    setEmail(currentUser?.email ?? '')
  }, [currentUser?.name, currentUser?.email])

  const dirty =
    name !== (currentUser?.name ?? '') ||
    email !== (currentUser?.email ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ name: name.trim(), email: email.trim() })
      toast({ title: 'Profile saved', description: 'Your details were updated on the server.' })
    } catch (caught) {
      toast({
        title: 'Could not save profile',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card p-5">
      <SectionTitle title="Profile" subtitle="Your name and email across the workspace." />

      <div className="mt-4 flex items-center gap-3">
        <Avatar user={currentUser} size="xl" />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink">{currentUser?.name}</p>
          <p className="truncate text-[11px] text-muted">{currentUser?.email}</p>
          <span className="mt-1 inline-block rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-accent">
            Role: {currentUser?.role}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="profile-name" className="field-label">
            Full name
          </label>
          <input
            id="profile-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
          />
        </div>
        <div>
          <label htmlFor="profile-email" className="field-label">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="primary"
            icon={<Save size={13} />}
            loading={saving}
            disabled={!dirty}
            onClick={() => void handleSave()}
          >
            Save profile
          </Button>
        </div>
      </div>
    </section>
  )
}

function WorkspaceControlsCard() {
  const { refresh, resetWorkspace, currentUser } = useWorkspace()
  const { toast } = useToast()
  const isAdmin = currentUser?.role === 'admin'
  const [syncing, setSyncing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      await refresh()
      toast({ title: 'Workspace refreshed', description: 'Latest data loaded from SQL Server.' })
    } catch (caught) {
      toast({
        title: 'Could not refresh workspace',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setSyncing(false)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await resetWorkspace()
      toast({
        title: 'Demo data reset',
        description: 'The workspace was restored to its sample state.',
      })
      setConfirmReset(false)
    } catch (caught) {
      toast({
        title: 'Could not reset demo data',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setResetting(false)
    }
  }

  return (
    <section className="card p-5">
      <SectionTitle
        title="Workspace data"
        subtitle="Manage sync state and database controls."
      />

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={syncing ? <Loader2 size={13} /> : <RefreshCw size={13} />}
            loading={syncing}
            onClick={() => void handleSync()}
          >
            Sync latest data
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 size={13} />}
              onClick={() => setConfirmReset(true)}
            >
              Reset demo data
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted/70">
          {isAdmin
            ? 'Reset demo data is restricted to administrators and only works while demo mode is enabled on the server.'
            : 'Administrative actions (like workspace reset) require an administrator account.'}
        </p>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        description="Every project, task, comment and activity in this database will be replaced with the original demo dataset. This cannot be undone."
        confirmLabel="Reset workspace"
        danger
        loading={resetting}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => void handleReset()}
      >
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-3 text-[11.5px] leading-relaxed text-amber-600 dark:text-amber-400">
          <Database size={14} className="mt-0.5 shrink-0" />
          Only use this on a development database. It is disabled entirely in production
          configuration and requires an administrator account.
        </p>
      </ConfirmDialog>
    </section>
  )
}

function AboutCard() {
  return (
    <section className="card p-5">
      <SectionTitle title="About TaskFlow" subtitle="System details and backend status." />
      <div className="mt-4 space-y-2 text-[12px] leading-relaxed text-muted">
        <p className="flex items-center gap-2">
          <SettingsIcon size={12} className="text-accent" />
          Powered by ASP.NET Core 9 Minimal API + SQL Server.
        </p>
        <p className="flex items-center gap-2">
          <ShieldCheck size={12} className="text-accent" />
          Secured with JWT authentication and resource-level access control.
        </p>
        <p className="flex items-center gap-2">
          <UserRound size={12} className="text-accent" />
          React 19 + TypeScript + Vite + Tailwind CSS frontend.
        </p>
      </div>
    </section>
  )
}

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Settings"
        description="Personalise TaskFlow and review workspace options."
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <AppearanceCard />
        <ProfileCard />
        <WorkspaceControlsCard />
        <AboutCard />
      </motion.div>
    </div>
  )
}

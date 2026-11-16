import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ACCENTS, type AccentKey } from '../types'

type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  accent: AccentKey
  setTheme: (theme: ThemeMode) => void
  setAccent: (accent: AccentKey) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const THEME_KEY = 'taskflow.theme'
const ACCENT_KEY = 'taskflow.accent'

function readTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function readAccent(): AccentKey {
  const stored = localStorage.getItem(ACCENT_KEY)
  return stored && stored in ACCENTS ? (stored as AccentKey) : 'violet'
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readTheme)
  const [accent, setAccentState] = useState<AccentKey>(readAccent)
  const [systemResolved, setSystemResolved] = useState<ResolvedTheme>(systemTheme)

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemResolved : theme

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setSystemResolved(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.classList.toggle('light', resolvedTheme !== 'dark')
    root.style.colorScheme = resolvedTheme
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', resolvedTheme === 'dark' ? '#0a0a0f' : '#f6f6f9')
  }, [resolvedTheme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ACCENTS[accent].rgb)
  }, [accent])

  const setTheme = useCallback((next: ThemeMode) => {
    localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
  }, [])

  const setAccent = useCallback((next: AccentKey) => {
    localStorage.setItem(ACCENT_KEY, next)
    setAccentState(next)
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, accent, setTheme, setAccent }),
    [theme, resolvedTheme, accent, setTheme, setAccent],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}

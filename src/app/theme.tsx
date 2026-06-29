import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

// 主题:暗色「夜林」(家长/建站者) ↔ 儿童亮色大字。皮肤分离、数据共享。

export type ThemeName = 'dark' | 'child'

const STORAGE_KEY = 'studywithu.theme'

interface ThemeCtx {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

function loadTheme(): ThemeName {
  const t = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })()
  return t === 'child' ? 'child' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(loadTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* 静默降级 */
    }
  }, [theme])

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), [])
  const toggle = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'child' : 'dark')),
    [],
  )

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用')
  return ctx
}

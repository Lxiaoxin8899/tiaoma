import { useEffect, useMemo, useState } from 'react'

/**
 * 主题偏好：
 * - `light` / `dark`：强制主题
 * - `auto`：跟随系统主题
 */
export type ThemePreference = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

const THEME_KEY = 'theme'

const normalizePreference = (value: unknown): ThemePreference | null => {
  if (value === 'light' || value === 'dark' || value === 'auto') return value
  return null
}

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getDefaultPreference = (): ThemePreference => {
  // 说明：允许通过环境变量设置默认主题（light/dark/auto），未设置则使用 auto
  const envPref = normalizePreference(import.meta.env.VITE_DEFAULT_THEME)
  return envPref ?? 'auto'
}

/**
 * 主题 Hook：
 * - 负责把 `light/dark` class 写入 `document.documentElement`
 * - 保存用户偏好到 localStorage（key: theme）
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return getDefaultPreference()
    const saved = normalizePreference(localStorage.getItem(THEME_KEY))
    return saved ?? getDefaultPreference()
  })

  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    return theme === 'auto' ? getSystemTheme() : theme
  }, [theme])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(resolvedTheme)

    // 说明：保存的是“偏好”，而不是最终主题（auto 会随系统变化）
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme)
    }
  }, [theme, resolvedTheme])

  useEffect(() => {
    // 说明：auto 模式下监听系统主题变化
    if (typeof window === 'undefined') return
    if (theme !== 'auto') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(getSystemTheme())
    }

    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme])

  const toggleTheme = () => {
    // 说明：在 light/dark 之间切换；auto 需要显式选择以避免误触覆盖用户偏好
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  }
}

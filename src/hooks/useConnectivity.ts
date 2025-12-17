import { useCallback, useEffect, useMemo, useState } from 'react'
import { isOfflineMode, supabase } from '@/lib/supabase'

export type ConnectivityStatus = 'checking' | 'online' | 'offline' | 'local'

interface ConnectivityState {
  status: ConnectivityStatus
  lastCheckedAt: number | null
  recheck: () => void
}

/**
 * 连接状态 Hook：
 * - local：显式离线模式（VITE_OFFLINE=true 或开发环境缺少 Supabase 配置）
 * - online/offline：在线模式下，基于 supabase.isOnline() 的健康探测结果
 * - checking：首次加载/重新探测中
 */
export const useConnectivity = (): ConnectivityState => {
  const [status, setStatus] = useState<ConnectivityStatus>(() => (isOfflineMode ? 'local' : 'checking'))
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null)

  const check = useCallback(async () => {
    if (isOfflineMode) {
      setStatus('local')
      setLastCheckedAt(Date.now())
      return
    }

    setStatus('checking')
    try {
      const ok = await supabase.isOnline()
      setStatus(ok ? 'online' : 'offline')
    } catch {
      setStatus('offline')
    } finally {
      setLastCheckedAt(Date.now())
    }
  }, [])

  // 说明：给外部一个稳定的 recheck 引用
  const recheck = useCallback(() => {
    void check()
  }, [check])

  useEffect(() => {
    void check()

    // 说明：监听浏览器网络事件，尽快刷新状态
    const handleOnline = () => void check()
    const handleOffline = () => setStatus('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 说明：定时探测，避免仅依赖 navigator.onLine（不一定准确）
    const timer = window.setInterval(() => {
      void check()
    }, 15000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.clearInterval(timer)
    }
  }, [check])

  return useMemo(
    () => ({
      status,
      lastCheckedAt,
      recheck,
    }),
    [status, lastCheckedAt, recheck],
  )
}


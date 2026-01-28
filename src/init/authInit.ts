import { useAuthStore } from '../stores/authStore'
import { db, session } from '../lib/localdb'
import { isOfflineMode } from '../lib/supabase'

// 说明：仅离线模式才自动填充本地会话；在线模式要求走登录流程
if (isOfflineMode) {
  try {
    const s = session.get()
    if (!s) {
      const users = db.getAll('users') as Array<Record<string, unknown>>
      const activeUsers = users.filter((u) => {
        const deleted = u['_deleted'] === true
        const status = typeof u['status'] === 'string' ? u['status'] : 'active'
        return !deleted && status === 'active'
      })
      const admin = activeUsers.find((u) => u['role'] === 'admin')
      const picked = admin ?? activeUsers[0]
      if (picked) {
        session.set({
          user: picked,
          token: 'local',
          expires_at: Date.now() + 365 * 24 * 3600 * 1000,
        })
      }
    }
  } catch {
    // 说明：初始化失败不阻塞启动，后续 localSupabase.getUser 会兜底
  }
}

void useAuthStore.getState().checkAuth()

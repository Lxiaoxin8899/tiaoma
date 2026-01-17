import { useAuthStore } from '../stores/authStore'
import { db, session } from '../lib/localdb'

// 说明：单机版不需要登录页。
// - 若本地还没有会话，则自动选择一个“默认用户”（优先管理员）写入会话
// - 再执行一次 checkAuth，让全局状态（authStore.user）尽快可用
try {
  const s = session.get()
  if (!s) {
    // 说明：这里仅关心 user 的最小字段集（role/status/_deleted），避免引入 any
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
        // 说明：单机会话无安全意义，这里仅用于兼容 auth 接口
        expires_at: Date.now() + 365 * 24 * 3600 * 1000,
      })
    }
  }
} catch {
  // 说明：初始化失败不阻塞启动，后续 localSupabase.getUser 仍会兜底选择用户
}

void useAuthStore.getState().checkAuth()

import { onLocalDbChange } from '@/lib/localdb'
import { openBackupFolder, saveBackupNow } from '@/lib/backup'
import { useSettingsStore } from '@/stores/settingsStore'

// =============================================================================
// 自动备份初始化（单机模式）
//
// 目标：
// - 通过“定时 + 数据变更触发”两种方式降低丢数据风险
// - 默认不打扰用户；仅在控制台输出最小日志（必要时可接入 UI 提示）
// =============================================================================

const frequencyToMs = (freq?: string) => {
  switch (freq) {
    case 'hourly':
      return 60 * 60 * 1000
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000
    case 'daily':
    default:
      return 24 * 60 * 60 * 1000
  }
}

let periodicTimer: number | null = null
let changeDebounceTimer: number | null = null

const clearTimers = () => {
  if (periodicTimer) {
    window.clearInterval(periodicTimer)
    periodicTimer = null
  }
  if (changeDebounceTimer) {
    window.clearTimeout(changeDebounceTimer)
    changeDebounceTimer = null
  }
}

const schedule = () => {
  if (typeof window === 'undefined') return
  clearTimers()

  const settings = useSettingsStore.getState().settings
  const autoBackup = settings?.auto_backup ?? true
  if (!autoBackup) return

  const retentionDays = settings?.data_retention_days ?? 365
  const interval = frequencyToMs(settings?.backup_frequency)

  // 定时备份
  periodicTimer = window.setInterval(() => {
    void saveBackupNow({ retentionDays })
  }, interval)

  // 启动后先做一次备份（延迟一点，避免刚启动数据尚未初始化）
  window.setTimeout(() => {
    void saveBackupNow({ retentionDays })
  }, 10_000)
}

const scheduleOnChange = () => {
  const settings = useSettingsStore.getState().settings
  const autoBackup = settings?.auto_backup ?? true
  if (!autoBackup) return

  const retentionDays = settings?.data_retention_days ?? 365
  if (changeDebounceTimer) window.clearTimeout(changeDebounceTimer)
  changeDebounceTimer = window.setTimeout(() => {
    void saveBackupNow({ retentionDays })
  }, 60_000)
}

// 说明：仅在 Electron 环境（存在预加载桥接）启用“写文件备份”
if (typeof window !== 'undefined' && window.tiaoma?.backup?.save) {
  // 尽早拉取一次设置（单机模式下不会失败；用于获取备份频率/保留天数）
  window.setTimeout(() => {
    void useSettingsStore.getState().fetchSettings()
  }, 1_000)

  // 设置变化后更新计划（用户在设置页改了频率/开关）
  useSettingsStore.subscribe(() => {
    schedule()
  })

  // 数据变化后触发一次备份（防“写了就丢”）
  onLocalDbChange(() => {
    scheduleOnChange()
  })

  // 第一次排程
  schedule()

  // 说明：暴露一个调试入口（不做 UI，方便现场排查时快速打开目录）
  ;(window as unknown as { __TIAOMA_OPEN_BACKUP_FOLDER__?: () => void }).__TIAOMA_OPEN_BACKUP_FOLDER__ = () =>
    void openBackupFolder()
}

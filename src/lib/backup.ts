import { saveAs } from 'file-saver'
import { exportSnapshot } from './localdb'

// =============================================================================
// 单机备份（本地数据）
//
// 说明：
// - Electron 环境：通过 preload 暴露的 window.tiaoma.backup 交给主进程写入文件
// - 非 Electron（浏览器调试）：回退为下载 JSON 文件
// =============================================================================

const isElectron = () => typeof window !== 'undefined' && !window.location.protocol.startsWith('http')

export const canUseNativeBackup = () => {
  return !!window.tiaoma?.backup?.save
}

export const createBackupSnapshotJson = () => {
  const snapshot = exportSnapshot()
  return JSON.stringify(snapshot)
}

export const saveBackupNow = async (opts?: { retentionDays?: number }) => {
  const json = createBackupSnapshotJson()

  if (canUseNativeBackup()) {
    return await window.tiaoma!.backup.save(json, { retentionDays: opts?.retentionDays })
  }

  // 说明：开发环境/浏览器下兜底为文件下载
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ts =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const fileName = `tiaoma-backup-${ts}.json`
  saveAs(new Blob([json], { type: 'application/json;charset=utf-8' }), fileName)
  return { ok: true, path: fileName }
}

export const openBackupFolder = async () => {
  if (canUseNativeBackup()) {
    return await window.tiaoma!.backup.openFolder()
  }
  return { ok: false, error: '当前环境不支持打开备份目录' }
}

export const isSingleMachineMode = () => {
  // 说明：现在项目定位为单机软件；这里作为 UI 提示/逻辑分支用
  return isElectron()
}


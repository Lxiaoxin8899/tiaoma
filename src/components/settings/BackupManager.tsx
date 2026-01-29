/**
 * 备份管理组件
 * 提供备份列表、恢复、删除等功能
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowPathIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { saveBackupNow, openBackupFolder, canUseNativeBackup } from '@/lib/backup'
import ConfirmDialog from '@/components/common/ConfirmDialog'

interface BackupFile {
  name: string
  path: string
  size: number
  mtime: string
}

interface BackupSnapshot {
  version: number
  exported_at: string
  tables: Record<string, unknown[]>
}

interface BackupManagerProps {
  onClose: () => void
}

const BackupManager: React.FC<BackupManagerProps> = ({ onClose }) => {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null)
  const [previewData, setPreviewData] = useState<BackupSnapshot | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isBacking, setIsBacking] = useState(false)

  // 加载备份列表
  const loadBackups = useCallback(async () => {
    if (!canUseNativeBackup()) {
      setError('当前环境不支持备份管理')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const result = await window.tiaoma!.backup.list!()
      if (result.ok && result.files) {
        setBackups(result.files)
      } else {
        setError(result.error || '加载备份列表失败')
      }
    } catch (e) {
      setError('加载备份列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  // 立即备份
  const handleBackupNow = async () => {
    try {
      setIsBacking(true)
      setError(null)
      const result = await saveBackupNow({ retentionDays: 365 })
      if (result.ok) {
        setSuccess('备份成功')
        await loadBackups()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || '备份失败')
      }
    } catch (e) {
      setError('备份失败')
    } finally {
      setIsBacking(false)
    }
  }

  // 预览备份
  const handlePreview = async (backup: BackupFile) => {
    try {
      setSelectedBackup(backup)
      const result = await window.tiaoma!.backup.read!(backup.path)
      if (result.ok && result.content) {
        const data = JSON.parse(result.content) as BackupSnapshot
        setPreviewData(data)
      } else {
        setError(result.error || '读取备份失败')
      }
    } catch (e) {
      setError('解析备份文件失败')
    }
  }

  // 恢复备份
  const handleRestore = async () => {
    if (!selectedBackup || !previewData) return

    try {
      setIsRestoring(true)
      setError(null)

      // 导入快照到数据库
      const success = window.tiaoma!.db!.importSnapshot(previewData)

      if (success) {
        setSuccess('数据恢复成功，请刷新页面查看')
        setShowRestoreConfirm(false)
        setPreviewData(null)
        setSelectedBackup(null)
      } else {
        setError('恢复失败')
      }
    } catch (e) {
      setError('恢复失败')
    } finally {
      setIsRestoring(false)
    }
  }

  // 删除备份
  const handleDelete = async () => {
    if (!selectedBackup) return

    try {
      const result = await window.tiaoma!.backup.delete!(selectedBackup.path)
      if (result.ok) {
        setSuccess('备份已删除')
        setShowDeleteConfirm(false)
        setSelectedBackup(null)
        setPreviewData(null)
        await loadBackups()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || '删除失败')
      }
    } catch (e) {
      setError('删除失败')
    }
  }

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  // 获取表数据统计
  const getTableStats = (tables: Record<string, unknown[]>) => {
    const stats: Array<{ name: string; count: number }> = []
    const tableNames: Record<string, string> = {
      materials: '物料',
      material_batches: '批次',
      suppliers: '供应商',
      barcodes: '条码',
      users: '用户',
      audit_logs: '审计日志',
      system_settings: '系统设置',
    }

    for (const [key, rows] of Object.entries(tables)) {
      if (Array.isArray(rows) && rows.length > 0) {
        stats.push({
          name: tableNames[key] || key,
          count: rows.length,
        })
      }
    }

    return stats
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <CloudArrowUpIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                备份管理
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                管理数据备份，支持恢复历史数据
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackupNow}
              disabled={isBacking}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isBacking ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              )}
              {isBacking ? '备份中...' : '立即备份'}
            </button>
            <button
              onClick={() => openBackupFolder()}
              className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <FolderOpenIcon className="h-4 w-4 mr-2" />
              打开目录
            </button>
          </div>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* 状态消息 */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <XMarkIcon className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-700 dark:text-green-300 text-sm">{success}</span>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 备份列表 */}
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                备份文件 ({backups.length})
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无备份文件</p>
                  <p className="text-sm mt-1">点击"立即备份"创建第一个备份</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div
                      key={backup.path}
                      onClick={() => handlePreview(backup)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedBackup?.path === backup.path
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {backup.name.replace('tiaoma-backup-', '').replace('.json', '')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatSize(backup.size)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(backup.mtime), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 预览区域 */}
          <div className="w-1/2 overflow-y-auto">
            <div className="p-4">
              {selectedBackup && previewData ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      备份详情
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowRestoreConfirm(true)}
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        恢复
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        删除
                      </button>
                    </div>
                  </div>

                  {/* 基本信息 */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">备份时间</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {format(new Date(previewData.exported_at), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">版本</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          v{previewData.version}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">文件大小</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatSize(selectedBackup.size)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">数据表数量</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {Object.keys(previewData.tables).length} 个
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 数据统计 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      数据统计
                    </h4>
                    <div className="space-y-2">
                      {getTableStats(previewData.tables).map((stat) => (
                        <div
                          key={stat.name}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {stat.name}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {stat.count} 条
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500 dark:text-gray-400">
                  <DocumentTextIcon className="h-16 w-16 mb-4 opacity-30" />
                  <p>选择左侧备份文件查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            提示：恢复备份将覆盖当前所有数据，请谨慎操作。建议在恢复前先创建一个新备份。
          </p>
        </div>
      </div>

      {/* 恢复确认对话框 */}
      {showRestoreConfirm && (
        <ConfirmDialog
          title="确认恢复数据"
          message={`确定要从备份 "${selectedBackup?.name}" 恢复数据吗？\n\n⚠️ 此操作将覆盖当前所有数据，不可撤销！\n\n建议先点击"立即备份"保存当前数据。`}
          onConfirm={handleRestore}
          onCancel={() => setShowRestoreConfirm(false)}
          variant="danger"
          confirmText={isRestoring ? '恢复中...' : '确认恢复'}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="确认删除备份"
          message={`确定要删除备份文件 "${selectedBackup?.name}" 吗？\n\n此操作不可撤销。`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
          confirmText="确认删除"
        />
      )}
    </div>
  )
}

export default BackupManager

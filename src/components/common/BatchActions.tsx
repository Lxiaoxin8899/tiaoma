/**
 * 批量操作组件
 * 提供多选、批量删除、批量导出等功能
 */

import React, { useState, useCallback } from 'react'
import {
  TrashIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CheckIcon,
  XMarkIcon,
  Square2StackIcon,
} from '@heroicons/react/24/outline'
import ConfirmDialog from './ConfirmDialog'

export interface BatchActionsProps<T> {
  items: T[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  getItemId: (item: T) => string
  onBatchDelete?: (ids: string[]) => Promise<void>
  onBatchExport?: (ids: string[]) => Promise<void>
  onBatchPrint?: (ids: string[]) => void
  deleteConfirmMessage?: string
  className?: string
}

function BatchActions<T>({
  items,
  selectedIds,
  onSelectionChange,
  getItemId,
  onBatchDelete,
  onBatchExport,
  onBatchPrint,
  deleteConfirmMessage = '确定要删除选中的项目吗？此操作不可恢复。',
  className = '',
}: BatchActionsProps<T>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const selectedCount = selectedIds.size
  const allSelected = items.length > 0 && selectedCount === items.length
  const someSelected = selectedCount > 0 && selectedCount < items.length

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(items.map(getItemId)))
    }
  }, [allSelected, items, getItemId, onSelectionChange])

  // 清除选择
  const handleClearSelection = useCallback(() => {
    onSelectionChange(new Set())
  }, [onSelectionChange])

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (!onBatchDelete || selectedCount === 0) return

    setIsDeleting(true)
    try {
      await onBatchDelete(Array.from(selectedIds))
      onSelectionChange(new Set())
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [onBatchDelete, selectedIds, selectedCount, onSelectionChange])

  // 批量导出
  const handleBatchExport = useCallback(async () => {
    if (!onBatchExport || selectedCount === 0) return

    setIsExporting(true)
    try {
      await onBatchExport(Array.from(selectedIds))
    } finally {
      setIsExporting(false)
    }
  }, [onBatchExport, selectedIds, selectedCount])

  // 批量打印
  const handleBatchPrint = useCallback(() => {
    if (!onBatchPrint || selectedCount === 0) return
    onBatchPrint(Array.from(selectedIds))
  }, [onBatchPrint, selectedIds, selectedCount])

  if (items.length === 0) return null

  return (
    <div className={`flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 ${className}`}>
      {/* 左侧：选择控制 */}
      <div className="flex items-center space-x-4">
        {/* 全选复选框 */}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected
            }}
            onChange={handleSelectAll}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            全选
          </span>
        </label>

        {/* 选中数量 */}
        {selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              已选 {selectedCount} 项
            </span>
            <button
              onClick={handleClearSelection}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="清除选择"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* 右侧：批量操作按钮 */}
      {selectedCount > 0 && (
        <div className="flex items-center space-x-2">
          {/* 批量导出 */}
          {onBatchExport && (
            <button
              onClick={handleBatchExport}
              disabled={isExporting}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
              {isExporting ? '导出中...' : '导出'}
            </button>
          )}

          {/* 批量打印 */}
          {onBatchPrint && (
            <button
              onClick={handleBatchPrint}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
            >
              <PrinterIcon className="h-4 w-4 mr-1.5" />
              打印
            </button>
          )}

          {/* 批量删除 */}
          {onBatchDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4 mr-1.5" />
              {isDeleting ? '删除中...' : '删除'}
            </button>
          )}
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="批量删除"
          message={`${deleteConfirmMessage}\n\n将删除 ${selectedCount} 个项目。`}
          onConfirm={handleBatchDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}
    </div>
  )
}

export default BatchActions

/**
 * 使用多选功能的 Hook
 */
export function useSelection<T>(
  items: T[],
  getItemId: (item: T) => string
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id)
  }, [selectedIds])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getItemId)))
  }, [items, getItemId])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const getSelectedItems = useCallback(() => {
    return items.filter(item => selectedIds.has(getItemId(item)))
  }, [items, selectedIds, getItemId])

  return {
    selectedIds,
    setSelectedIds,
    toggleSelection,
    isSelected,
    selectAll,
    clearSelection,
    getSelectedItems,
    selectedCount: selectedIds.size,
  }
}

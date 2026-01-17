import React, { useCallback, useMemo, useState } from 'react'
import { XMarkIcon, ArrowUturnLeftIcon, TrashIcon } from '@heroicons/react/24/outline'
import { db } from '@/lib/localdb'
import { notify } from '@/lib/notify'

// =============================================================================
// 回收站（单机模式）
//
// 说明：
// - 基于 localStorage 软删除（_deleted/_deleted_at）实现
// - 用于“误删可恢复”，降低数据丢失风险
// =============================================================================

type TableKey = 'materials' | 'material_batches' | 'suppliers' | 'barcodes'

interface RecycleBinModalProps {
  onClose: () => void
}

type DeletedRow = { id: string; _deleted_at?: string | null } & Record<string, unknown>

const getRowTitle = (table: TableKey, row: DeletedRow) => {
  switch (table) {
    case 'materials':
      return `${String(row?.name || '')} (${String(row?.code || '')})`
    case 'material_batches':
      return `${String(row?.batch_number || '')}`
    case 'suppliers':
      return `${String(row?.name || '')} (${String(row?.code || '')})`
    case 'barcodes':
      return `${String(row?.barcode || row?.data || '')}`
    default:
      return row?.id || ''
  }
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({ onClose }) => {
  const [active, setActive] = useState<TableKey>('materials')
  const [refreshKey, setRefreshKey] = useState(0)

  const deletedRows = useMemo(() => {
    // 说明：通过 refreshKey 强制重算（恢复/永久删除后刷新）
    void refreshKey
    return (db.listDeleted(active) as DeletedRow[]).sort((a, b) => {
      const av = String(a._deleted_at || '')
      const bv = String(b._deleted_at || '')
      return bv.localeCompare(av)
    })
  }, [active, refreshKey])

  const refresh = useCallback(() => setRefreshKey((x) => x + 1), [])

  const handleRestore = useCallback(
    (id: string) => {
      const restored = db.restore(active, id)
      if (restored) {
        notify.success('已恢复', '数据已从回收站恢复')
        refresh()
      } else {
        notify.error('恢复失败', '未找到需要恢复的数据')
      }
    },
    [active, refresh],
  )

  const handleHardDelete = useCallback(
    (id: string) => {
      // 说明：永久删除不可恢复；这里仍保留二次确认（浏览器 confirm）
      const ok = window.confirm('确定要永久删除吗？该操作不可恢复。')
      if (!ok) return
      const deleted = db.hardDelete(active, id)
      if (deleted) {
        notify.success('已永久删除')
        refresh()
      } else {
        notify.error('删除失败', '未找到需要删除的数据')
      }
    },
    [active, refresh],
  )

  const tabs: Array<{ key: TableKey; name: string }> = [
    { key: 'materials', name: '物料' },
    { key: 'material_batches', name: '批次' },
    { key: 'suppliers', name: '供应商' },
    { key: 'barcodes', name: '条码' },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900/70 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">回收站</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                这里是已删除数据的暂存区，可恢复或永久删除。
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-800 mb-4">
            <nav className="-mb-px flex space-x-6">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={`py-2 px-1 border-b-2 text-sm font-medium ${
                    active === t.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="max-h-[60vh] overflow-auto">
            {deletedRows.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">暂无已删除数据</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      名称/标识
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      删除时间
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {deletedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{getRowTitle(active, row)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {row?._deleted_at ? String(row._deleted_at) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleRestore(row.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <ArrowUturnLeftIcon className="h-4 w-4" />
                            恢复
                          </button>
                          <button
                            onClick={() => handleHardDelete(row.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <TrashIcon className="h-4 w-4" />
                            永久删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecycleBinModal

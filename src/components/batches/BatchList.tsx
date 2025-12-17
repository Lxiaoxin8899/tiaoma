import React, { useState, useEffect } from 'react'
import { useBatchStore } from '@/stores/batchStore'
import { useMaterialStore } from '@/stores/materialStore'
import { MaterialBatch } from '@/types/database'
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import BatchForm from './BatchForm'
import BatchDetailModal from './BatchDetailModal'
import OutboundModal from './OutboundModal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import Pagination from '@/components/common/Pagination'
import { getStatusBadgeColor } from '@/utils/statusHelpers'
import { exportToExcel, getDateSuffix } from '@/lib/exportUtils'
import { useToast } from '@/components/common/Toast'

const BatchList: React.FC = () => {
  const {
    batches,
    loading,
    totalCount,
    currentPage,
    pageSize,
    searchQuery,
    selectedMaterialId,
    setSearchQuery,
    setSelectedMaterialId,
    setPagination,
    fetchBatches,
    updateBatch,
    deleteBatch
  } = useBatchStore()

  const { materials, fetchMaterials } = useMaterialStore()
  const { success, error: showError } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showOutbound, setShowOutbound] = useState(false)

  const [selectedBatch, setSelectedBatch] = useState<MaterialBatch | null>(null)
  const [editingBatch, setEditingBatch] = useState<MaterialBatch | null>(null)
  const [outboundBatch, setOutboundBatch] = useState<MaterialBatch | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchMaterials()
    fetchBatches()
  }, [fetchMaterials, fetchBatches])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches, currentPage, pageSize, searchQuery, selectedMaterialId])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleMaterialFilter = (materialId: string) => {
    setSelectedMaterialId(materialId === 'all' ? null : materialId)
  }

  const handlePageChange = (page: number) => {
    setPagination(page, pageSize)
  }

  const handlePageSizeChange = (size: number) => {
    setPagination(1, size)
  }

  const handleCreate = () => {
    setEditingBatch(null)
    setShowForm(true)
  }

  const handleEdit = (batch: MaterialBatch) => {
    setEditingBatch(batch)
    setShowForm(true)
  }

  const handleView = (batch: MaterialBatch) => {
    setSelectedBatch(batch)
    setShowDetail(true)
  }

  const handleDelete = (batch: MaterialBatch) => {
    setSelectedBatch(batch)
    setShowDeleteConfirm(true)
  }

  const handleOutboundClick = (batch: MaterialBatch) => {
    setOutboundBatch(batch)
    setShowOutbound(true)
  }

  const handleOutboundSubmit = async (quantity: number, reason: string) => {
    if (!outboundBatch) return

    // 说明：数据库里批次的“当前库存”字段为 remaining_quantity（quantity 表示入库数量/初始数量）。
    const currentRemaining = outboundBatch.remaining_quantity ?? outboundBatch.quantity
    const newRemaining = Math.max(0, currentRemaining - quantity)
    const newRemarks = outboundBatch.remarks
      ? `${outboundBatch.remarks}\n[${format(new Date(), 'yyyy-MM-dd HH:mm')}] 出库 ${quantity} (原因: ${reason || '无'})`
      : `[${format(new Date(), 'yyyy-MM-dd HH:mm')}] 出库 ${quantity} (原因: ${reason || '无'})`

    const ok = await updateBatch(outboundBatch.id, {
      remaining_quantity: newRemaining,
      remarks: newRemarks,
      // 当前库存为 0 时，标记为“已处置”
      status: newRemaining === 0 ? 'disposed' : outboundBatch.status
    })

    if (ok) {
      success('出库成功')
      fetchBatches()
    } else {
      showError('出库失败', '请重试')
      throw new Error('出库失败')
    }
  }

  const confirmDelete = async () => {
    if (selectedBatch) {
      await deleteBatch(selectedBatch.id)
      setShowDeleteConfirm(false)
      setSelectedBatch(null)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingBatch(null)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingBatch(null)
    fetchBatches()
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)

      if (batches.length === 0) {
        showError('导出失败', '没有数据可以导出')
        return
      }

      // 定义列映射
      const columnMap = {
        'batch_number': '批次号',
        'material.code': '物料编码',
        'material.name': '物料名称',
        'material.specification': '规格型号',
        'quantity': '入库数量',
        'remaining_quantity': '当前库存',
        'material.unit_obj.name': '单位',
        'production_date': '生产日期',
        'expiry_date': '有效期',
        'supplier.name': '供应商',
        'supplier.code': '供应商编码',
        'status': '状态',
        'location': '存储位置',
        'remarks': '备注',
        'created_at': '创建时间'
      }

      // 生成文件名
      const filename = `入库记录_${getDateSuffix()}`

      // 导出数据
      exportToExcel(batches, filename, '入库记录', columnMap)

      success('导出成功', `数据已导出到 ${filename}.xlsx`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '导出失败'
      showError('导出失败', message)
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待入库',
      available: '可用',
      locked: '锁定',
      expired: '过期',
      disposed: '已处置'
    }
    return statusMap[status] || status
  }

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">入库记录</h2>
          <p className="text-gray-600 text-sm">查看和管理物料入库批次</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={isExporting || batches.length === 0}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            {isExporting ? '导出中...' : '导出'}
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            新建入库
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索批次号、物料名称..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Material Filter */}
          <div className="sm:w-48">
            <select
              value={selectedMaterialId || 'all'}
              onChange={(e) => handleMaterialFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">所有物料</option>
              {materials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.code} - {material.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Batch List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  批次号/时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  物料信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  当前库存
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  有效期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <DocumentDuplicateIcon className="w-12 h-12 text-gray-300 mb-2" />
                      <p>暂无入库记录</p>
                      <p className="text-sm text-gray-400 mt-1">点击右上角"新建入库"按钮</p>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {batch.batch_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(batch.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {batch.material?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {batch.material?.code} {batch.material?.specification ? `· ${batch.material.specification}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {(batch.remaining_quantity ?? batch.quantity)}{' '}
                        <span className="font-normal text-gray-500 text-xs">
                          {batch.material?.unit_obj?.name || batch.material?.unit}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {batch.expiry_date ? format(new Date(batch.expiry_date), 'yyyy-MM-dd') : '-'}
                      </div>
                      {batch.expiry_date && isExpired(batch.expiry_date) && (
                        <div className="text-xs text-red-600 font-medium">已过期</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(batch.status)
                        }`}>
                        {getStatusText(batch.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        {(batch.remaining_quantity ?? batch.quantity) > 0 && batch.status === 'available' && (
                          <button
                            onClick={() => handleOutboundClick(batch)}
                            className="text-orange-600 hover:text-orange-900 flex items-center"
                            title="出库"
                          >
                            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                            出库
                          </button>
                        )}
                        <button
                          onClick={() => handleView(batch)}
                          className="text-blue-600 hover:text-blue-900"
                          title="查看详情"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(batch)}
                          className="text-green-600 hover:text-green-900"
                          title="编辑"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(batch)}
                          className="text-red-600 hover:text-red-900"
                          title="删除"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <BatchForm
          batch={editingBatch}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetail && selectedBatch && (
        <BatchDetailModal
          batch={selectedBatch}
          onClose={() => setShowDetail(false)}
        />
      )}

      {showOutbound && outboundBatch && (
        <OutboundModal
          batch={outboundBatch}
          onClose={() => {
            setShowOutbound(false)
            setOutboundBatch(null)
          }}
          onConfirm={handleOutboundSubmit}
        />
      )}

      {showDeleteConfirm && selectedBatch && (
        <ConfirmDialog
          title="删除入库记录"
          message={`确定要删除此入库记录 "${selectedBatch.batch_number}" 吗？删除后不可恢复。`}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}
    </div>
  )
}

export default BatchList

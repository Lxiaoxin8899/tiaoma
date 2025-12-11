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
  FunnelIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import BatchForm from './BatchForm'
import BatchDetailModal from './BatchDetailModal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import Pagination from '@/components/common/Pagination'
import { getStatusBadgeColor } from '@/utils/statusHelpers'

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
    deleteBatch
  } = useBatchStore()
  
  const { materials, fetchMaterials } = useMaterialStore()
  
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<MaterialBatch | null>(null)
  const [editingBatch, setEditingBatch] = useState<MaterialBatch | null>(null)

  useEffect(() => {
    fetchMaterials()
    fetchBatches()
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [currentPage, pageSize, searchQuery, selectedMaterialId])

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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '活跃',
      completed: '完成',
      expired: '过期',
      cancelled: '取消'
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
          <h1 className="text-2xl font-bold text-gray-900">批次管理</h1>
          <p className="text-gray-600">管理物料批次信息，包括批次号、生产日期、有效期等</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          新建批次
        </button>
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
                placeholder="搜索批次号或物料名称..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Material Filter */}
          <div className="sm:w-48">
            <select
              value={selectedMaterialId || 'all'}
              onChange={(e) => handleMaterialFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  批次号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  物料信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  生产日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  有效期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  供应商
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
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <DocumentDuplicateIcon className="w-12 h-12 text-gray-300 mb-2" />
                      <p>暂无批次数据</p>
                      <p className="text-sm text-gray-400 mt-1">点击上方"新建批次"按钮创建第一个批次</p>
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
                        {batch.material?.code} · {batch.material?.specification}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {batch.quantity} {batch.material?.unit_obj?.name || batch.material?.unit}
                      </div>
                      {batch.quantity < 10 && (
                        <div className="text-xs text-orange-600 font-medium">库存偏低</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.production_date ? format(new Date(batch.production_date), 'yyyy-MM-dd') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {batch.expiry_date ? format(new Date(batch.expiry_date), 'yyyy-MM-dd') : '-'}
                      </div>
                      {batch.expiry_date && isExpired(batch.expiry_date) && (
                        <div className="text-xs text-red-600 font-medium">已过期</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {batch.supplier ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {batch.supplier.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {batch.supplier.code}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusBadgeColor(batch.status)
                      }`}>
                        {getStatusText(batch.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
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

      {showDeleteConfirm && selectedBatch && (
        <ConfirmDialog
          title="删除批次"
          message={`确定要删除批次 "${selectedBatch.batch_number}" 吗？此操作不可恢复。`}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}
    </div>
  )
}

export default BatchList
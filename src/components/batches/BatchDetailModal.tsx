import React from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, CalendarIcon, MapPinIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { MaterialBatch } from '@/types/database'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { getStatusBadgeColor, getStatusText } from '@/utils/statusHelpers'

interface BatchDetailModalProps {
  batch: MaterialBatch
  onClose: () => void
}

const BatchDetailModal: React.FC<BatchDetailModalProps> = ({ batch, onClose }) => {
  // 说明：remaining_quantity 表示批次当前库存；quantity 表示入库数量/初始数量。
  const remainingQty = batch.remaining_quantity ?? batch.quantity

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'yyyy年MM月dd日', { locale: zhCN })
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                批次详情
              </Dialog.Title>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusBadgeColor(batch.status)
              }`}>
                {getStatusText(batch.status)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-500" />
                基本信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">批次号</label>
                  <p className="text-sm text-gray-900 font-medium">{batch.batch_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">当前库存</label>
                  <p className="text-sm text-gray-900">
                    {remainingQty} {batch.material?.unit_obj?.name || batch.material?.unit}
                    {remainingQty < 10 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        库存偏低
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">入库数量：{batch.quantity}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <p className="text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getStatusBadgeColor(batch.status)
                    }`}>
                      {getStatusText(batch.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">存储位置</label>
                  <p className="text-sm text-gray-900">{batch.location || '-'}</p>
                </div>
              </div>
            </div>

            {/* Material Information */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">物料信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
                  <p className="text-sm text-gray-900 font-medium">{batch.material?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">物料编码</label>
                  <p className="text-sm text-gray-900">{batch.material?.code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">规格型号</label>
                  <p className="text-sm text-gray-900">{batch.material?.specification || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <p className="text-sm text-gray-900">{batch.material?.unit_obj?.name || batch.material?.unit}</p>
                </div>
              </div>
            </div>

            {/* Date Information */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-gray-500" />
                日期信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">生产日期</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(batch.production_date)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">有效期</label>
                  <p className="text-sm">
                    <span className={batch.expiry_date && isExpired(batch.expiry_date) ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {formatDate(batch.expiry_date)}
                    </span>
                    {batch.expiry_date && isExpired(batch.expiry_date) && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        已过期
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                  <p className="text-sm text-gray-900">{formatDateTime(batch.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">更新时间</label>
                  <p className="text-sm text-gray-900">{formatDateTime(batch.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            {batch.supplier && (
              <div className="bg-yellow-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">供应商信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称</label>
                    <p className="text-sm text-gray-900 font-medium">{batch.supplier.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商编码</label>
                    <p className="text-sm text-gray-900">{batch.supplier.code}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Location and Remarks */}
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPinIcon className="w-5 h-5 mr-2 text-gray-500" />
                其他信息
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">存储位置</label>
                  <p className="text-sm text-gray-900">{batch.location || '-'}</p>
                </div>
                {batch.remarks && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{batch.remarks}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                审计信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                  <p className="text-sm text-gray-900">{formatDateTime(batch.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">更新时间</label>
                  <p className="text-sm text-gray-900">{formatDateTime(batch.updated_at)}</p>
                </div>
                {batch.created_by && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">创建人</label>
                    <p className="text-sm text-gray-900">{batch.created_by}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              关闭
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default BatchDetailModal

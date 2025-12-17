import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useBatchStore } from '@/stores/batchStore'
import { useMaterialStore } from '@/stores/materialStore'
import { useSupplierStore } from '@/stores/supplierStore'
import { BatchFormData, MaterialBatch } from '@/types/database'
import SearchableSelect from '@/components/common/SearchableSelect'

interface BatchFormProps {
  batch?: MaterialBatch | null
  onClose: () => void
  onSuccess: () => void
}

const BatchForm: React.FC<BatchFormProps> = ({ batch, onClose, onSuccess }) => {
  const { createBatch, updateBatch } = useBatchStore()
  const { materials, fetchMaterials } = useMaterialStore()
  const { suppliers, fetchSuppliers } = useSupplierStore()

  const [formData, setFormData] = useState<BatchFormData>({
    material_id: batch?.material_id || '',
    batch_number: batch?.batch_number || '',
    quantity: batch?.quantity || 0,
    production_date: batch?.production_date || '',
    expiry_date: batch?.expiry_date || '',
    supplier_id: batch?.supplier_id || null,
    location: batch?.location || '',
    remarks: batch?.remarks || '',
    status: batch?.status || 'pending'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMaterials()
    fetchSuppliers()
  }, [fetchMaterials, fetchSuppliers])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.material_id) {
      newErrors.material_id = '请选择物料'
    }

    if (!formData.batch_number) {
      newErrors.batch_number = '请输入批次号'
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = '数量必须大于0'
    }

    if (formData.production_date && formData.expiry_date) {
      if (new Date(formData.production_date) >= new Date(formData.expiry_date)) {
        newErrors.expiry_date = '有效期必须晚于生产日期'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      let success = false

      if (batch) {
        success = await updateBatch(batch.id, formData)
      } else {
        success = await createBatch(formData)
      }

      if (success) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error submitting batch form:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof BatchFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getMaterialById = (id: string) => {
    return materials.find(m => m.id === id)
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {batch ? '编辑入库单' : '新建入库单'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Material Selection */}
            <SearchableSelect
              label="物料"
              required
              value={formData.material_id}
              onChange={(value) => handleInputChange('material_id', value)}
              options={materials.map(material => ({
                id: material.id,
                label: `${material.code} - ${material.name}`,
                subtitle: material.specification || undefined
              }))}
              placeholder="搜索物料编码、名称..."
              disabled={!!batch}
              error={errors.material_id}
            />

            {/* Batch Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                批次号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => handleInputChange('batch_number', e.target.value)}
                placeholder="请输入批次号"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.batch_number ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.batch_number && (
                <p className="mt-1 text-sm text-red-600">{errors.batch_number}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {formData.material_id && (
                <p className="mt-1 text-sm text-gray-500">
                  单位: {getMaterialById(formData.material_id)?.unit_obj?.name || getMaterialById(formData.material_id)?.unit || '未知'}
                </p>
              )}
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
              )}
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生产日期
                </label>
                <input
                  type="date"
                  value={formData.production_date ? formData.production_date.split('T')[0] : ''}
                  onChange={(e) => handleInputChange('production_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  有效期
                </label>
                <input
                  type="date"
                  value={formData.expiry_date ? formData.expiry_date.split('T')[0] : ''}
                  onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.expiry_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.expiry_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.expiry_date}</p>
                )}
              </div>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                供应商
              </label>
              <select
                value={formData.supplier_id || ''}
                onChange={(e) => handleInputChange('supplier_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择供应商（可选）</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code} - {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                存储位置
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="请输入存储位置"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">待入库</option>
                <option value="available">可用</option>
                <option value="locked">锁定</option>
                <option value="expired">过期</option>
                <option value="disposed">已处置</option>
              </select>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                rows={3}
                placeholder="请输入备注信息"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '保存中...' : batch ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default BatchForm

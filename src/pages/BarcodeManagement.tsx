import React from 'react'
import BarcodeGeneratorRedesigned from '@/components/barcodes/BarcodeGeneratorRedesigned'
import { useAuthStore } from '@/stores/authStore'

const BarcodeManagement: React.FC = () => {
  const { hasPermission } = useAuthStore()

  if (!hasPermission('read_barcodes')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">权限不足</h3>
          <p className="text-gray-500">您没有查看条码生成的权限</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">条码管理器</h1>
        <p className="mt-1 text-sm text-gray-500">
          物料/批次条码预览与打印
        </p>
      </div>
      <BarcodeGeneratorRedesigned />
    </div>
  )
}

export default BarcodeManagement

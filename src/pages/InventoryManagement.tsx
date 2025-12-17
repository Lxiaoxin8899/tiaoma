import React, { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import BatchList from '@/components/batches/BatchList'
import {
    ArchiveBoxArrowDownIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/outline'

const InventoryManagement: React.FC = () => {
    const { hasPermission } = useAuthStore()
    const [activeTab, setActiveTab] = useState<'inbound' | 'outbound' | 'overview'>('inbound')

    if (!hasPermission('read_batches')) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">权限不足</h3>
                    <p className="text-gray-500">您没有查看库存管理的权限</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">库存管理</h1>
                <p className="mt-1 text-sm text-gray-500">
                    管理物料的入库、出库及库存盘点
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border mb-6 px-4">
                <div className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('inbound')}
                        className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inbound'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <ArchiveBoxArrowDownIcon className="w-5 h-5 mr-2" />
                        入库记录
                    </button>

                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <ArchiveBoxIcon className="w-5 h-5 mr-2" />
                        库存概览
                        <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">
                            统计
                        </span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow-sm">
                {activeTab === 'inbound' && (
                    // Reusing BatchList but it will be modified to look like Inbound Log
                    <BatchList />
                )}

                {activeTab === 'overview' && (
                    <div className="p-8 text-center text-gray-500">
                        <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>库存概览功能开发中...</p>
                        <p className="text-sm mt-2">目前请在入库记录中查看具体批次库存。</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default InventoryManagement

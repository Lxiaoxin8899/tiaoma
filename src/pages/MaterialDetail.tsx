import React, { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMaterialStore } from '@/stores/materialStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import StatusBadge from '@/components/common/StatusBadge'

// 物料详情页：用于承接物料列表里的“查看详情”链接
const MaterialDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { materials, loading, fetchMaterials, getMaterialById } = useMaterialStore()

  const material = id ? getMaterialById(id) : undefined

  useEffect(() => {
    if (!id) return

    // 离线模式/小数据量场景下，直接拉取较大的 limit 以保证能拿到目标记录
    if (!material && materials.length === 0) {
      fetchMaterials({ page: 1, limit: 1000 })
    }
  }, [id, material, materials.length, fetchMaterials])

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-xl font-semibold text-gray-900">参数错误</h1>
          <p className="mt-2 text-sm text-gray-600">缺少物料 ID。</p>
          <Link className="mt-4 inline-block text-blue-600 hover:text-blue-800" to="/materials">
            返回物料列表
          </Link>
        </div>
      </div>
    )
  }

  if (loading && !material) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!material) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-xl font-semibold text-gray-900">未找到物料</h1>
          <p className="mt-2 text-sm text-gray-600">该物料可能已被删除，或当前列表尚未加载到该记录。</p>
          <Link className="mt-4 inline-block text-blue-600 hover:text-blue-800" to="/materials">
            返回物料列表
          </Link>
        </div>
      </div>
    )
  }

  const statusTextMap: Record<string, string> = {
    active: '可用',
    inactive: '停用',
    discontinued: '报废',
  }

  const statusColorMap: Record<string, 'green' | 'gray' | 'red'> = {
    active: 'green',
    inactive: 'gray',
    discontinued: 'red',
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{material.name}</h1>
          <p className="mt-1 text-sm text-gray-600">{material.code}</p>
        </div>
        <Link className="text-blue-600 hover:text-blue-800 text-sm font-medium" to="/materials">
          返回列表
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-500">分类</div>
            <div className="mt-1 text-gray-900">{material.category?.name || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">单位</div>
            <div className="mt-1 text-gray-900">{material.unit_obj?.symbol || material.unit || '-'}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">状态</div>
            <div className="mt-1">
              <StatusBadge
                status={material.status}
                color={statusColorMap[material.status] ?? 'gray'}
                text={statusTextMap[material.status] ?? material.status}
                size="sm"
              />
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">规格</div>
            <div className="mt-1 text-gray-900">{material.specification || '-'}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">库存</div>
            <div className="mt-1 text-gray-900">
              {material.current_stock}（最小 {material.min_stock} / 最大 {material.max_stock}）
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">更新时间</div>
            <div className="mt-1 text-gray-900">
              {material.updated_at ? new Date(material.updated_at).toLocaleString('zh-CN') : '-'}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-gray-500">描述</div>
            <div className="mt-1 text-gray-900 whitespace-pre-wrap">{material.description || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaterialDetail

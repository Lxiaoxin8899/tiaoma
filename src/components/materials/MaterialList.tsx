import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon, 
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useMaterialStore } from '../../stores/materialStore';
import { Material } from '../../types/database';
import MaterialForm from './MaterialForm';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import Pagination from '../common/Pagination';

const MaterialList: React.FC = () => {
  const {
    materials,
    categories,
    loading,
    error,
    currentPage,
    totalPages,
    fetchMaterials,
    fetchCategories,
    deleteMaterial,
    searchMaterials,
    filterByCategory,
    filterByStatus
  } = useMaterialStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);

  useEffect(() => {
    fetchMaterials();
    fetchCategories();
  }, [fetchMaterials, fetchCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchMaterials(searchTerm);
  };

  const handleCategoryFilter = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      filterByCategory(categoryId);
    } else {
      fetchMaterials();
    }
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    if (status) {
      filterByStatus(status);
    } else {
      fetchMaterials();
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedStatus('');
    fetchMaterials();
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleDelete = (material: Material) => {
    setDeletingMaterial(material);
  };

  const confirmDelete = async () => {
    if (deletingMaterial) {
      await deleteMaterial(deletingMaterial.id);
      setDeletingMaterial(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMaterial(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchMaterials();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'discontinued': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '可用';
      case 'inactive': return '停用';
      case 'discontinued': return '报废';
      default: return status;
    }
  };

  if (loading && materials.length === 0 && !showForm) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">物料管理</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>新建物料</span>
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索物料编码、名称或规格..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有分类</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有状态</option>
                <option value="active">可用</option>
                <option value="inactive">停用</option>
                <option value="discontinued">报废</option>
              </select>

              <button
                type="button"
                onClick={handleRefresh}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center space-x-1 transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 物料列表 */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    物料编码
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    物料名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    规格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    单位
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    库存
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
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {material.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {material.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {material.specification || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.unit_obj?.symbol || material.unit || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className={`font-medium ${
                          material.current_stock <= material.min_stock 
                            ? 'text-red-600' 
                            : material.current_stock > material.max_stock
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }`}>
                          {material.current_stock}
                        </span>
                        <span className="text-gray-500 ml-1">/{material.min_stock}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge 
                        status={material.status} 
                        color={getStatusColor(material.status)}
                        text={getStatusText(material.status)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/materials/${material.id}`}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="查看详情"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(material)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="编辑"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(material)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="删除"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {materials.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-lg">暂无物料数据</p>
                <p className="text-sm mt-2">点击上方"新建物料"按钮创建第一个物料</p>
              </div>
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => fetchMaterials({ page })}
            />
          </div>
        )}
      </div>

      {/* 表单模态框 */}
      {showForm && (
        <MaterialForm
          material={editingMaterial}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* 删除确认对话框 */}
      {deletingMaterial && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除物料 "${deletingMaterial.name}" (${deletingMaterial.code}) 吗？此操作不可恢复。`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingMaterial(null)}
        />
      )}
    </div>
  );
};

export default MaterialList;

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMaterialStore } from '../../stores/materialStore';
import { Material, MaterialFormData } from '../../types/database';
import { validateData } from '../../lib/supabase';

interface MaterialFormProps {
  material?: Material | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MaterialForm: React.FC<MaterialFormProps> = ({ material, onClose, onSuccess }) => {
  const { createMaterial, updateMaterial, categories, units, suppliers, fetchCategories, fetchUnits, fetchSuppliers } = useMaterialStore();
  
  const [formData, setFormData] = useState<MaterialFormData>({
    code: '',
    name: '',
    specification: '',
    unit_id: '',
    category_id: '',
    status: 'active',
    description: '',
    min_stock: 0,
    max_stock: 1000
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
    fetchSuppliers();
  }, [fetchCategories, fetchUnits, fetchSuppliers]);

  useEffect(() => {
    if (material) {
      setFormData({
        code: material.code,
        name: material.name,
        specification: material.specification || '',
        unit_id: material.unit_id,
        category_id: material.category_id,
        status: material.status,
        description: material.description || '',
        min_stock: material.min_stock,
        max_stock: material.max_stock
      });
    }
  }, [material]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.code.trim()) {
      newErrors.code = '物料编码是必填项';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = '物料名称是必填项';
    }
    
    if (!formData.unit_id) {
      newErrors.unit_id = '请选择单位';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = '请选择分类';
    }
    
    if (formData.min_stock < 0) {
      newErrors.min_stock = '最小库存不能小于0';
    }
    
    if (formData.max_stock < formData.min_stock) {
      newErrors.max_stock = '最大库存不能小于最小库存';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      let result;
      if (material) {
        result = await updateMaterial(material.id, formData);
      } else {
        result = await createMaterial(formData);
      }
      
      if (result) {
        onSuccess();
      }
    } catch (error) {
      console.error('保存物料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const generateCode = () => {
    const category = categories.find(c => c.id === formData.category_id);
    const unit = units.find(u => u.id === formData.unit_id);
    
    if (category && unit) {
      const timestamp = Date.now().toString().slice(-6);
      const code = `${category.code}-${unit.code}-${timestamp}`;
      setFormData(prev => ({ ...prev, code }));
    }
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {material ? '编辑物料' : '新建物料'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 基本信息 */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  物料编码 *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className={`flex-1 rounded-lg border ${errors.code ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                    placeholder="请输入物料编码"
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                    title="自动生成编码"
                  >
                    生成
                  </button>
                </div>
                {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  物料名称 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                  placeholder="请输入物料名称"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                  物料分类 *
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border ${errors.category_id ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                >
                  <option value="">请选择分类</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
              </div>

              <div>
                <label htmlFor="unit_id" className="block text-sm font-medium text-gray-700 mb-1">
                  计量单位 *
                </label>
                <select
                  id="unit_id"
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border ${errors.unit_id ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                >
                  <option value="">请选择单位</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
                {errors.unit_id && <p className="mt-1 text-sm text-red-600">{errors.unit_id}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="specification" className="block text-sm font-medium text-gray-700 mb-1">
                  规格型号
                </label>
                <input
                  type="text"
                  id="specification"
                  name="specification"
                  value={formData.specification}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="请输入规格型号"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="请输入物料描述"
                />
              </div>

              {/* 库存设置 */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">库存设置</h3>
              </div>

              <div>
                <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  最小库存 *
                </label>
                <input
                  type="number"
                  id="min_stock"
                  name="min_stock"
                  min="0"
                  step="0.01"
                  value={formData.min_stock}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border ${errors.min_stock ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                />
                {errors.min_stock && <p className="mt-1 text-sm text-red-600">{errors.min_stock}</p>}
              </div>

              <div>
                <label htmlFor="max_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  最大库存 *
                </label>
                <input
                  type="number"
                  id="max_stock"
                  name="max_stock"
                  min="0"
                  step="0.01"
                  value={formData.max_stock}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border ${errors.max_stock ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                />
                {errors.max_stock && <p className="mt-1 text-sm text-red-600">{errors.max_stock}</p>}
              </div>

              {/* 状态设置 */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">状态设置</h3>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  物料状态
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">可用</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">停用</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="discontinued"
                      checked={formData.status === 'discontinued'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">报废</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? '保存中...' : (material ? '更新' : '创建')}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default MaterialForm;
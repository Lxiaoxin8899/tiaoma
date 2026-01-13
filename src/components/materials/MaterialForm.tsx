import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMaterialStore } from '../../stores/materialStore';
import { Material, MaterialFormData } from '../../types/database';
import { useToast } from '../common/Toast';
import SearchableSelect from '../common/SearchableSelect';

interface MaterialFormProps {
  material?: Material | null;
  onClose: () => void;
  onSuccess: () => void;
}

type WeightUnit = 'g' | 'kg';

const parseWeightToAmountAndUnit = (weight?: string): { amount: string; unit: WeightUnit } => {
  // 说明：历史数据里 weight 可能是 "0.18KG"/"180g" 或者为空，这里尽量兼容解析成“数字 + 单位”
  const trimmed = (weight || '').trim();
  if (!trimmed) {
    return { amount: '', unit: 'g' };
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(kg|g)$/i);
  if (match) {
    return { amount: match[1], unit: match[2].toLowerCase() as WeightUnit };
  }

  // 兜底：提取数字部分，并根据是否包含 kg/g 判断单位
  const amount = trimmed.match(/(\d+(?:\.\d+)?)/)?.[1] ?? '';
  const unit: WeightUnit = /kg/i.test(trimmed) ? 'kg' : 'g';
  return { amount, unit };
};

const formatWeightForStorage = (amount: string, unit: WeightUnit): string => {
  // 说明：为保持与历史示例（如 "0.18KG"）一致，kg 用大写 "KG"，g 用小写 "g"
  const trimmedAmount = amount.trim();
  if (!trimmedAmount) return '';
  return `${trimmedAmount}${unit === 'kg' ? 'KG' : 'g'}`;
};

const MaterialForm: React.FC<MaterialFormProps> = ({ material, onClose, onSuccess }) => {
  const { createMaterial, updateMaterial, categories, units, suppliers, fetchCategories, fetchUnits, fetchSuppliers } = useMaterialStore();
  const { success, error: showError } = useToast();
  
  const [formData, setFormData] = useState<MaterialFormData>({
    code: '',
    name: '',
    specification: '',
    unit_id: '',
    category_id: '',
    // 说明：一个物料编码只绑定一个供应商；后续新建批次/打印条码时默认带出，避免重复选择
    supplier_id: null,
    status: 'active',
    description: '',
    min_stock: 0,
    max_stock: 1000,
    // 标签打印字段 - 设置默认值
    weight: '',
    storage_conditions: '存放于阴凉干燥通风处，密封避光',
    main_ingredients: '食品用香料、食品用香精辅料',
    shelf_life: '12个月'
  });

  // 说明：重量字段在标签上需要打印单位，因此 UI 采用“数字 + 单位(g/kg)”录入，提交时再合成到 weight 字段
  const [weightAmount, setWeightAmount] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('g');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
    fetchSuppliers();
  }, [fetchCategories, fetchUnits, fetchSuppliers]);

  useEffect(() => {
    if (material) {
      const parsedWeight = parseWeightToAmountAndUnit(material.weight);
      setFormData({
        code: material.code,
        name: material.name,
        specification: material.specification || '',
        unit_id: material.unit_id,
        category_id: material.category_id,
        supplier_id: material.supplier_id ?? null,
        status: material.status,
        description: material.description || '',
        min_stock: material.min_stock,
        max_stock: material.max_stock,
        // 标签打印字段
        weight: material.weight || '',
        storage_conditions: material.storage_conditions || '',
        main_ingredients: material.main_ingredients || '',
        shelf_life: material.shelf_life || ''
      });
      setWeightAmount(parsedWeight.amount);
      setWeightUnit(parsedWeight.unit);
    } else {
      // 新建时给重量单位一个默认值，减少用户操作
      setWeightAmount('');
      setWeightUnit('g');
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

    if (!formData.supplier_id) {
      newErrors.supplier_id = '请选择供应商';
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
      // 说明：提交前将“重量数字 + 单位”合成到 weight 字段，保证打印时能直接带出单位
      const submitData: MaterialFormData = {
        ...formData,
        weight: formatWeightForStorage(weightAmount, weightUnit)
      };

      let result;
      if (material) {
        result = await updateMaterial(material.id, submitData);
      } else {
        result = await createMaterial(submitData);
      }
      
      if (result) {
        success(material ? '物料更新成功' : '物料创建成功');
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
      success('编码已自动生成');
    } else {
      showError('请先选择物料分类和计量单位');
    }
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
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

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
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

              {/* 默认供应商（一个物料编码只对应一个供应商） */}
              <div>
                {/* 说明：供应商数量多时下拉难找，这里改为可搜索选择 */}
                <SearchableSelect
                  label="供应商"
                  required
                  value={formData.supplier_id || ''}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, supplier_id: value || null }));
                    // 清除对应字段的错误
                    if (errors.supplier_id) {
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.supplier_id;
                        return next;
                      });
                    }
                  }}
                  options={suppliers.map(supplier => ({
                    id: supplier.id,
                    label: `${supplier.code} - ${supplier.name}`,
                    subtitle: supplier.contact_person ? `联系人：${supplier.contact_person}` : undefined
                  }))}
                  placeholder="搜索供应商编码、名称..."
                  error={errors.supplier_id}
                />
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

              {/* 标签打印信息 */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">标签打印信息</h3>
              </div>

              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                  重量
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="weight"
                    value={weightAmount}
                    onChange={(e) => setWeightAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="请输入数字，如：0.18"
                    min="0"
                    step="0.001"
                  />
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                    className="w-28 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    aria-label="重量单位"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
                {/* 说明：保存时会自动合成为 "0.18KG"/"180g"，用于标签打印 */}
              </div>

              <div>
                <label htmlFor="shelf_life" className="block text-sm font-medium text-gray-700 mb-1">
                  保质期
                </label>
                <input
                  type="text"
                  id="shelf_life"
                  name="shelf_life"
                  value={formData.shelf_life}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="如：12个月"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="storage_conditions" className="block text-sm font-medium text-gray-700 mb-1">
                  储存条件
                </label>
                <input
                  type="text"
                  id="storage_conditions"
                  name="storage_conditions"
                  value={formData.storage_conditions}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="如：存放于阴凉干燥通风处，密封避光"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="main_ingredients" className="block text-sm font-medium text-gray-700 mb-1">
                  主要成份
                </label>
                <textarea
                  id="main_ingredients"
                  name="main_ingredients"
                  rows={2}
                  value={formData.main_ingredients}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="如：食品用香料、食品用香精辅料"
                />
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

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6 sticky bottom-0 bg-white">
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

import React, { useEffect } from 'react';
import { useMaterialStore } from '@/stores/materialStore';
import { useAuthStore } from '@/stores/authStore';
import InventoryChart from '@/components/analytics/InventoryChart';
import CategoryPieChart from '@/components/analytics/CategoryPieChart';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Analytics: React.FC = () => {
  const { 
    materials, 
    categories, 
    loading, 
    fetchMaterials, 
    fetchCategories 
  } = useMaterialStore();
  
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    fetchMaterials({ limit: 1000 }); // 获取足够多的数据用于统计
    fetchCategories();
  }, [fetchMaterials, fetchCategories]);

  if (!hasPermission('read_analytics')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">权限不足</h3>
          <p className="text-gray-500">您没有查看统计分析的权限</p>
        </div>
      </div>
    );
  }

  if (loading && materials.length === 0) {
    return <LoadingSpinner />;
  }

  const totalValue = materials.reduce((acc, curr) => acc + (curr.current_stock * (curr.price || 0)), 0);
  const lowStockCount = materials.filter(m => m.current_stock <= m.min_stock).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">统计分析</h1>
        <p className="mt-1 text-sm text-gray-500">
          查看库存趋势、分类占比及关键指标。
        </p>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">总库存价值 (估算)</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            ¥{totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">总物料种类</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {materials.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">低库存预警</h3>
          <p className={`mt-2 text-3xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <InventoryChart materials={materials} />
        <CategoryPieChart materials={materials} categories={categories} />
      </div>
    </div>
  );
};

export default Analytics;

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CubeIcon, 
  QrCodeIcon, 
  ArchiveBoxIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useMaterialStore } from '../stores/materialStore';
import { useAuthStore } from '../stores/authStore';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { stats, materials, loading, fetchMaterials, fetchStats } = useMaterialStore();
  const { user, hasRole } = useAuthStore();

  useEffect(() => {
    fetchMaterials({ limit: 10 });
    fetchStats();
  }, [fetchMaterials, fetchStats]);

  const getLowStockMaterials = () => {
    return materials.filter(m => m.current_stock <= m.min_stock).slice(0, 5);
  };

  const getRecentMaterials = () => {
    return materials.slice(0, 5);
  };

  const statCards = [
    {
      name: '总物料数',
      value: stats?.total_materials || 0,
      icon: CubeIcon,
      color: 'blue',
      href: '/materials'
    },
    {
      name: '可用物料',
      value: stats?.active_materials || 0,
      icon: CubeIcon,
      color: 'green',
      href: '/materials?status=active'
    },
    {
      name: '低库存物料',
      value: stats?.low_stock_count || 0,
      icon: ExclamationTriangleIcon,
      color: 'red',
      href: '/materials?low_stock=true'
    },
    {
      name: '物料分类',
      value: stats?.total_categories || 0,
      icon: ArchiveBoxIcon,
      color: 'purple',
      href: '/materials/categories'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  if (loading && materials.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 欢迎信息 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          欢迎回来，{user?.full_name || user?.username || '用户'}！
        </h1>
        <p className="text-gray-600">
          {user?.role === 'admin' ? '管理员' : 
           user?.role === 'manager' ? '经理' :
           user?.role === 'operator' ? '操作员' : '查看者'} · 
          今天是 {new Date().toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.name}
            to={card.href}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.name}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 低库存警告 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              低库存警告
            </h3>
          </div>
          <div className="p-6">
            {getLowStockMaterials().length > 0 ? (
              <div className="space-y-3">
                {getLowStockMaterials().map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{material.name}</p>
                      <p className="text-sm text-gray-600">{material.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        {material.current_stock} / {material.min_stock}
                      </p>
                      <p className="text-xs text-gray-500">当前/最小库存</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-green-500 mb-2">
                  <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600">暂无低库存物料</p>
              </div>
            )}
          </div>
        </div>

        {/* 最近添加的物料 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
              最近添加的物料
            </h3>
          </div>
          <div className="p-6">
            {getRecentMaterials().length > 0 ? (
              <div className="space-y-3">
                {getRecentMaterials().map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{material.name}</p>
                      <p className="text-sm text-gray-600">{material.code}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge 
                        status={material.status} 
                        color={material.status === 'active' ? 'green' : material.status === 'inactive' ? 'gray' : 'red'}
                        text={material.status === 'active' ? '可用' : material.status === 'inactive' ? '停用' : '报废'}
                        size="sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(material.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <CubeIcon className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-600">暂无物料数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      {hasRole('operator') && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">快速操作</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/materials"
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <CubeIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">新建物料</p>
                </div>
              </Link>
              
              <Link
                to="/batches"
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <ArchiveBoxIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">新建批次</p>
                </div>
              </Link>
              
              <Link
                to="/barcodes"
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <QrCodeIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">生成条码</p>
                </div>
              </Link>
              
              <Link
                to="/analytics"
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <ChartBarIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">查看报表</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuditStore } from '../stores/auditStore';
import { useAuthStore } from '../stores/authStore';
import AuditLogList from '../components/audit/AuditLogList';
import Pagination from '../components/common/Pagination';
import type { AuditLog, AuditLogQueryParams } from '../types/database';

const AuditLogs: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const { logs, loading, fetchLogs, currentPage, totalPages, totalCount } =
    useAuditStore();

  const canReadAuditLogs = hasPermission('read_audit_logs');

  // 筛选参数
  const [filters, setFilters] = useState<AuditLogQueryParams>({
    page: 1,
    limit: 20,
    search: '',
    user_id: '',
    action: '',
    module: '',
    start_date: '',
    end_date: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // 是否显示筛选面板
  const [showFilters, setShowFilters] = useState(false);

  // 加载日志
  useEffect(() => {
    if (!canReadAuditLogs) return;
    fetchLogs(filters);
  }, [canReadAuditLogs, filters, fetchLogs]);

  // 权限检查：与其他页面保持一致（不使用 window.location，避免 Electron file:// 下跳转异常）
  if (!canReadAuditLogs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">权限不足</h3>
          <p className="text-gray-500">您没有查看操作日志的权限</p>
        </div>
      </div>
    );
  }

  // 搜索处理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: '',
      user_id: '',
      action: '',
      module: '',
      start_date: '',
      end_date: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  // 刷新
  const handleRefresh = () => {
    fetchLogs(filters);
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  // 每页数量变化
  const handlePageSizeChange = (limit: number) => {
    setFilters({ ...filters, limit, page: 1 });
  };

  // 操作类型选项
  const actionOptions: Array<{ value: AuditLog['action']; label: string }> = [
    { value: 'create', label: '创建' },
    { value: 'update', label: '更新' },
    { value: 'delete', label: '删除' },
    { value: 'login', label: '登录' },
    { value: 'logout', label: '登出' },
  ];

  // 模块类型选项
  const moduleOptions: Array<{ value: AuditLog['module']; label: string }> = [
    { value: 'material', label: '物料' },
    { value: 'supplier', label: '供应商' },
    { value: 'batch', label: '批次' },
    { value: 'barcode', label: '条码' },
    { value: 'user', label: '用户' },
    { value: 'settings', label: '设置' },
    { value: 'auth', label: '认证' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">操作日志</h1>
        <p className="mt-1 text-sm text-gray-600">
          查看系统操作审计记录（仅管理员可访问）
        </p>
      </div>

      {/* 工具栏 */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 搜索栏 */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="搜索用户名、目标名称、操作类型或模块..."
              />
            </div>
          </form>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                showFilters
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              筛选
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon
                className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              刷新
            </button>
          </div>
        </div>

        {/* 高级筛选面板 */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 操作类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  操作类型
                </label>
                <select
                  value={filters.action}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      action: e.target.value as AuditLog['action'] | '',
                    })
                  }
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">全部</option>
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 模块 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模块
                </label>
                <select
                  value={filters.module}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      module: e.target.value as AuditLog['module'] | '',
                    })
                  }
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">全部</option>
                  {moduleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 开始时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始时间
                </label>
                <input
                  type="datetime-local"
                  value={filters.start_date}
                  onChange={(e) =>
                    setFilters({ ...filters, start_date: e.target.value })
                  }
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* 结束时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束时间
                </label>
                <input
                  type="datetime-local"
                  value={filters.end_date}
                  onChange={(e) =>
                    setFilters({ ...filters, end_date: e.target.value })
                  }
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* 重置按钮 */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                重置筛选
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <AuditLogList logs={logs} loading={loading} />

      {/* 分页 */}
      {totalPages > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={filters.limit}
            totalItems={totalCount}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default AuditLogs;

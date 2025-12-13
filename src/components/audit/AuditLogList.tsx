import React from 'react';
import {
  ClockIcon,
  UserIcon,
  CubeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import type { AuditLog } from '../../types/database';
import StatusBadge from '../common/StatusBadge';

interface AuditLogListProps {
  logs: AuditLog[];
  loading?: boolean;
}

const AuditLogList: React.FC<AuditLogListProps> = ({ logs, loading = false }) => {
  // 操作类型映射
  const actionLabels: Record<AuditLog['action'], string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    login: '登录',
    logout: '登出',
  };

  // 模块类型映射
  const moduleLabels: Record<AuditLog['module'], string> = {
    material: '物料',
    supplier: '供应商',
    batch: '批次',
    barcode: '条码',
    user: '用户',
    settings: '设置',
    auth: '认证',
  };

  // 操作类型对应的颜色
  const actionColors: Record<AuditLog['action'], 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    create: 'success',
    update: 'warning',
    delete: 'error',
    login: 'info',
    logout: 'default',
  };

  // 格式化时间
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // 格式化详情
  const formatDetails = (details?: Record<string, unknown>) => {
    if (!details || Object.keys(details).length === 0) return null;

    return (
      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
        <div className="font-medium text-gray-600 mb-1">详细信息:</div>
        <pre className="text-gray-700 whitespace-pre-wrap">
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-600">暂无操作日志</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                时间
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                用户
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                操作
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                模块
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                目标
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                IP 地址
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                    {formatDateTime(log.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {log.user_name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge
                    status={actionColors[log.action]}
                    text={actionLabels[log.action]}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <CubeIcon className="h-4 w-4 text-gray-400 mr-2" />
                    {moduleLabels[log.module]}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {log.target_name || '-'}
                    {log.target_id && (
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {log.target_id}
                      </div>
                    )}
                    {log.details && formatDetails(log.details)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.ip_address || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogList;

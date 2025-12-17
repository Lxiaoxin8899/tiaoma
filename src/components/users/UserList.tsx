import React, { useState, useEffect } from 'react';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import UserForm from './UserForm';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import Pagination from '../common/Pagination';
import type { User } from '../../types/database';

interface UserListProps {
  className?: string;
}

const UserList: React.FC<UserListProps> = ({ className = '' }) => {
  const { user: currentUser, hasPermission } = useAuthStore();
  const {
    users,
    loading,
    error: storeError,
    currentPage,
    totalPages,
    totalItems,
    fetchUsers,
    deleteUser,
    clearError
  } = useUserStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // 初始加载用户数据
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers({ search: searchTerm, role: selectedRole, status: selectedStatus });
  };

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
    fetchUsers({ search: searchTerm, role, status: selectedStatus });
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    fetchUsers({ search: searchTerm, role: selectedRole, status });
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setSelectedRole('');
    setSelectedStatus('');
    fetchUsers();
  };

  const handlePageChange = (page: number) => {
    fetchUsers({ search: searchTerm, role: selectedRole, status: selectedStatus, page });
  };

  const handleEdit = (user: User) => {
    if (!hasPermission('write_users')) return;
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = (user: User) => {
    if (!hasPermission('delete_users')) return;
    // 不能删除自己
    if (user.id === currentUser?.id) {
      return;
    }
    setDeletingUser(user);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;

    const success = await deleteUser(deletingUser.id);
    if (success) {
      setDeletingUser(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    handleRefresh();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'manager': return 'blue';
      case 'operator': return 'green';
      case 'viewer': return 'gray';
      default: return 'gray';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return '管理员';
      case 'manager': return '经理';
      case 'operator': return '操作员';
      case 'viewer': return '查看者';
      default: return role;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'green' : 'gray';
  };

  const getStatusText = (status: string) => {
    return status === 'active' ? '活跃' : '停用';
  };

  // 清理错误提示
  useEffect(() => {
    if (storeError) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [storeError, clearError]);

  if (loading) {
    return (
      <div className={`flex justify-center py-12 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">用户管理</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            管理系统用户账户、角色和权限
          </p>
        </div>
        {hasPermission('write_users') && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>新用户</span>
          </button>
        )}
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="搜索用户姓名、邮箱或用户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedRole}
              onChange={(e) => handleRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有角色</option>
              <option value="admin">管理员</option>
              <option value="manager">经理</option>
              <option value="operator">操作员</option>
              <option value="viewer">查看者</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有状态</option>
              <option value="active">活跃</option>
              <option value="inactive">停用</option>
            </select>

            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg flex items-center space-x-1 transition-colors"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* 错误提示 */}
      {storeError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{storeError}</p>
        </div>
      )}

      {/* 用户列表 */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            用户列表 ({totalItems})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  部门
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  最后登录
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-600 dark:text-gray-200" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user.full_name || user.username}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ShieldCheckIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                      <StatusBadge
                        status={user.role}
                        color={getRoleColor(user.role)}
                        text={getRoleText(user.role)}
                        size="sm"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                      <BuildingOfficeIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                      {user.department || '未设置'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge
                      status={user.status}
                      color={getStatusColor(user.status)}
                      text={getStatusText(user.status)}
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.last_login_at ? 
                      new Date(user.last_login_at).toLocaleDateString('zh-CN') : 
                      '从未登录'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {hasPermission('write_users') && (
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200 p-1 rounded transition-colors"
                          title="编辑用户"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('delete_users') && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded transition-colors"
                          title="删除用户"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">没有找到用户</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || selectedRole || selectedStatus ?
                '请尝试调整搜索条件' :
                '还没有用户数据'
              }
            </p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* 用户表单对话框 */}
      {showForm && (
        <UserForm
          user={editingUser}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={!!deletingUser}
        title="删除用户"
        message={`确定要删除用户 "${deletingUser?.full_name || deletingUser?.username}" 吗？此操作不可撤销。`}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingUser(null)}
        confirmText="删除"
        confirmClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default UserList;

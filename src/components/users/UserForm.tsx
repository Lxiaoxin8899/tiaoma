import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, ShieldCheckIcon, BuildingOfficeIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { User as AppUser } from '../../types/database';

interface UserFormProps {
  user?: AppUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  email: string;
  username: string;
  full_name: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'suspended';
}

const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSuccess }) => {
  const { hasPermission } = useAuthStore();
  const { createUser, updateUser, loading, error: storeError } = useUserStore();
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    username: '',
    full_name: '',
    role: 'viewer',
    department: '',
    status: 'active'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 初始化表单数据
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        username: user.username || '',
        full_name: user.full_name || '',
        role: user.role || 'viewer',
        department: user.department || '',
        status: user.status || 'active'
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.email.trim()) return '邮箱地址不能为空';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return '请输入有效的邮箱地址';
    
    if (!formData.username.trim()) return '用户名不能为空';
    if (formData.username.length < 3) return '用户名至少需要3个字符';
    
    if (!user && !password.trim()) return '密码不能为空';
    if (password && password.length < 6) return '密码至少需要6个字符';
    if (password !== confirmPassword) return '两次输入的密码不一致';

    if (!formData.full_name.trim()) return '姓名不能为空';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!hasPermission(user ? 'write_users' : 'write_users')) {
      setError('您没有权限执行此操作');
      return;
    }

    try {
      setError(null);

      let result;
      if (user) {
        // 更新用户
        result = await updateUser(user.id, formData);
      } else {
        // 创建用户
        if (!password) {
          setError('密码不能为空');
          return;
        }
        result = await createUser({ ...formData, password });
      }

      if (result) {
        onSuccess();
      } else {
        setError(storeError || '操作失败，请重试');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    }
  };

  const roleOptions = [
    { value: 'admin', label: '管理员' },
    { value: 'manager', label: '经理' },
    { value: 'operator', label: '操作员' },
    { value: 'viewer', label: '查看者' }
  ];

  const statusOptions = [
    { value: 'active', label: '活跃' },
    { value: 'inactive', label: '停用' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <UserIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {user ? '编辑用户' : '创建用户'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user ? '修改用户信息和权限' : '添加新的用户账户'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 错误提示 */}
          {(error || storeError) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error || storeError}</p>
            </div>
          )}

          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                邮箱地址 *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
                required
              />
            </div>

            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名 *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="username"
                required
              />
            </div>
          </div>

          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              姓名 *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入姓名"
              required
            />
          </div>

          {/* 密码 */}
          {!user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  密码 *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="至少6位字符"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    title={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  确认密码 *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="再次输入密码"
                  required
                />
              </div>
            </div>
          )}

          {/* 角色和部门 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 角色 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                角色 *
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                状态 *
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 部门 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
              部门
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例如：IT部门、仓库部"
            />
          </div>

          {/* 角色说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">角色权限说明</h4>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p><strong>管理员：</strong>拥有系统所有权限</p>
              <p><strong>经理：</strong>拥有管理权限，可查看所有数据</p>
              <p><strong>操作员：</strong>拥有日常操作权限</p>
              <p><strong>查看者：</strong>只能查看数据，无修改权限</p>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              )}
              <span>{loading ? '保存中...' : (user ? '更新用户' : '创建用户')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;

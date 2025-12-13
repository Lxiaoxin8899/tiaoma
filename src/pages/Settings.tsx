import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  BellIcon,
  CircleStackIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import SettingsForm from '../components/settings/SettingsForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import type { SystemSettingsFormData } from '../types/database';

interface SettingsPageProps {
  className?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ className = '' }) => {
  const { hasPermission } = useAuthStore();
  const { settings, loading, error: storeError, fetchSettings, updateSettings, clearError } = useSettingsStore();

  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SystemSettingsFormData | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleEditConfig = () => {
    if (!hasPermission('write_settings') || !settings) return;

    // 将扁平的设置转换为分类的表单数据
    const formData: SystemSettingsFormData = {
      general: {
        site_name: settings.site_name,
        company_name: settings.company_name,
        timezone: settings.timezone,
        language: settings.language,
        date_format: settings.date_format,
      },
      security: {
        password_min_length: settings.password_min_length,
        session_timeout: settings.session_timeout,
        max_login_attempts: settings.max_login_attempts,
        two_factor_required: settings.two_factor_required,
      },
      notifications: {
        email_enabled: settings.email_enabled,
        low_stock_alerts: settings.low_stock_alerts,
        system_maintenance: settings.system_maintenance,
        user_activities: settings.user_activities,
      },
      system: {
        auto_backup: settings.auto_backup,
        backup_frequency: settings.backup_frequency,
        data_retention_days: settings.data_retention_days,
        maintenance_mode: settings.maintenance_mode,
      },
    };

    setSelectedConfig(formData);
    setShowConfigForm(true);
  };

  const handleConfigSubmit = async (config: SystemSettingsFormData) => {
    try {
      clearError();
      setSuccess(null);

      const result = await updateSettings(config);

      if (result) {
        setShowConfigForm(false);
        setSelectedConfig(null);
        setSuccess('配置保存成功');

        // 3秒后清除成功消息
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('保存配置失败:', err);
    }
  };

  const handleConfigClose = () => {
    setShowConfigForm(false);
    setSelectedConfig(null);
    clearError();
  };

  const getStatusValue = (category: string, key: string): boolean | string | number => {
    if (!settings) return '';

    const categoryMap: Record<string, string[]> = {
      general: ['site_name', 'company_name', 'timezone', 'language', 'date_format'],
      security: ['password_min_length', 'session_timeout', 'max_login_attempts', 'two_factor_required'],
      notifications: ['email_enabled', 'low_stock_alerts', 'system_maintenance', 'user_activities'],
      system: ['auto_backup', 'backup_frequency', 'data_retention_days', 'maintenance_mode'],
    };

    if (!categoryMap[category]?.includes(key)) return '';

    return settings[key as keyof typeof settings] ?? '';
  };

  const getStatusColor = (value: boolean | string | number): 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' => {
    if (typeof value === 'boolean') {
      return value ? 'green' : 'red';
    }
    return 'blue';
  };

  const getStatusText = (category: string, key: string): string => {
    const value = getStatusValue(category, key);

    if (typeof value === 'boolean') {
      return value ? '启用' : '禁用';
    }

    if (category === 'general' && key === 'timezone') {
      switch (value) {
        case 'Asia/Shanghai': return '中国标准时间';
        case 'UTC': return '协调世界时';
        case 'America/New_York': return '美国东部时间';
        default: return String(value);
      }
    }

    if (category === 'security' && key === 'session_timeout') {
      const hours = Number(value) / 60;
      return `${hours}小时`;
    }

    return String(value);
  };

  const tabs = [
    { 
      id: 'general', 
      name: '常规设置', 
      icon: GlobeAltIcon,
      description: '基本系统配置'
    },
    { 
      id: 'security', 
      name: '安全设置', 
      icon: ShieldCheckIcon,
      description: '密码和安全策略'
    },
    { 
      id: 'notifications', 
      name: '通知设置', 
      icon: BellIcon,
      description: '邮件和通知配置'
    },
    { 
      id: 'system', 
      name: '系统设置', 
      icon: CircleStackIcon,
      description: '备份和维护'
    }
  ];

  const configCategories: Record<string, Array<{ key: string; label: string }>> = {
    general: [
      { key: 'site_name', label: '网站名称' },
      { key: 'company_name', label: '公司名称' },
      { key: 'timezone', label: '时区' },
      { key: 'language', label: '语言' },
      { key: 'date_format', label: '日期格式' }
    ],
    security: [
      { key: 'password_min_length', label: '密码最小长度' },
      { key: 'session_timeout', label: '会话超时' },
      { key: 'max_login_attempts', label: '最大登录尝试次数' },
      { key: 'two_factor_required', label: '双因素认证' }
    ],
    notifications: [
      { key: 'email_enabled', label: '邮件通知' },
      { key: 'low_stock_alerts', label: '低库存警报' },
      { key: 'system_maintenance', label: '系统维护通知' },
      { key: 'user_activities', label: '用户活动通知' }
    ],
    system: [
      { key: 'auto_backup', label: '自动备份' },
      { key: 'backup_frequency', label: '备份频率' },
      { key: 'data_retention_days', label: '数据保留天数' },
      { key: 'maintenance_mode', label: '维护模式' }
    ]
  };

  if (loading && !showConfigForm && !settings) {
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
          <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
          <p className="mt-2 text-sm text-gray-600">
            配置系统参数和安全策略
          </p>
        </div>
        {hasPermission('write_settings') && (
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-yellow-700">修改设置需要管理员权限</span>
          </div>
        )}
      </div>

      {/* 状态消息 */}
      {storeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-800">{storeError}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* 选项卡导航 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 选项卡内容 */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {tabs.find(tab => tab.id === activeTab)?.name}
            </h3>
            <p className="text-sm text-gray-500">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>

          {/* 配置项列表 */}
          <div className="space-y-4">
            {configCategories[activeTab]?.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {item.label}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {getStatusText(activeTab, item.key)}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <StatusBadge
                    status={getStatusValue(activeTab, item.key)}
                    color={getStatusColor(getStatusValue(activeTab, item.key))}
                    text={getStatusText(activeTab, item.key)}
                    size="sm"
                  />
                  {hasPermission('write_settings') && (
                    <button
                      onClick={() => handleEditConfig()}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      编辑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 配置表单对话框 */}
      {showConfigForm && selectedConfig && (
        <SettingsForm
          config={selectedConfig}
          activeTab={activeTab}
          onClose={handleConfigClose}
          onSubmit={handleConfigSubmit}
        />
      )}

      {/* 权限提示 */}
      {!hasPermission('read_settings') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-yellow-400" />
          <h3 className="mt-2 text-sm font-medium text-yellow-800">权限不足</h3>
          <p className="mt-1 text-sm text-yellow-700">
            您没有权限查看系统设置
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

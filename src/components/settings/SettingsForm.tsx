import React, { useState, useEffect } from 'react';
import { XMarkIcon, GlobeAltIcon, ShieldCheckIcon, BellIcon, CircleStackIcon } from '@heroicons/react/24/outline';

interface GeneralSettings {
  site_name?: string;
  company_name?: string;
  timezone?: string;
  language?: string;
  date_format?: string;
}

interface SecuritySettings {
  password_min_length?: number;
  session_timeout?: number;
  max_login_attempts?: number;
  two_factor_required?: boolean;
}

interface NotificationSettings {
  email_enabled?: boolean;
  low_stock_alerts?: boolean;
  system_maintenance?: boolean;
  user_activities?: boolean;
}

interface SystemSettings {
  auto_backup?: boolean;
  backup_frequency?: string;
  data_retention_days?: number;
  maintenance_mode?: boolean;
}

type SettingsConfig = {
  general?: GeneralSettings;
  security?: SecuritySettings;
  notifications?: NotificationSettings;
  system?: SystemSettings;
};

interface SettingsFormProps {
  config: SettingsConfig;
  activeTab: string;
  onClose: () => void;
  onSubmit: (config: SettingsConfig) => void | Promise<void>;
}

const SettingsForm: React.FC<SettingsFormProps> = ({ config, activeTab, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<SettingsConfig>(config);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleInputChange = (category: keyof SettingsConfig, key: string, value: string | number | boolean) => {
    setFormData((prev: SettingsConfig) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          网站名称
        </label>
        <input
          type="text"
          value={formData.general?.site_name || ''}
          onChange={(e) => handleInputChange('general', 'site_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="条码管理系统"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          公司名称
        </label>
        <input
          type="text"
          value={formData.general?.company_name || ''}
          onChange={(e) => handleInputChange('general', 'company_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="科技有限公司"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          时区
        </label>
        <select
          value={formData.general?.timezone || 'Asia/Shanghai'}
          onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="Asia/Shanghai">中国标准时间</option>
          <option value="UTC">协调世界时</option>
          <option value="America/New_York">美国东部时间</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          语言
        </label>
        <select
          value={formData.general?.language || 'zh-CN'}
          onChange={(e) => handleInputChange('general', 'language', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          日期格式
        </label>
        <select
          value={formData.general?.date_format || 'YYYY-MM-DD'}
          onChange={(e) => handleInputChange('general', 'date_format', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
        </select>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          密码最小长度
        </label>
        <input
          type="number"
          min="6"
          max="32"
          value={formData.security?.password_min_length || 8}
          onChange={(e) => handleInputChange('security', 'password_min_length', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          会话超时（分钟）
        </label>
        <select
          value={formData.security?.session_timeout || 480}
          onChange={(e) => handleInputChange('security', 'session_timeout', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={60}>1小时</option>
          <option value={120}>2小时</option>
          <option value={240}>4小时</option>
          <option value={480}>8小时</option>
          <option value={720}>12小时</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          最大登录尝试次数
        </label>
        <input
          type="number"
          min="3"
          max="10"
          value={formData.security?.max_login_attempts || 5}
          onChange={(e) => handleInputChange('security', 'max_login_attempts', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="two_factor_required"
          checked={formData.security?.two_factor_required || false}
          onChange={(e) => handleInputChange('security', 'two_factor_required', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="two_factor_required" className="ml-2 block text-sm text-gray-900">
          启用双因素认证
        </label>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <input
          type="checkbox"
          id="email_enabled"
          checked={formData.notifications?.email_enabled || false}
          onChange={(e) => handleInputChange('notifications', 'email_enabled', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="email_enabled" className="ml-2 block text-sm text-gray-900">
          启用邮件通知
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="low_stock_alerts"
          checked={formData.notifications?.low_stock_alerts || false}
          onChange={(e) => handleInputChange('notifications', 'low_stock_alerts', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="low_stock_alerts" className="ml-2 block text-sm text-gray-900">
          低库存警报
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="system_maintenance"
          checked={formData.notifications?.system_maintenance || false}
          onChange={(e) => handleInputChange('notifications', 'system_maintenance', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="system_maintenance" className="ml-2 block text-sm text-gray-900">
          系统维护通知
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="user_activities"
          checked={formData.notifications?.user_activities || false}
          onChange={(e) => handleInputChange('notifications', 'user_activities', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="user_activities" className="ml-2 block text-sm text-gray-900">
          用户活动通知
        </label>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <input
          type="checkbox"
          id="auto_backup"
          checked={formData.system?.auto_backup || false}
          onChange={(e) => handleInputChange('system', 'auto_backup', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="auto_backup" className="ml-2 block text-sm text-gray-900">
          启用自动备份
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          备份频率
        </label>
        <select
          value={formData.system?.backup_frequency || 'daily'}
          onChange={(e) => handleInputChange('system', 'backup_frequency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="hourly">每小时</option>
          <option value="daily">每日</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          数据保留天数
        </label>
        <input
          type="number"
          min="30"
          max="2555"
          value={formData.system?.data_retention_days || 365}
          onChange={(e) => handleInputChange('system', 'data_retention_days', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="maintenance_mode"
          checked={formData.system?.maintenance_mode || false}
          onChange={(e) => handleInputChange('system', 'maintenance_mode', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="maintenance_mode" className="ml-2 block text-sm text-gray-900">
          维护模式
        </label>
      </div>
    </div>
  );

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'general': return GlobeAltIcon;
      case 'security': return ShieldCheckIcon;
      case 'notifications': return BellIcon;
      case 'system': return CircleStackIcon;
      default: return GlobeAltIcon;
    }
  };

  const getTabName = (tab: string) => {
    switch (tab) {
      case 'general': return '常规设置';
      case 'security': return '安全设置';
      case 'notifications': return '通知设置';
      case 'system': return '系统设置';
      default: return '设置';
    }
  };

  const TabIcon = getTabIcon(activeTab);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <TabIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                编辑{getTabName(activeTab)}
              </h2>
              <p className="text-sm text-gray-500">
                修改系统配置参数
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'system' && renderSystemSettings()}

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
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
              <span>{loading ? '保存中...' : '保存设置'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsForm;

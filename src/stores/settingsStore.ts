import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { SystemSettings, SystemSettingsFormData } from '../types/database';
import { errorHandler, reportError } from '../lib/errorHandler';

interface SettingsState {
  settings: SystemSettings | null;
  loading: boolean;
  error: string | null;

  // 获取设置
  fetchSettings: () => Promise<void>;

  // 更新设置
  updateSettings: (data: SystemSettingsFormData) => Promise<boolean>;

  // 辅助方法
  getSettingValue: <T = unknown>(category: string, key: string) => T | undefined;
  clearError: () => void;
}

// 将分类表单数据转换为扁平的数据库模型
const flattenFormData = (formData: SystemSettingsFormData): Partial<SystemSettings> => {
  const result: Partial<SystemSettings> = {};

  if (formData.general) {
    if (formData.general.site_name !== undefined) result.site_name = formData.general.site_name;
    if (formData.general.company_name !== undefined) result.company_name = formData.general.company_name;
    if (formData.general.timezone !== undefined) result.timezone = formData.general.timezone;
    if (formData.general.language !== undefined) result.language = formData.general.language;
    if (formData.general.date_format !== undefined) result.date_format = formData.general.date_format;
  }

  if (formData.security) {
    if (formData.security.password_min_length !== undefined) result.password_min_length = formData.security.password_min_length;
    if (formData.security.session_timeout !== undefined) result.session_timeout = formData.security.session_timeout;
    if (formData.security.max_login_attempts !== undefined) result.max_login_attempts = formData.security.max_login_attempts;
    if (formData.security.two_factor_required !== undefined) result.two_factor_required = formData.security.two_factor_required;
  }

  if (formData.notifications) {
    if (formData.notifications.email_enabled !== undefined) result.email_enabled = formData.notifications.email_enabled;
    if (formData.notifications.low_stock_alerts !== undefined) result.low_stock_alerts = formData.notifications.low_stock_alerts;
    if (formData.notifications.system_maintenance !== undefined) result.system_maintenance = formData.notifications.system_maintenance;
    if (formData.notifications.user_activities !== undefined) result.user_activities = formData.notifications.user_activities;
  }

  if (formData.system) {
    if (formData.system.auto_backup !== undefined) result.auto_backup = formData.system.auto_backup;
    if (formData.system.backup_frequency !== undefined) result.backup_frequency = formData.system.backup_frequency;
    if (formData.system.data_retention_days !== undefined) result.data_retention_days = formData.system.data_retention_days;
    if (formData.system.maintenance_mode !== undefined) result.maintenance_mode = formData.system.maintenance_mode;
  }

  return result;
};

// 将扁平的数据库模型转换为分类表单数据
const unflattenSettings = (settings: SystemSettings): SystemSettingsFormData => {
  return {
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
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });

    try {
      // 查询系统设置表，应该只有一条记录
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 0);

      // 如果系统设置表为空，则创建默认设置（线上/离线都适用）
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      const first = rows[0] as SystemSettings | undefined;
      if (first) {
        set({ settings: first, loading: false });
        return;
      }

      // 查询出错时：仅在“无记录”场景下尝试补建默认设置，其余错误直接抛出
      if (error) {
        const errorCode = (error as { code?: string }).code;
        const isNoRows = errorCode === 'PGRST116' || (error.message && error.message.includes('No rows'));
        if (!isNoRows) throw error;
      }

      const defaultSettings: Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'> = {
        site_name: '条码管理系统',
        company_name: '科技有限公司',
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        date_format: 'YYYY-MM-DD',
        password_min_length: 8,
        session_timeout: 480,
        max_login_attempts: 5,
        two_factor_required: false,
        email_enabled: true,
        low_stock_alerts: true,
        system_maintenance: false,
        user_activities: true,
        auto_backup: true,
        backup_frequency: 'daily',
        data_retention_days: 365,
        maintenance_mode: false,
      };

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      const { data: newSettings, error: createError } = await supabase
        .from('system_settings')
        .insert([{ ...defaultSettings, updated_by: userId }])
        .select()
        .single();

      if (createError) throw createError;

      set({ settings: newSettings as SystemSettings, loading: false });
    } catch (err) {
      const appError = errorHandler.handle(err, '获取系统设置失败');
      reportError(err, 'settings.fetchSettings');
      set({ error: errorHandler.getUserMessage(appError), loading: false });
    }
  },

  updateSettings: async (data: SystemSettingsFormData) => {
    set({ loading: true, error: null });

    try {
      const currentSettings = get().settings;
      if (!currentSettings) {
        set({ loading: false, error: '系统设置未加载' });
        return false;
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      // 将表单数据转换为扁平的更新数据
      const updateData = flattenFormData(data);

      const { data: updatedSettings, error } = await supabase
        .from('system_settings')
        .update({
          ...updateData,
          updated_by: userId,
        })
        .eq('id', currentSettings.id)
        .select()
        .single();

      if (error) throw error;

      set({ settings: updatedSettings as SystemSettings, loading: false });
      return true;
    } catch (err) {
      const appError = errorHandler.handle(err, '更新系统设置失败');
      reportError(err, 'settings.updateSettings', { data });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
      return false;
    }
  },

  getSettingValue: <T = unknown>(category: string, key: string): T | undefined => {
    const settings = get().settings;
    if (!settings) return undefined;

    // 根据分类获取值
    const formData = unflattenSettings(settings);
    const categoryData = formData[category as keyof SystemSettingsFormData];
    if (!categoryData) return undefined;

    return categoryData[key as keyof typeof categoryData] as T;
  },

  clearError: () => {
    set({ error: null });
  },
}));

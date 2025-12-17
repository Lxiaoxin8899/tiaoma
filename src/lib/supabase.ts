import { createClient } from '@supabase/supabase-js';
import { createLocalClient } from './localSupabase';

interface SupabaseConfig {
  auth: {
    persistSession: boolean;
    autoRefreshToken: boolean;
    detectSessionInUrl: boolean;
    storage: Storage;
    storageKey: string;
  };
  global: {
    headers: Record<string, string>;
  };
  db: {
    schema: string;
  };
}

// 约束 stores/components 依赖的最小 Supabase API（在线/离线共用）
export interface SupabaseUserLike {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  user_metadata?: Record<string, unknown>;
  // 本地模式会附带更多字段（username/role/status 等），这里用索引签名兼容
  [key: string]: unknown;
}

export interface SupabaseAuthLike {
  signInWithPassword: (args: { email: string; password: string }) => Promise<{
    data: { user: SupabaseUserLike | null } | null;
    error: { message?: string } | null;
  }>;
  signUp: (args: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => Promise<{
    data: { user: SupabaseUserLike | null } | null;
    error: { message?: string } | null;
  }>;
  signOut: () => Promise<{ error: { message?: string } | null }>;
  getUser: () => Promise<{ data: { user: SupabaseUserLike | null }; error?: { message?: string } | null }>;
  updateUser: (args: { data: Record<string, unknown> }) => Promise<{
    data: { user: SupabaseUserLike | null } | null;
    error: { message?: string } | null;
  }>;
}

export interface SupabaseQueryResponse {
  data: unknown;
  error: { message?: string } | null;
  count?: number | null;
}

// supabase-js 的 query builder 是 PromiseLike（可直接 await），离线模式也按此实现
export type SupabaseQueryBuilder = PromiseLike<SupabaseQueryResponse> & {
  select: (...args: unknown[]) => SupabaseQueryBuilder;
  order: (...args: unknown[]) => SupabaseQueryBuilder;
  eq: (...args: unknown[]) => SupabaseQueryBuilder;
  lt: (...args: unknown[]) => SupabaseQueryBuilder;
  lte: (...args: unknown[]) => SupabaseQueryBuilder;
  gte: (...args: unknown[]) => SupabaseQueryBuilder;
  or: (...args: unknown[]) => SupabaseQueryBuilder;
  range: (...args: unknown[]) => SupabaseQueryBuilder;
  insert: (...args: unknown[]) => SupabaseQueryBuilder;
  update: (...args: unknown[]) => SupabaseQueryBuilder;
  delete: (...args: unknown[]) => SupabaseQueryBuilder;
  single: (...args: unknown[]) => SupabaseQueryBuilder;
};

export interface SupabaseLikeClient {
  auth: SupabaseAuthLike;
  from: (table: string) => SupabaseQueryBuilder;
  isOnline: () => Promise<boolean>;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const hasSupabaseConfig = !!supabaseUrl && !!supabaseAnonKey;
// 离线模式开关：
// - 显式设置 VITE_OFFLINE=true
// - 开发环境下若缺少 Supabase 配置，自动启用本地模式（避免开发时页面直接不可用）
export const isOfflineMode =
  (import.meta.env.VITE_OFFLINE === 'true') ||
  (!import.meta.env.PROD && !hasSupabaseConfig);

// 生产环境必须显式配置 Supabase（或显式启用离线模式），避免误用不安全的本地模式进入生产
if (import.meta.env.PROD && !hasSupabaseConfig && !isOfflineMode) {
  throw new Error('缺少 Supabase 配置：请设置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY（或显式设置 VITE_OFFLINE=true）。');
}

if (isOfflineMode) {
  console.warn('当前处于离线本地模式：Supabase 将由 localStorage 模拟。');
  if (import.meta.env.PROD) {
    console.warn('警告：生产环境启用离线模式会降低安全性（本地数据与认证无法达到线上同等级别）。');
  }
}

const config: SupabaseConfig = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'material-management-system',
  },
  global: {
    headers: {
      'x-application-name': 'material-management-system',
    },
  },
  db: {
    schema: 'public',
  },
};

// 说明：这里使用“最小能力接口”做类型收敛，避免 supabase-js 复杂泛型在项目里扩散。
let baseClient: SupabaseLikeClient;
if (isOfflineMode) {
  baseClient = createLocalClient() as unknown as SupabaseLikeClient;
} else {
  const client = createClient(supabaseUrl, supabaseAnonKey, config);
  const onlineClient = client as unknown as SupabaseLikeClient;

  // 为真实 Supabase 客户端补充 isOnline 方法（用于在线/离线逻辑分支）
  onlineClient.isOnline = async () => {
    try {
      // 说明：getSession() 不会发起网络请求，无法判断真实网络状态；这里用轻量 health check。
      // Supabase Auth 提供 /auth/v1/health，可用于快速探活。
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return false;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  };

  baseClient = onlineClient;
}

export const supabase: SupabaseLikeClient = baseClient;

// 错误处理函数
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  type?: 'string' | 'number' | 'email' | 'phone';
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationError {
  field: string;
  message: string;
}

export const handleError = (error: unknown): Error => {
  console.error('Supabase error:', error);
  const errObj = error as { code?: string; message?: string };
  
  if (errObj?.code === 'PGRST116') {
    return new Error('没有权限访问此资源');
  }
  
  if (errObj?.code === '23505') {
    return new Error('数据已存在，请勿重复添加');
  }
  
  if (errObj?.code === '23503') {
    return new Error('关联数据不存在');
  }
  
  return new Error(errObj?.message || '操作失败，请稍后重试');
};

// 数据验证函数
export const validateData = (data: Record<string, unknown>, schema: ValidationSchema): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  Object.keys(schema).forEach(key => {
    const rules = schema[key];
    const value = data[key];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: key, message: `${key} 是必填项` });
    }
    
    if (value && rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push({ field: key, message: `${key} 最少需要 ${rules.minLength} 个字符` });
    }
    
    if (value && rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({ field: key, message: `${key} 最多允许 ${rules.maxLength} 个字符` });
    }
    
    if (value && rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors.push({ field: key, message: `${key} 格式不正确` });
    }
    
    if (value && rules.type) {
      switch (rules.type) {
        case 'email': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (typeof value === 'string' && !emailRegex.test(value)) {
            errors.push({ field: key, message: `${key} 邮箱格式不正确` });
          }
          break;
        }
        case 'phone': {
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (typeof value === 'string' && !phoneRegex.test(value)) {
            errors.push({ field: key, message: `${key} 手机号格式不正确` });
          }
          break;
        }
      }
    }
  });
  
  return errors;
};

export default supabase;

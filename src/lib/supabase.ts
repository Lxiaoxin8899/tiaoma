import { createLocalClient } from './localSupabase';

// =============================================================================
// 单机模式说明
//
// 目前客户侧交付形态为 Windows 安装包单机软件，不存在“线上模式”。
// 为避免：
// - 因环境变量缺失导致生产包直接报错
// - 因不同模式切换导致数据源混乱（线上/离线两套数据）
// 这里将模式固定为“本地模式”（Electron：SQLite；浏览器调试：localStorage）。
// =============================================================================
export const isOfflineMode = true;

// 约束 stores/components 依赖的最小 Supabase API（单机共用）
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

// supabase-js 的 query builder 是 PromiseLike（可直接 await），单机模式也按此实现
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

// 说明：这里使用“最小能力接口”做类型收敛，避免外部依赖复杂类型在项目里扩散。
const baseClient: SupabaseLikeClient = createLocalClient() as unknown as SupabaseLikeClient;

export const supabase: SupabaseLikeClient = baseClient;

// =============================================================================
// 错误/校验工具（沿用 supabase.ts 对外 API）
// =============================================================================

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
  console.error('操作失败:', error);
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

export const validateData = (data: Record<string, unknown>, schema: ValidationSchema): ValidationError[] => {
  const errors: ValidationError[] = [];

  Object.keys(schema).forEach((key) => {
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

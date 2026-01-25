import { createClient } from '@supabase/supabase-js'
import { createLocalClient } from './localSupabase'

// =============================================================================
// 数据模式说明
// - offline：本地离线（Electron: SQLite；浏览器调试：localStorage）
// - online：连接 Supabase 风格 API（/rest/v1、/auth/v1）
//
// 规则：
// 1) 显式设置 VITE_DATA_MODE=online 时优先走在线
// 2) 未设置时，若存在 Supabase 配置则自动在线
// 3) 显式设置 VITE_DATA_MODE=offline 时强制离线
// =============================================================================
const dataMode = (import.meta.env.VITE_DATA_MODE || '').toLowerCase()
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const hasOnlineConfig = Boolean(supabaseUrl && supabaseAnonKey)
const shouldUseOnline = dataMode === 'online' ? hasOnlineConfig : dataMode === 'offline' ? false : hasOnlineConfig

if (dataMode === 'online' && !hasOnlineConfig) {
  console.warn('线上模式缺少 Supabase 配置，已自动回退离线模式')
}

export const isOfflineMode = !shouldUseOnline

// 约束 stores/components 依赖的最小 Supabase API（在线/离线共用）
export interface SupabaseUserLike {
  id: string
  email?: string
  created_at?: string
  updated_at?: string
  user_metadata?: Record<string, unknown>
  // 说明：兼容本地扩展字段（username/role/status 等）
  [key: string]: unknown
}

export interface SupabaseAuthLike {
  signInWithPassword: (args: { email: string; password: string }) => Promise<{
    data: { user: SupabaseUserLike | null } | null
    error: { message?: string } | null
  }>
  signUp: (args: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => Promise<{
    data: { user: SupabaseUserLike | null } | null
    error: { message?: string } | null
  }>
  signOut: () => Promise<{ error: { message?: string } | null }>
  getUser: () => Promise<{ data: { user: SupabaseUserLike | null }; error?: { message?: string } | null }>
  updateUser: (args: { data: Record<string, unknown> }) => Promise<{
    data: { user: SupabaseUserLike | null } | null
    error?: { message?: string } | null
  }>
}

export interface SupabaseQueryResponse {
  data: unknown
  error: { message?: string } | null
  count?: number | null
}

// supabase-js 的 query builder 是 PromiseLike（可直接 await）
export type SupabaseQueryBuilder = PromiseLike<SupabaseQueryResponse> & {
  select: (...args: unknown[]) => SupabaseQueryBuilder
  order: (...args: unknown[]) => SupabaseQueryBuilder
  eq: (...args: unknown[]) => SupabaseQueryBuilder
  lt: (...args: unknown[]) => SupabaseQueryBuilder
  lte: (...args: unknown[]) => SupabaseQueryBuilder
  gte: (...args: unknown[]) => SupabaseQueryBuilder
  or: (...args: unknown[]) => SupabaseQueryBuilder
  range: (...args: unknown[]) => SupabaseQueryBuilder
  insert: (...args: unknown[]) => SupabaseQueryBuilder
  update: (...args: unknown[]) => SupabaseQueryBuilder
  delete: (...args: unknown[]) => SupabaseQueryBuilder
  single: (...args: unknown[]) => SupabaseQueryBuilder
}

export interface SupabaseLikeClient {
  auth: SupabaseAuthLike
  from: (table: string) => SupabaseQueryBuilder
  isOnline: () => Promise<boolean>
}

const createOnlineClient = (): SupabaseLikeClient => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return {
    auth: client.auth as unknown as SupabaseAuthLike,
    from: (table: string) => client.from(table) as unknown as SupabaseQueryBuilder,
    isOnline: async () => {
      try {
        // 说明：使用网关健康检查，避免依赖业务表是否初始化
        const controller = new AbortController()
        const timer = window.setTimeout(() => controller.abort(), 3000)
        const res = await fetch(`${supabaseUrl}/health`, { signal: controller.signal })
        window.clearTimeout(timer)
        return res.ok
      } catch {
        return false
      }
    },
  }
}

const localClient = createLocalClient() as unknown as SupabaseLikeClient
const onlineClient = shouldUseOnline ? createOnlineClient() : null

export const supabase: SupabaseLikeClient = onlineClient ?? localClient

// =============================================================================
// 错误/校验工具（沿用 supabase.ts 对外 API）
// =============================================================================

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  type?: 'string' | 'number' | 'email' | 'phone'
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationError {
  field: string
  message: string
}

export const handleError = (error: unknown): Error => {
  console.error('操作失败:', error)
  const errObj = error as { code?: string; message?: string }

  if (errObj?.code === 'PGRST116') {
    return new Error('没有权限访问此资源')
  }

  if (errObj?.code === '23505') {
    return new Error('数据已存在，请勿重复添加')
  }

  if (errObj?.code === '23503') {
    return new Error('关联数据不存在')
  }

  return new Error(errObj?.message || '操作失败，请稍后重试')
}

export const validateData = (data: Record<string, unknown>, schema: ValidationSchema): ValidationError[] => {
  const errors: ValidationError[] = []

  Object.keys(schema).forEach((key) => {
    const rules = schema[key]
    const value = data[key]

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: key, message: `${key} 是必填项` })
    }

    if (value && rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push({ field: key, message: `${key} 最少需要 ${rules.minLength} 个字符` })
    }

    if (value && rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({ field: key, message: `${key} 最多允许 ${rules.maxLength} 个字符` })
    }

    if (value && rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors.push({ field: key, message: `${key} 格式不正确` })
    }

    if (value && rules.type) {
      switch (rules.type) {
        case 'email': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (typeof value === 'string' && !emailRegex.test(value)) {
            errors.push({ field: key, message: `${key} 邮箱格式不正确` })
          }
          break
        }
        case 'phone': {
          const phoneRegex = /^1[3-9]\d{9}$/
          if (typeof value === 'string' && !phoneRegex.test(value)) {
            errors.push({ field: key, message: `${key} 手机号格式不正确` })
          }
          break
        }
      }
    }
  })

  return errors
}

export default supabase

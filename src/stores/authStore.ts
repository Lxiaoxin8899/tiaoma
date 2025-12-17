import { create } from 'zustand';
import { supabase, type SupabaseUserLike } from '../lib/supabase';
import type { User as AppUser } from '../types/database';
import { errorHandler, reportError } from '../lib/errorHandler';

// 用户元数据接口（用于 Supabase user_metadata / 本地用户扩展字段）
interface UserMetadata {
  username: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  full_name?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

// 认证状态接口
interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}

// 认证方法接口
interface AuthActions {
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, metadata?: Partial<UserMetadata>) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (data: Partial<AppUser>) => Promise<boolean>;
  clearError: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

// 角色层级定义：用于 hasRole 的“向上兼容”
const ROLE_HIERARCHY = {
  admin: ['admin'] as const,
  manager: ['admin', 'manager'] as const,
  operator: ['admin', 'manager', 'operator'] as const,
  viewer: ['admin', 'manager', 'operator', 'viewer'] as const,
};

// 权限定义：用于菜单与页面访问控制
const MODULE_PERMISSIONS = {
  // 基本 CRUD 权限
  read: ['admin', 'manager', 'operator', 'viewer'] as const,
  write: ['admin', 'manager', 'operator'] as const,
  delete: ['admin', 'manager'] as const,
  manage: ['admin'] as const,

  // 物料
  read_materials: ['admin', 'manager', 'operator', 'viewer'] as const,
  write_materials: ['admin', 'manager', 'operator'] as const,
  delete_materials: ['admin', 'manager'] as const,

  // 批次
  read_batches: ['admin', 'manager', 'operator', 'viewer'] as const,
  write_batches: ['admin', 'manager', 'operator'] as const,
  delete_batches: ['admin', 'manager'] as const,

  // 供应商
  read_suppliers: ['admin', 'manager', 'operator', 'viewer'] as const,
  write_suppliers: ['admin', 'manager'] as const,
  delete_suppliers: ['admin', 'manager'] as const,

  // 条码
  read_barcodes: ['admin', 'manager', 'operator', 'viewer'] as const,
  write_barcodes: ['admin', 'manager', 'operator'] as const,
  delete_barcodes: ['admin', 'manager'] as const,

  // 用户
  read_users: ['admin', 'manager'] as const,
  write_users: ['admin', 'manager'] as const,
  delete_users: ['admin'] as const,

  // 审计日志
  read_audit_logs: ['admin', 'manager'] as const,

  // 统计/设置
  read_analytics: ['admin', 'manager'] as const,
  read_settings: ['admin', 'manager'] as const,
  // Settings 页面使用 write_settings 作为"可编辑"判断
  write_settings: ['admin'] as const,
  manage_settings: ['admin'] as const,
} as const;

type AuthStore = AuthState & AuthActions;

// 将 Supabase User / 本地用户对象，统一映射为应用内 User 类型
const toAppUser = (rawUser: SupabaseUserLike, fallbackEmail?: string): AppUser => {
  const meta = (rawUser.user_metadata ?? {}) as Partial<UserMetadata>;

  const email = (rawUser.email as string | undefined) ?? fallbackEmail ?? '';
  const username =
    (meta.username as string | undefined) ??
    (rawUser.username as string | undefined) ??
    (email ? email.split('@')[0] : 'user');

  const role =
    (meta.role as AppUser['role'] | undefined) ??
    (rawUser.role as AppUser['role'] | undefined) ??
    'viewer';

  const status =
    (meta.status as AppUser['status'] | undefined) ??
    (rawUser.status as AppUser['status'] | undefined) ??
    'active';

  const createdAt = (rawUser.created_at as string | undefined) ?? new Date().toISOString();
  const updatedAt = (rawUser.updated_at as string | undefined) ?? createdAt;

  return {
    id: rawUser.id as string,
    email,
    username,
    full_name: (meta.full_name as string | undefined) ?? (rawUser.full_name as string | undefined),
    role,
    status,
    department: (meta.department as string | undefined) ?? (rawUser.department as string | undefined),
    created_at: createdAt,
    updated_at: updatedAt,
    last_login_at: new Date().toISOString(),
  };
};

// 说明：生产环境权限以 public.users 表为准（数据库侧 RLS 也是这么做的）。
// 这里在登录/启动时同步一次用户档案，避免仅依赖 user_metadata 造成角色不一致或被篡改的风险。
const fetchProfile = async (userId: string): Promise<AppUser | null> => {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) {
      // 0 行/权限不足都可能导致 error，这里不硬失败，回退到 user_metadata
      return null;
    }
    return (data as AppUser) || null;
  } catch (err) {
    reportError(err, 'auth.fetchProfile', { userId });
    return null;
  }
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  signIn: async (email: string, password: string): Promise<boolean> => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      const user = data?.user ?? null;
      if (error || !user) {
        const message = error?.message || '登录失败，请检查邮箱和密码';
        reportError(error ?? new Error(message), 'auth.signIn', { email });
        set({ user: null, loading: false, error: message });
        return false;
      }

      const profile = await fetchProfile(user.id);
      set({ user: profile ?? toAppUser(user, email), loading: false, error: null });
      return true;
    } catch (err) {
      const appError = errorHandler.handle(err, '登录失败');
      reportError(err, 'auth.signIn', { email });
      set({ user: null, loading: false, error: errorHandler.getUserMessage(appError) });
      return false;
    }
  },

  signUp: async (email: string, password: string, metadata?: Partial<UserMetadata>): Promise<boolean> => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata ?? {} },
      });

      const user = data?.user ?? null;
      if (error || !user) {
        const message = error?.message || '注册失败，请稍后重试';
        reportError(error ?? new Error(message), 'auth.signUp', { email });
        set({ loading: false, error: message });
        return false;
      }

      // Supabase 默认不一定会直接返回 session；这里以 user 为准
      const profile = await fetchProfile(user.id);
      set({ user: profile ?? toAppUser(user, email), loading: false, error: null });
      return true;
    } catch (err) {
      const appError = errorHandler.handle(err, '注册失败');
      reportError(err, 'auth.signUp', { email });
      set({ loading: false, error: errorHandler.getUserMessage(appError) });
      return false;
    }
  },

  signOut: async (): Promise<void> => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        reportError(error, 'auth.signOut');
      }
    } finally {
      set({ user: null, loading: false });
    }
  },

  checkAuth: async (): Promise<void> => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        reportError(error, 'auth.checkAuth');
      }

      if (data?.user) {
        const profile = await fetchProfile(data.user.id);
        set({ user: profile ?? toAppUser(data.user), loading: false });
        return;
      }

      set({ user: null, loading: false });
    } catch (err) {
      reportError(err, 'auth.checkAuth');
      set({ user: null, loading: false });
    }
  },

  updateUser: async (data: Partial<AppUser>): Promise<boolean> => {
    set({ loading: true, error: null });

    try {
      const { data: current, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
        reportError(getUserError, 'auth.updateUser.getUser');
      }

      if (!current?.user) {
        set({ loading: false, error: '用户未登录' });
        return false;
      }

      // 仅更新 metadata/扩展字段，避免把 id/created_at 等写回去
      const metadataPatch: Record<string, unknown> = { ...(data as Record<string, unknown>) };
      delete metadataPatch.id;
      delete metadataPatch.email;
      delete metadataPatch.created_at;
      delete metadataPatch.updated_at;
      delete metadataPatch.last_login_at;

      const { error } = await supabase.auth.updateUser({
        data: metadataPatch,
      });

      if (error) {
        reportError(error, 'auth.updateUser');
        set({ loading: false, error: error.message });
        return false;
      }

      // 更新本地状态
      set({ user: { ...(get().user as AppUser), ...data }, loading: false, error: null });
      return true;
    } catch (err) {
      const appError = errorHandler.handle(err, '更新用户信息失败');
      reportError(err, 'auth.updateUser');
      set({ loading: false, error: errorHandler.getUserMessage(appError) });
      return false;
    }
  },

  clearError: (): void => {
    set({ error: null });
  },

  isAuthenticated: (): boolean => {
    return !!get().user;
  },

  hasRole: (role: string): boolean => {
    const user = get().user;
    if (!user) return false;

    const allowedRoles = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] as readonly string[] | undefined;
    return allowedRoles?.includes(user.role) || false;
  },

  hasPermission: (permission: string): boolean => {
    const user = get().user;
    if (!user) return false;

    // 模块权限
    if (permission in MODULE_PERMISSIONS) {
      const allowedRoles = MODULE_PERMISSIONS[permission as keyof typeof MODULE_PERMISSIONS] as readonly string[];
      return allowedRoles.includes(user.role);
    }

    // 基础权限兜底（read/write/delete/manage）
    const basicPermissions = ['read', 'write', 'delete', 'manage'] as const;
    if (basicPermissions.includes(permission as (typeof basicPermissions)[number])) {
      const basicPermissionMap = {
        read: ['admin', 'manager', 'operator', 'viewer'] as const,
        write: ['admin', 'manager', 'operator'] as const,
        delete: ['admin', 'manager'] as const,
        manage: ['admin'] as const,
      } as const;
      
      const allowedRoles = basicPermissionMap[permission as keyof typeof basicPermissionMap] as readonly string[];
      return allowedRoles.includes(user.role);
    }

    return false;
  },
}));

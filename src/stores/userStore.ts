import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, UserFormData, UserQueryParams } from '../types/database';
import { errorHandler, reportError } from '../lib/errorHandler';

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;

  // 获取数据
  fetchUsers: (params?: UserQueryParams) => Promise<void>;

  // CRUD
  createUser: (data: UserFormData & { password: string }) => Promise<User | null>;
  updateUser: (id: string, data: Partial<UserFormData>) => Promise<User | null>;
  deleteUser: (id: string) => Promise<boolean>;
  toggleUserStatus: (id: string, status: 'active' | 'inactive') => Promise<boolean>;

  // 搜索/筛选
  searchUsers: (query: string) => Promise<void>;
  filterByRole: (role: string) => Promise<void>;
  filterByStatus: (status: string) => Promise<void>;

  // 辅助
  getUserById: (id: string) => User | undefined;
  getUserByEmail: (email: string) => User | undefined;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,

  fetchUsers: async (params: UserQueryParams = {}) => {
    set({ loading: true, error: null });

    try {
      let query = supabase.from('users').select('*', { count: 'exact' });

      // 搜索条件
      if (params.search) {
        query = query.or(
          `full_name.ilike.%${params.search}%,email.ilike.%${params.search}%,username.ilike.%${params.search}%`,
        );
      }

      // 角色筛选
      if (params.role) {
        query = query.eq('role', params.role);
      }

      // 状态筛选
      if (params.status) {
        query = query.eq('status', params.status);
      }

      // 部门筛选
      if (params.department) {
        query = query.eq('department', params.department);
      }

      // 排序
      if (params.sort_by) {
        const order = params.sort_order || 'asc';
        query = query.order(params.sort_by, { ascending: order === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // 分页
      const page = params.page || 1;
      const limit = params.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const totalItems = count || 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      set({
        users: (data || []) as User[],
        totalItems,
        totalPages,
        currentPage: page,
        loading: false,
      });
    } catch (err) {
      const appError = errorHandler.handle(err, '获取用户列表失败');
      reportError(err, 'user.fetchUsers', { params });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
    }
  },

  createUser: async (data: UserFormData & { password: string }) => {
    set({ loading: true, error: null });

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      if (!currentUserId) {
        set({ loading: false, error: '用户未登录' });
        return null;
      }

      // 说明：单机模式：直接写入本地 users 表（主存储为 SQLite），不启用线上注册流程。
      const exists = get().users.some((u) => u.email === data.email || u.username === data.username);
      if (exists) {
        throw new Error('用户已存在（邮箱或用户名重复）');
      }

      const id =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id,
            email: data.email,
            username: data.username,
            full_name: data.full_name,
            role: data.role,
            status: data.status || 'active',
            department: data.department,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      await get().fetchUsers({ page: get().currentPage });
      set({ loading: false });
      return (newUser as User) || null;
    } catch (err) {
      const appError = errorHandler.handle(err, '创建用户失败');
      reportError(err, 'user.createUser', { email: data.email });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
      return null;
    }
  },

  updateUser: async (id: string, data: Partial<UserFormData>) => {
    set({ loading: true, error: null });

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      if (!currentUserId) {
        set({ loading: false, error: '用户未登录' });
        return null;
      }

      // 更新 users 表
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 如果更新的是 user_metadata 相关字段，也要更新 auth.users
      if (data.role || data.full_name || data.username || data.department || data.status) {
        const metadataUpdate: Record<string, unknown> = {};
        if (data.role) metadataUpdate.role = data.role;
        if (data.full_name) metadataUpdate.full_name = data.full_name;
        if (data.username) metadataUpdate.username = data.username;
        if (data.department) metadataUpdate.department = data.department;
        if (data.status) metadataUpdate.status = data.status;

        // 注意：这里只能更新当前登录用户自己的 metadata
        // 如果是管理员更新其他用户，需要通过 Supabase Admin API（后端实现）
        if (id === currentUserId) {
          await supabase.auth.updateUser({ data: metadataUpdate });
        }
      }

      // 更新本地列表
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, ...(updatedUser as User) } : u)),
        loading: false,
      }));

      return (updatedUser as User) || null;
    } catch (err) {
      const appError = errorHandler.handle(err, '更新用户失败');
      reportError(err, 'user.updateUser', { id, data });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
      return null;
    }
  },

  deleteUser: async (id: string) => {
    set({ loading: true, error: null });

    try {
      // 注意：删除用户需要通过 Supabase Admin API 才能真正删除 auth.users
      // 这里只删除 users 表的记录，或者将状态改为 inactive
      // 实际生产环境建议使用软删除或状态禁用

      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        loading: false,
      }));

      return true;
    } catch (err) {
      const appError = errorHandler.handle(err, '删除用户失败');
      reportError(err, 'user.deleteUser', { id });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
      return false;
    }
  },

  toggleUserStatus: async (id: string, status: 'active' | 'inactive') => {
    const updated = await get().updateUser(id, { status });
    return !!updated;
  },

  searchUsers: async (query: string) => {
    await get().fetchUsers({ search: query });
  },

  filterByRole: async (role: string) => {
    await get().fetchUsers({ role });
  },

  filterByStatus: async (status: string) => {
    await get().fetchUsers({ status });
  },

  getUserById: (id: string) => get().users.find((u) => u.id === id),
  getUserByEmail: (email: string) => get().users.find((u) => u.email === email),

  clearError: () => {
    set({ error: null });
  },
}));

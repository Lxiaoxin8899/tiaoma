import { create } from 'zustand';
import { supabase, auth } from '../lib/supabase';
import { User } from '../types/database';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  
  // 认证操作
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, metadata?: any) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  
  // 用户操作
  updateUser: (data: Partial<User>) => Promise<boolean>;
  
  // 辅助函数
  clearError: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await auth.signIn(email, password);
      
      if (error) throw error;
      
      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          username: data.user.user_metadata?.username || email.split('@')[0],
          full_name: data.user.user_metadata?.full_name,
          role: data.user.user_metadata?.role || (data.user as any).role || 'viewer',
          status: 'active',
          department: data.user.user_metadata?.department,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at,
          last_login_at: new Date().toISOString()
        };
        
        set({ user, loading: false });
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('登录失败:', error);
      set({ 
        error: error.message || '登录失败，请检查用户名和密码', 
        loading: false 
      });
      return false;
    }
  },

  signUp: async (email: string, password: string, metadata?: any) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await auth.signUp(email, password, {
        username: email.split('@')[0],
        role: 'viewer',
        ...metadata
      });
      
      if (error) throw error;
      
      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          username: data.user.user_metadata?.username || email.split('@')[0],
          full_name: data.user.user_metadata?.full_name,
          role: data.user.user_metadata?.role || 'viewer',
          status: 'active',
          department: data.user.user_metadata?.department,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        };
        
        set({ user, loading: false });
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('注册失败:', error);
      set({ 
        error: error.message || '注册失败，请稍后重试', 
        loading: false 
      });
      return false;
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await auth.signOut();
      
      if (error) throw error;
      
      set({ user: null, loading: false });
    } catch (error: any) {
      console.error('登出失败:', error);
      set({ 
        error: error.message || '登出失败', 
        loading: false 
      });
    }
  },

  checkAuth: async () => {
    set({ loading: true });
    
    try {
      const user = await auth.getCurrentUser();
      
      if (user) {
        const currentUser: User = {
          id: user.id,
          email: user.email!,
          username: user.user_metadata?.username || user.email!.split('@')[0],
          full_name: user.user_metadata?.full_name,
          role: user.user_metadata?.role || (user as any).role || 'viewer',
          status: 'active',
          department: user.user_metadata?.department,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
          last_login_at: new Date().toISOString()
        };
        
        set({ user: currentUser, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      set({ user: null, loading: false });
    }
  },

  updateUser: async (data: Partial<User>) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('用户未登录');
      
      const { error } = await supabase.auth.updateUser({
        data: data
      });
      
      if (error) throw error;
      
      // 更新本地状态
      const updatedUser = { ...get().user, ...data } as User;
      set({ user: updatedUser, loading: false });
      
      return true;
    } catch (error: any) {
      console.error('更新用户信息失败:', error);
      set({ 
        error: error.message || '更新用户信息失败', 
        loading: false 
      });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  isAuthenticated: () => {
    return !!get().user;
  },

  hasRole: (role: string) => {
    const user = get().user;
    if (!user) return false;
    
    const roleHierarchy = {
      admin: ['admin'],
      manager: ['admin', 'manager'],
      operator: ['admin', 'manager', 'operator'],
      viewer: ['admin', 'manager', 'operator', 'viewer']
    };
    
    return roleHierarchy[role as keyof typeof roleHierarchy]?.includes(user.role) || false;
  },

  hasPermission: (permission: string) => {
    const user = get().user;
    if (!user) return false;
    
    // Handle module-specific permissions
    const modulePermissions = {
      // Basic CRUD permissions
      read: ['admin', 'manager', 'operator', 'viewer'],
      write: ['admin', 'manager', 'operator'],
      delete: ['admin', 'manager'],
      manage: ['admin'],
      
      // Module-specific permissions
      read_materials: ['admin', 'manager', 'operator', 'viewer'],
      write_materials: ['admin', 'manager', 'operator'],
      delete_materials: ['admin', 'manager'],
      
      read_batches: ['admin', 'manager', 'operator', 'viewer'],
      write_batches: ['admin', 'manager', 'operator'],
      delete_batches: ['admin', 'manager'],
      
      read_barcodes: ['admin', 'manager', 'operator', 'viewer'],
      write_barcodes: ['admin', 'manager', 'operator'],
      delete_barcodes: ['admin', 'manager'],
      
      read_users: ['admin', 'manager'],
      write_users: ['admin', 'manager'],
      delete_users: ['admin'],
      
      read_analytics: ['admin', 'manager'],
      read_settings: ['admin', 'manager'],
      manage_settings: ['admin']
    };
    
    // Check if it's a module-specific permission
    if (modulePermissions.hasOwnProperty(permission)) {
      const allowedRoles = modulePermissions[permission as keyof typeof modulePermissions];
      return allowedRoles.includes(user.role);
    }
    
    // Fallback to basic permission check
    const basicPermissions = {
      admin: ['read', 'write', 'delete', 'manage'],
      manager: ['read', 'write', 'delete'],
      operator: ['read', 'write'],
      viewer: ['read']
    };
    
    return basicPermissions[user.role as keyof typeof basicPermissions]?.includes(permission) || false;
  }
}));

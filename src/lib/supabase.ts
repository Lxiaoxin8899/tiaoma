import { createClient } from '@supabase/supabase-js';
import { createLocalClient } from './localSupabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const offline = (import.meta.env.VITE_OFFLINE === 'true') || (!supabaseUrl || !supabaseAnonKey);

if (offline) {
  console.warn('Running in offline local mode. Supabase client is replaced by local storage.');
}

export const supabase: any = offline ? createLocalClient() : createClient(supabaseUrl, supabaseAnonKey, {
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
});

// 认证相关函数
export const auth = {
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  signUp: async (email: string, password: string, metadata?: any) => {
    return await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: metadata }
    });
  },

  signOut: async () => {
    return await supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// 错误处理函数
export const handleError = (error: any) => {
  console.error('Supabase error:', error);
  
  if (error?.code === 'PGRST116') {
    return new Error('没有权限访问此资源');
  }
  
  if (error?.code === '23505') {
    return new Error('数据已存在，请勿重复添加');
  }
  
  if (error?.code === '23503') {
    return new Error('关联数据不存在');
  }
  
  return new Error(error?.message || '操作失败，请稍后重试');
};

// 数据验证函数
export const validateData = (data: any, schema: any) => {
  const errors: string[] = [];
  
  Object.keys(schema).forEach(key => {
    const rules = schema[key];
    const value = data[key];
    
    if (rules.required && !value) {
      errors.push(`${key} 是必填项`);
    }
    
    if (value && rules.minLength && value.length < rules.minLength) {
      errors.push(`${key} 最少需要 ${rules.minLength} 个字符`);
    }
    
    if (value && rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${key} 最多允许 ${rules.maxLength} 个字符`);
    }
    
    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${key} 格式不正确`);
    }
  });
  
  return errors;
};

export default supabase;

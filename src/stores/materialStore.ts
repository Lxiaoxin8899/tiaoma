import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { 
  Material, 
  MaterialFormData, 
  MaterialQueryParams,
  MaterialCategory,
  Unit,
  Supplier,
  MaterialStats
} from '../types/database';
import { handleError } from '../lib/supabase';

interface MaterialState {
  materials: Material[];
  categories: MaterialCategory[];
  units: Unit[];
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  stats: MaterialStats | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  
  // 获取数据
  fetchMaterials: (params?: MaterialQueryParams) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchUnits: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  fetchStats: () => Promise<void>;
  
  // CRUD操作
  createMaterial: (data: MaterialFormData) => Promise<Material | null>;
  updateMaterial: (id: string, data: Partial<MaterialFormData>) => Promise<Material | null>;
  deleteMaterial: (id: string) => Promise<boolean>;
  
  // 搜索和筛选
  searchMaterials: (query: string) => Promise<void>;
  filterByCategory: (categoryId: string) => Promise<void>;
  filterByStatus: (status: string) => Promise<void>;
  
  // 辅助函数
  getMaterialById: (id: string) => Material | undefined;
  getMaterialByCode: (code: string) => Material | undefined;
  clearError: () => void;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  categories: [],
  units: [],
  suppliers: [],
  loading: false,
  error: null,
  stats: null,
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,

  fetchMaterials: async (params: MaterialQueryParams = {}) => {
    set({ loading: true, error: null });
    
    try {
      let query = supabase
        .from('materials')
        .select(`
          *,
          unit:units(id, name, symbol),
          category:material_categories(id, name, code),
          supplier:suppliers(id, name, code)
        `, { count: 'exact' });

      // 搜索条件
      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,code.ilike.%${params.search}%,specification.ilike.%${params.search}%`);
      }

      // 分类筛选
      if (params.category_id) {
        query = query.eq('category_id', params.category_id);
      }

      // 状态筛选
      if (params.status) {
        query = query.eq('status', params.status);
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
      const totalPages = Math.ceil(totalItems / limit);

      set({ 
        materials: data || [], 
        loading: false, 
        totalItems,
        totalPages,
        currentPage: page
      });
    } catch (error) {
      console.error('获取物料列表失败:', error);
      set({ 
        error: handleError(error).message, 
        loading: false 
      });
    }
  },

  fetchCategories: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('material_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      set({ categories: data || [], loading: false });
    } catch (error) {
      console.error('获取物料分类失败:', error);
      set({ 
        error: handleError(error).message, 
        loading: false 
      });
    }
  },

  fetchUnits: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');

      if (error) throw error;

      set({ units: data || [], loading: false });
    } catch (error) {
      console.error('获取单位失败:', error);
      set({ 
        error: handleError(error).message, 
        loading: false 
      });
    }
  },

  fetchSuppliers: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      set({ suppliers: data || [], loading: false });
    } catch (error) {
      console.error('获取供应商失败:', error);
      set({ 
        error: handleError(error).message, 
        loading: false 
      });
    }
  },

  fetchStats: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 获取物料统计
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('status, current_stock, min_stock');

      if (materialsError) throw materialsError;

      // 获取分类统计
      const { count: categoryCount, error: categoryError } = await supabase
        .from('material_categories')
        .select('*', { count: 'exact', head: true });

      if (categoryError) throw categoryError;

      const totalMaterials = materials?.length || 0;
      const activeMaterials = materials?.filter(m => m.status === 'active').length || 0;
      const lowStockCount = materials?.filter(m => m.current_stock <= m.min_stock).length || 0;

      const stats: MaterialStats = {
        total_materials: totalMaterials,
        active_materials: activeMaterials,
        low_stock_count: lowStockCount,
        total_categories: categoryCount || 0
      };

      set({ stats });
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  },

  createMaterial: async (data: MaterialFormData) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');

      const { data: newMaterial, error } = await supabase
        .from('materials')
        .insert([{
          ...data,
          current_stock: 0,
          created_by: user.id,
          updated_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // 重新获取列表
      await get().fetchMaterials();
      
      set({ loading: false });
      return newMaterial;
    } catch (error) {
      console.error('创建物料失败:', error);
      set({ 
        error: handleError(error).message, 
        loading: false 
      });
      return null;
    }
  },

  updateMaterial: async (id: string, data: Partial<MaterialFormData>) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');

      const { data: updatedMaterial, error } = await supabase
        .from('materials')
        .update({
          ...data,
          updated_by: user.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 更新本地状态
      set(state => ({
        materials: state.materials.map(m => 
          m.id === id ? { ...m, ...updatedMaterial } : m
        ),
        loading: false
      }));

      return updatedMaterial;
    } catch (error) {
      console.error('更新物料失败:', error);
      set({ 
        error: handleError(error).message, 
        loading: false 
      });
      return null;
    }
  },

  deleteMaterial: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 更新本地状态
      set(state => ({
        materials: state.materials.filter(m => m.id !== id),
        loading: false
      }));

      return true;
    } catch (error) {
      console.error('删除物料失败:', error);
      set({ 
        error: handleError(error).message, 
        loading: false 
      });
      return false;
    }
  },

  searchMaterials: async (query: string) => {
    await get().fetchMaterials({ search: query });
  },

  filterByCategory: async (categoryId: string) => {
    await get().fetchMaterials({ category_id: categoryId });
  },

  filterByStatus: async (status: string) => {
    await get().fetchMaterials({ status });
  },

  getMaterialById: (id: string) => {
    return get().materials.find(m => m.id === id);
  },

  getMaterialByCode: (code: string) => {
    return get().materials.find(m => m.code === code);
  },

  clearError: () => {
    set({ error: null });
  }
}));
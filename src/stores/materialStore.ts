import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  Material,
  MaterialFormData,
  MaterialQueryParams,
  MaterialCategory,
  Unit,
  Supplier,
  MaterialStats,
} from '../types/database';
import { errorHandler, reportError } from '../lib/errorHandler';

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

  // CRUD
  createMaterial: (data: MaterialFormData) => Promise<Material | null>;
  updateMaterial: (id: string, data: Partial<MaterialFormData>) => Promise<Material | null>;
  deleteMaterial: (id: string) => Promise<boolean>;

  // 搜索/筛选（简单封装，便于组件调用）
  searchMaterials: (query: string) => Promise<void>;
  filterByCategory: (categoryId: string) => Promise<void>;
  filterByStatus: (status: string) => Promise<void>;

  // 辅助
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
        // 说明：在线模式用外键联表；离线模式由 localSupabase 在本地自动补齐 unit_obj/category
        .select(
          `
          *,
          unit_obj:units(id, code, name, symbol),
          category:material_categories(id, code, name)
        `,
          { count: 'exact' },
        );

      // 搜索条件
      if (params.search) {
        query = query.or(
          `name.ilike.%${params.search}%,code.ilike.%${params.search}%,specification.ilike.%${params.search}%`,
        );
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
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      set({
        materials: (data || []) as Material[],
        totalItems,
        totalPages,
        currentPage: page,
        loading: false,
      });
    } catch (err) {
      const appError = errorHandler.handle(err, '获取物料列表失败');
      reportError(err, 'material.fetchMaterials', { params });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
    }
  },

  fetchCategories: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.from('material_categories').select('*').order('name');
      if (error) throw error;

      set({ categories: (data || []) as MaterialCategory[], loading: false });
    } catch (err) {
      const appError = errorHandler.handle(err, '获取物料分类失败');
      reportError(err, 'material.fetchCategories');
      set({ error: errorHandler.getUserMessage(appError), loading: false });
    }
  },

  fetchUnits: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.from('units').select('*').order('name');
      if (error) throw error;

      set({ units: (data || []) as Unit[], loading: false });
    } catch (err) {
      const appError = errorHandler.handle(err, '获取单位失败');
      reportError(err, 'material.fetchUnits');
      set({ error: errorHandler.getUserMessage(appError), loading: false });
    }
  },

  fetchSuppliers: async () => {
    // 备注：目前物料表单未使用 supplier，但保留该能力便于后续扩展
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;

      set({ suppliers: (data || []) as Supplier[], loading: false });
    } catch (err) {
      const appError = errorHandler.handle(err, '获取供应商失败');
      reportError(err, 'material.fetchSuppliers');
      set({ error: errorHandler.getUserMessage(appError), loading: false });
    }
  },

  fetchStats: async () => {
    try {
      // 统计数据优先基于数据库计算；离线模式同样可用
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('status, current_stock, min_stock');

      if (materialsError) throw materialsError;

      const { count: categoryCount, error: categoryError } = await supabase
        .from('material_categories')
        .select('*', { count: 'exact', head: true });

      if (categoryError) throw categoryError;

      const rows = (materials || []) as Array<{
        status?: string;
        current_stock?: number;
        min_stock?: number;
      }>;

      const totalMaterials = rows.length;
      const activeMaterials = rows.filter((m) => m.status === 'active').length;
      const lowStockCount = rows.filter((m) => (m.current_stock ?? 0) <= (m.min_stock ?? 0)).length;

      const stats: MaterialStats = {
        total_materials: totalMaterials,
        active_materials: activeMaterials,
        low_stock_count: lowStockCount,
        total_categories: categoryCount || 0,
      };

      set({ stats });
    } catch (err) {
      reportError(err, 'material.fetchStats');
    }
  },

  createMaterial: async (data: MaterialFormData) => {
    set({ loading: true, error: null });

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        set({ loading: false, error: '用户未登录' });
        return null;
      }

      const { data: newMaterial, error } = await supabase
        .from('materials')
        .insert([
          {
            ...data,
            current_stock: 0,
            created_by: userId,
            updated_by: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 重新拉取列表，保证联表字段一致
      await get().fetchMaterials({ page: get().currentPage });

      set({ loading: false });
      return (newMaterial as Material) || null;
    } catch (err) {
      const appError = errorHandler.handle(err, '创建物料失败');
      reportError(err, 'material.createMaterial', { data });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
      return null;
    }
  },

  updateMaterial: async (id: string, data: Partial<MaterialFormData>) => {
    set({ loading: true, error: null });

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        set({ loading: false, error: '用户未登录' });
        return null;
      }

      const { data: updatedMaterial, error } = await supabase
        .from('materials')
        .update({
          ...data,
          updated_by: userId,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 更新本地列表（避免整页刷新闪烁）
      set((state) => ({
        materials: state.materials.map((m) => (m.id === id ? { ...m, ...(updatedMaterial as Material) } : m)),
        loading: false,
      }));

      return (updatedMaterial as Material) || null;
    } catch (err) {
      const appError = errorHandler.handle(err, '更新物料失败');
      reportError(err, 'material.updateMaterial', { id, data });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
      return null;
    }
  },

  deleteMaterial: async (id: string) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({
        materials: state.materials.filter((m) => m.id !== id),
        loading: false,
      }));

      return true;
    } catch (err) {
      const appError = errorHandler.handle(err, '删除物料失败');
      reportError(err, 'material.deleteMaterial', { id });
      set({ error: errorHandler.getUserMessage(appError), loading: false });
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

  getMaterialById: (id: string) => get().materials.find((m) => m.id === id),
  getMaterialByCode: (code: string) => get().materials.find((m) => m.code === code),

  clearError: () => {
    set({ error: null });
  },
}));

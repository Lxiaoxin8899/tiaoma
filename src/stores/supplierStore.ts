import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Supplier, SupplierFormData, QueryParams } from '@/types/database'
import { notify } from '@/lib/notify'

interface SupplierState {
  suppliers: Supplier[]
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  searchQuery: string
  
  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSearchQuery: (query: string) => void
  setPagination: (page: number, pageSize: number) => void
  
  // CRUD Operations
  fetchSuppliers: (params?: QueryParams) => Promise<void>
  createSupplier: (data: SupplierFormData) => Promise<boolean>
  updateSupplier: (id: string, data: Partial<SupplierFormData>) => Promise<boolean>
  deleteSupplier: (id: string) => Promise<boolean>
  
  // Utility
  getSupplierById: (id: string) => Supplier | null
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  searchQuery: '',
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setPagination: (currentPage, pageSize) => set({ currentPage, pageSize }),
  
  fetchSuppliers: async (params) => {
    const { currentPage, pageSize, searchQuery } = get()
    const { page = currentPage, limit = pageSize } = params || {}
    
    set({ loading: true, error: null })
    
    try {
      let query = supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      
      // Apply search filter
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
      }
      
      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query
      
      if (error) throw error

      const suppliers = (data as Supplier[] | null) || []
      set({
        suppliers,
        totalCount: count || 0,
        currentPage: page,
        pageSize: limit,
        loading: false
      })
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      set({ 
        error: '获取供应商列表失败',
        loading: false 
      })
      notify.error('获取供应商列表失败')
    }
  },
  
  createSupplier: async (data) => {
    set({ loading: true, error: null })
    
    try {
      const supplierData = {
        ...data,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }
      
      const { error } = await supabase
        .from('suppliers')
        .insert([supplierData])
      
      if (error) throw error
      
      notify.success('供应商创建成功')
      await get().fetchSuppliers()
      return true
    } catch (error) {
      console.error('Error creating supplier:', error)
      set({ 
        error: '创建供应商失败',
        loading: false 
      })
      notify.error('创建供应商失败')
      return false
    }
  },
  
  updateSupplier: async (id, data) => {
    set({ loading: true, error: null })
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) throw error
      
      notify.success('供应商更新成功')
      await get().fetchSuppliers()
      return true
    } catch (error) {
      console.error('Error updating supplier:', error)
      set({ 
        error: '更新供应商失败',
        loading: false 
      })
      notify.error('更新供应商失败')
      return false
    }
  },
  
  deleteSupplier: async (id) => {
    set({ loading: true, error: null })
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      notify.success('供应商删除成功')
      await get().fetchSuppliers()
      return true
    } catch (error) {
      console.error('Error deleting supplier:', error)
      set({ 
        error: '删除供应商失败',
        loading: false 
      })
      notify.error('删除供应商失败')
      return false
    }
  },
  
  getSupplierById: (id) => {
    return get().suppliers.find(supplier => supplier.id === id) || null
  }
}))

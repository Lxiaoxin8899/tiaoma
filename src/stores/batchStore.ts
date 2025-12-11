import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { MaterialBatch, BatchFormData, BatchQueryParams } from '@/types/database'
import { toast } from 'react-hot-toast'

interface BatchState {
  batches: MaterialBatch[]
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  searchQuery: string
  selectedMaterialId: string | null
  
  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSearchQuery: (query: string) => void
  setSelectedMaterialId: (id: string | null) => void
  setPagination: (page: number, pageSize: number) => void
  
  // CRUD Operations
  fetchBatches: (params?: BatchQueryParams) => Promise<void>
  createBatch: (data: BatchFormData) => Promise<boolean>
  updateBatch: (id: string, data: Partial<BatchFormData>) => Promise<boolean>
  deleteBatch: (id: string) => Promise<boolean>
  
  // Batch Generation
  generateBatchNumber: (materialId: string) => Promise<string>
  
  // Batch Tracking
  getBatchById: (id: string) => MaterialBatch | null
  getBatchesByMaterial: (materialId: string) => Promise<MaterialBatch[]>
  getExpiredBatches: () => Promise<MaterialBatch[]>
  
  // Statistics
  getBatchStatistics: () => Promise<{
    totalBatches: number
    activeBatches: number
    expiredBatches: number
    lowStockBatches: number
  }>
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: [],
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  searchQuery: '',
  selectedMaterialId: null,
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setSelectedMaterialId: (selectedMaterialId) => set({ selectedMaterialId }),
  setPagination: (currentPage, pageSize) => set({ currentPage, pageSize }),
  
  fetchBatches: async (params) => {
    const { currentPage, pageSize, searchQuery, selectedMaterialId } = get()
    const { page = currentPage, limit = pageSize, materialId = selectedMaterialId } = params || {}
    
    set({ loading: true, error: null })
    
    try {
      let query = supabase
        .from('material_batches')
        .select(`
          *,
          material:materials!material_id(
            id,
            code,
            name,
            specification,
            unit:units(name)
          ),
          supplier:suppliers!supplier_id(
            id,
            name,
            code
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (searchQuery) {
        query = query.or(`batch_number.ilike.%${searchQuery}%,material.name.ilike.%${searchQuery}%`)
      }
      
      if (materialId) {
        query = query.eq('material_id', materialId)
      }
      
      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      set({
        batches: data || [],
        totalCount: count || 0,
        currentPage: page,
        pageSize: limit,
        loading: false
      })
    } catch (error) {
      console.error('Error fetching batches:', error)
      set({ 
        error: '获取批次列表失败',
        loading: false 
      })
      toast.error('获取批次列表失败')
    }
  },
  
  createBatch: async (data) => {
    set({ loading: true, error: null })
    
    try {
      // Generate batch number if not provided
      let batchNumber = data.batch_number
      if (!batchNumber) {
        batchNumber = await get().generateBatchNumber(data.material_id)
      }
      
      const batchData = {
        ...data,
        batch_number: batchNumber,
        status: data.status || 'active',
        created_by: (await supabase.auth.getUser()).data.user?.id
      }
      
      const { error } = await supabase
        .from('material_batches')
        .insert([batchData])
      
      if (error) throw error
      
      toast.success('批次创建成功')
      await get().fetchBatches()
      return true
    } catch (error) {
      console.error('Error creating batch:', error)
      set({ 
        error: '创建批次失败',
        loading: false 
      })
      toast.error('创建批次失败')
      return false
    }
  },
  
  updateBatch: async (id, data) => {
    set({ loading: true, error: null })
    
    try {
      const { error } = await supabase
        .from('material_batches')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) throw error
      
      toast.success('批次更新成功')
      await get().fetchBatches()
      return true
    } catch (error) {
      console.error('Error updating batch:', error)
      set({ 
        error: '更新批次失败',
        loading: false 
      })
      toast.error('更新批次失败')
      return false
    }
  },
  
  deleteBatch: async (id) => {
    set({ loading: true, error: null })
    
    try {
      const { error } = await supabase
        .from('material_batches')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast.success('批次删除成功')
      await get().fetchBatches()
      return true
    } catch (error) {
      console.error('Error deleting batch:', error)
      set({ 
        error: '删除批次失败',
        loading: false 
      })
      toast.error('删除批次失败')
      return false
    }
  },
  
  generateBatchNumber: async (materialId) => {
    try {
      // Get material info
      const { data: material } = await supabase
        .from('materials')
        .select('code')
        .eq('id', materialId)
        .single()
      
      if (!material) {
        throw new Error('物料不存在')
      }
      
      // Generate batch number: MATERIAL_CODE + YYYYMMDD + 3-digit sequence
      const today = new Date()
      const dateStr = today.getFullYear().toString() + 
                     (today.getMonth() + 1).toString().padStart(2, '0') + 
                     today.getDate().toString().padStart(2, '0')
      
      // Get today's batch count for this material
      const { count } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
        .eq('material_id', materialId)
        .gte('created_at', today.toISOString().split('T')[0])
      
      const sequence = ((count || 0) + 1).toString().padStart(3, '0')
      
      return `${material.code}-${dateStr}-${sequence}`
    } catch (error) {
      console.error('Error generating batch number:', error)
      throw error
    }
  },
  
  getBatchById: (id) => {
    return get().batches.find(batch => batch.id === id) || null
  },
  
  getBatchesByMaterial: async (materialId) => {
    try {
      const { data, error } = await supabase
        .from('material_batches')
        .select(`
          *,
          material:materials!material_id(
            id,
            code,
            name,
            specification
          ),
          supplier:suppliers!supplier_id(
            id,
            name,
            code
          )
        `)
        .eq('material_id', materialId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching batches by material:', error)
      return []
    }
  },
  
  getExpiredBatches: async () => {
    try {
      const { data, error } = await supabase
        .from('material_batches')
        .select(`
          *,
          material:materials!material_id(
            id,
            code,
            name,
            specification
          )
        `)
        .lt('expiry_date', new Date().toISOString())
        .eq('status', 'active')
        .order('expiry_date', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching expired batches:', error)
      return []
    }
  },
  
  getBatchStatistics: async () => {
    try {
      const today = new Date().toISOString()
      
      // Total batches
      const { count: totalBatches } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
      
      // Active batches
      const { count: activeBatches } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      
      // Expired batches
      const { count: expiredBatches } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
        .lt('expiry_date', today)
        .eq('status', 'active')
      
      // Low stock batches (quantity < 10)
      const { count: lowStockBatches } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
        .lt('quantity', 10)
        .eq('status', 'active')
      
      return {
        totalBatches: totalBatches || 0,
        activeBatches: activeBatches || 0,
        expiredBatches: expiredBatches || 0,
        lowStockBatches: lowStockBatches || 0
      }
    } catch (error) {
      console.error('Error fetching batch statistics:', error)
      return {
        totalBatches: 0,
        activeBatches: 0,
        expiredBatches: 0,
        lowStockBatches: 0
      }
    }
  }
}))
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
    const { currentPage, pageSize, searchQuery: storedSearch, selectedMaterialId } = get()
    const { page = currentPage, limit = pageSize, materialId = selectedMaterialId, search } = params || {}
    const effectiveSearch = search ?? storedSearch
    
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
            unit_obj:units(id, code, name, symbol)
          ),
          supplier:suppliers!supplier_id(
            id,
            name,
            code
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (effectiveSearch) {
        query = query.or(`batch_number.ilike.%${effectiveSearch}%,material.name.ilike.%${effectiveSearch}%`)
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

      const batches = (data as MaterialBatch[] | null) || []
      set({
        batches,
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
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id

      // Generate batch number if not provided
      let batchNumber = data.batch_number
      if (!batchNumber) {
        batchNumber = await get().generateBatchNumber(data.material_id)
      }
      
      const batchData = {
        ...data,
        batch_number: batchNumber,
        // 数据库/类型里批次状态使用 pending/available/...，这里默认使用 pending
        status: data.status || 'pending',
        // 初始库存=入库数量（后续出库只更新 remaining_quantity）
        remaining_quantity: data.remaining_quantity ?? data.quantity,
        created_by: userId,
        updated_by: userId,
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
      const current = get().batches.find((b) => b.id === id)

      // 说明：如果是从“编辑入库单”更新了入库数量(quantity)，但没有显式传 remaining_quantity，
      // 则按“已出库数量不变”的原则重算 remaining_quantity，避免库存/统计错乱。
      const updatePayload: Record<string, unknown> = {
        ...data,
        updated_at: new Date().toISOString(),
      }

      const explicitRemaining = (data as Partial<{ remaining_quantity?: number }>).remaining_quantity
      if (typeof explicitRemaining !== 'number' && typeof data.quantity === 'number' && current) {
        const prevQty = current.quantity ?? data.quantity
        const prevRemaining = current.remaining_quantity ?? prevQty
        const consumed = Math.max(0, prevQty - prevRemaining)
        updatePayload.remaining_quantity = Math.max(0, data.quantity - consumed)
      }

      // 若显式更新 remaining_quantity（例如出库），做一次下限保护与状态联动
      if (typeof explicitRemaining === 'number') {
        const nextRemaining = Math.max(0, explicitRemaining)
        updatePayload.remaining_quantity = nextRemaining
        if (nextRemaining === 0 && !updatePayload.status) {
          updatePayload.status = 'disposed'
        }
      }

      const { error } = await supabase
        .from('material_batches')
        .update(updatePayload)
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
      
      const materialRow = material as { code?: string } | null
      if (!materialRow?.code) {
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
      
      return `${materialRow.code}-${dateStr}-${sequence}`
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
      return (data as MaterialBatch[] | null) || []
    } catch (error) {
      console.error('Error fetching batches by material:', error)
      return []
    }
  },
  
  getExpiredBatches: async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
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
        .lt('expiry_date', today)
        .eq('status', 'expired')
        .order('expiry_date', { ascending: true })
      
      if (error) throw error
      return (data as MaterialBatch[] | null) || []
    } catch (error) {
      console.error('Error fetching expired batches:', error)
      return []
    }
  },
  
  getBatchStatistics: async () => {
    try {
      // Total batches
      const { count: totalBatches } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
      
      // Active batches
      const { count: activeBatches } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available')
      
      // Expired batches
      const { count: expiredBatches } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'expired')
      
      // Low stock batches (remaining_quantity < 10)
      const { count: lowStockBatches } = await supabase
        .from('material_batches')
        .select('*', { count: 'exact', head: true })
        .lt('remaining_quantity', 10)
        .eq('status', 'available')
      
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

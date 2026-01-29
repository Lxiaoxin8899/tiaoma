/**
 * 库存预警 Store
 * 管理低库存预警、过期预警等
 */

import { create } from 'zustand'
import { db, enrich } from '@/lib/localdb'

export interface Alert {
  id: string
  type: 'low_stock' | 'expiring' | 'expired' | 'overstock'
  severity: 'warning' | 'danger' | 'info'
  title: string
  message: string
  materialId?: string
  batchId?: string
  createdAt: string
  read: boolean
}

interface AlertSettings {
  lowStockEnabled: boolean
  lowStockThreshold: number // 百分比，低于最小库存的百分比
  expiringEnabled: boolean
  expiringDays: number // 提前多少天预警
  overstockEnabled: boolean
  overstockThreshold: number // 百分比，超过最大库存的百分比
}

interface AlertState {
  alerts: Alert[]
  settings: AlertSettings
  loading: boolean

  // Actions
  checkAlerts: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismissAlert: (id: string) => void
  updateSettings: (settings: Partial<AlertSettings>) => void
  getUnreadCount: () => number
}

const DEFAULT_SETTINGS: AlertSettings = {
  lowStockEnabled: true,
  lowStockThreshold: 100, // 低于最小库存时预警
  expiringEnabled: true,
  expiringDays: 30, // 30天内过期预警
  overstockEnabled: true,
  overstockThreshold: 100, // 超过最大库存时预警
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  settings: DEFAULT_SETTINGS,
  loading: false,

  checkAlerts: () => {
    const { settings } = get()
    const alerts: Alert[] = []
    const now = new Date()

    try {
      // 检查物料库存
      const materials = db.getAll('materials') as any[]
      materials.forEach(m => {
        const material = enrich.material(m)

        // 低库存预警
        if (settings.lowStockEnabled && material.current_stock <= material.min_stock) {
          alerts.push({
            id: `low_stock_${material.id}`,
            type: 'low_stock',
            severity: material.current_stock === 0 ? 'danger' : 'warning',
            title: '低库存预警',
            message: `${material.name} (${material.code}) 当前库存 ${material.current_stock}，低于最小库存 ${material.min_stock}`,
            materialId: material.id,
            createdAt: now.toISOString(),
            read: false,
          })
        }

        // 超库存预警
        if (settings.overstockEnabled && material.max_stock > 0 && material.current_stock > material.max_stock) {
          alerts.push({
            id: `overstock_${material.id}`,
            type: 'overstock',
            severity: 'info',
            title: '超库存提醒',
            message: `${material.name} (${material.code}) 当前库存 ${material.current_stock}，超过最大库存 ${material.max_stock}`,
            materialId: material.id,
            createdAt: now.toISOString(),
            read: false,
          })
        }
      })

      // 检查批次过期
      if (settings.expiringEnabled) {
        const batches = db.getAll('material_batches') as any[]
        const warningDate = new Date(now.getTime() + settings.expiringDays * 24 * 60 * 60 * 1000)

        batches.forEach(b => {
          if (!b.expiry_date) return
          const batch = enrich.batch(b)
          const expiryDate = new Date(batch.expiry_date)
          const remaining = batch.remaining_quantity ?? batch.quantity

          // 跳过已处置或无库存的批次
          if (batch.status === 'disposed' || remaining <= 0) return

          if (expiryDate < now) {
            // 已过期
            alerts.push({
              id: `expired_${batch.id}`,
              type: 'expired',
              severity: 'danger',
              title: '已过期',
              message: `批次 ${batch.batch_number} (${batch.material?.name || '未知物料'}) 已于 ${batch.expiry_date} 过期，剩余库存 ${remaining}`,
              batchId: batch.id,
              materialId: batch.material_id,
              createdAt: now.toISOString(),
              read: false,
            })
          } else if (expiryDate < warningDate) {
            // 即将过期
            const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            alerts.push({
              id: `expiring_${batch.id}`,
              type: 'expiring',
              severity: 'warning',
              title: '即将过期',
              message: `批次 ${batch.batch_number} (${batch.material?.name || '未知物料'}) 将在 ${daysLeft} 天后过期，剩余库存 ${remaining}`,
              batchId: batch.id,
              materialId: batch.material_id,
              createdAt: now.toISOString(),
              read: false,
            })
          }
        })
      }

      // 保留已读状态
      const existingAlerts = get().alerts
      const mergedAlerts = alerts.map(alert => {
        const existing = existingAlerts.find(a => a.id === alert.id)
        return existing ? { ...alert, read: existing.read } : alert
      })

      set({ alerts: mergedAlerts })
    } catch (error) {
      console.error('检查预警失败:', error)
    }
  },

  markAsRead: (id: string) => {
    set(state => ({
      alerts: state.alerts.map(a =>
        a.id === id ? { ...a, read: true } : a
      )
    }))
  },

  markAllAsRead: () => {
    set(state => ({
      alerts: state.alerts.map(a => ({ ...a, read: true }))
    }))
  },

  dismissAlert: (id: string) => {
    set(state => ({
      alerts: state.alerts.filter(a => a.id !== id)
    }))
  },

  updateSettings: (newSettings: Partial<AlertSettings>) => {
    set(state => ({
      settings: { ...state.settings, ...newSettings }
    }))
    // 重新检查预警
    get().checkAlerts()
  },

  getUnreadCount: () => {
    return get().alerts.filter(a => !a.read).length
  },
}))

export default useAlertStore

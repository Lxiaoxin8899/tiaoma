/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 说明：数据模式开关（online/offline）
  readonly VITE_DATA_MODE?: string
  // 说明：Supabase API 地址（例如 http://localhost:8000）
  readonly VITE_SUPABASE_URL?: string
  // 说明：Supabase ANON KEY
  readonly VITE_SUPABASE_ANON_KEY?: string
  // 说明：可选功能开关
  readonly VITE_ENABLE_IP_LOGGING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// =============================================================================
// Electron 预加载桥接类型（单机备份/回收站等）
// =============================================================================

interface Window {
  tiaoma?: {
    db?: {
      getAll: (table: string, opts?: { includeDeleted?: boolean }) => unknown[]
      getById: (table: string, id: string) => unknown | null
      insert: (table: string, row: Record<string, unknown>) => unknown | null
      update: (table: string, id: string, patch: Record<string, unknown>) => unknown | null
      delete: (table: string, id: string) => boolean
      listDeleted: (table: string) => unknown[]
      restore: (table: string, id: string) => unknown | null
      hardDelete: (table: string, id: string) => boolean
      getMeta: (key: string) => string | null
      setMeta: (key: string, value: string) => boolean
      importSnapshot: (snapshot: unknown) => boolean
      replaceAll: (table: string, rows: unknown[]) => boolean
    }
    backup: {
      save: (json: string, opts?: { retentionDays?: number }) => Promise<{ ok: boolean; path?: string; error?: string }>
      openFolder: () => Promise<{ ok: boolean; path?: string; error?: string | null }>
      list: () => Promise<{ ok: boolean; files?: Array<{ name: string; path: string; size: number; mtime: string }>; error?: string }>
      read: (filePath: string) => Promise<{ ok: boolean; content?: string; error?: string }>
      delete: (filePath: string) => Promise<{ ok: boolean; error?: string }>
    }
  }
}

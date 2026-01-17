/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 说明：本项目定位为单机软件；不再暴露线上 Supabase 相关环境变量，避免数据源分裂
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
    }
  }
}

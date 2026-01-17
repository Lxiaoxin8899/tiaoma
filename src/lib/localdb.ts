/* eslint-disable */
const KEY_PREFIX = 'mma_local_'

const tableKeys = {
  materials: KEY_PREFIX + 'materials',
  material_categories: KEY_PREFIX + 'material_categories',
  units: KEY_PREFIX + 'units',
  suppliers: KEY_PREFIX + 'suppliers',
  material_batches: KEY_PREFIX + 'material_batches',
  barcodes: KEY_PREFIX + 'barcodes',
  users: KEY_PREFIX + 'users',
  sessions: KEY_PREFIX + 'sessions',
  system_settings: KEY_PREFIX + 'system_settings',
  audit_logs: KEY_PREFIX + 'audit_logs'
}

// 说明：软删除表清单（用于“回收站”）
// - 软删除：标记 _deleted/_deleted_at，不直接从 localStorage 物理删除，便于误删恢复
// - 其余表（例如 sessions/system_settings）仍按硬删除处理
const SOFT_DELETE_TABLES = new Set<keyof typeof tableKeys>([
  'materials',
  'suppliers',
  'material_batches',
  'barcodes',
])

type ChangeEvent =
  | { type: 'insert'; table: keyof typeof tableKeys; id: string }
  | { type: 'update'; table: keyof typeof tableKeys; id: string }
  | { type: 'delete'; table: keyof typeof tableKeys; id: string; soft: boolean }
  | { type: 'restore'; table: keyof typeof tableKeys; id: string }
  | { type: 'hardDelete'; table: keyof typeof tableKeys; id: string }

type ChangeListener = (e: ChangeEvent) => void
const changeListeners: ChangeListener[] = []

const emitChange = (e: ChangeEvent) => {
  for (const cb of changeListeners) {
    try {
      cb(e)
    } catch {
      // 忽略：监听器不应影响主流程
    }
  }
}

const nowIso = () => new Date().toISOString()

// =============================================================================
// 存储适配层
//
// - 生产单机（Electron）：使用 SQLite（主进程 better-sqlite3）作为唯一数据源
// - 开发调试（浏览器）：回退使用 localStorage（避免开发时必须跑 Electron）
// =============================================================================

// 说明：判断是否在 Electron 渲染进程中运行（用于避免“缺桥接时回退 localStorage 造成两套数据”）
// - Electron Dev（加载 http://localhost:5173）同样会包含 Electron UA
// - 浏览器调试不会包含 Electron UA
const isElectronRuntime = () =>
  typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')

const hasNativeDb = () => typeof window !== 'undefined' && !!window.tiaoma?.db?.getAll

// 说明：单机生产环境必须使用 SQLite；若桥接未注入，直接报错阻止回退到 localStorage，避免数据源分裂
if (typeof window !== 'undefined' && isElectronRuntime() && !hasNativeDb()) {
  throw new Error('单机数据库桥接未就绪：请检查 Electron preload 是否正确加载（window.tiaoma.db 不存在）。')
}

// 说明：旧版 localStorage 存储读取（仅用于开发模式/迁移）
const legacyLoadRows = (key: string) => {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

const legacySaveRows = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value))
}

// 说明：用 typeof 保护 crypto，避免在极少数运行环境下触发 ReferenceError
const uuid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const isSoftDeleted = (row: any) => !!row?._deleted

// 说明：级联软删除（单机模式下用于保证数据一致性）
// - 删除物料：同步软删其批次与条码，避免出现“批次还在但物料联表为空”的异常体验
// - 删除批次：同步软删其条码
const cascadeSoftDelete = (table: keyof typeof tableKeys, id: string) => {
  const markRows = (t: keyof typeof tableKeys, predicate: (r: any) => boolean) => {
    if (!SOFT_DELETE_TABLES.has(t)) return
    const rows = legacyLoadRows(tableKeys[t])
    let changed = false
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!predicate(r)) continue
      if (r?._deleted) continue
      rows[i] = { ...r, _deleted: true, _deleted_at: nowIso(), updated_at: nowIso() }
      changed = true
      if (r?.id) emitChange({ type: 'delete', table: t, id: r.id, soft: true })
    }
    if (changed) legacySaveRows(tableKeys[t], rows)
  }

  if (table === 'materials') {
    markRows('material_batches', (r) => r?.material_id === id)
    markRows('barcodes', (r) => r?.material_id === id)
  }
  if (table === 'material_batches') {
    markRows('barcodes', (r) => r?.batch_id === id)
  }
}

// =============================================================================
// 迁移：localStorage -> SQLite（仅 Electron 首次启用 SQLite 时执行一次）
// =============================================================================

const migrateLegacyToSqliteIfNeeded = () => {
  if (!hasNativeDb()) return
  const metaKey = 'migrated_from_localstorage_v1'
  const migrated = window.tiaoma!.db!.getMeta(metaKey)
  if (migrated) return

  // 说明：从旧版 localStorage 读取表数据
  const tables: Record<string, any[]> = {}
  for (const [name, key] of Object.entries(tableKeys)) {
    if (name === 'sessions') continue
    tables[name] = legacyLoadRows(key)
  }

  // 说明：迁移会话（原来是单独存一份对象，不是数组）
  try {
    const sessionRaw = localStorage.getItem(tableKeys.sessions)
    if (sessionRaw) {
      const payload = JSON.parse(sessionRaw)
      if (payload && typeof payload === 'object') {
        tables.sessions = [
          { id: 'current', ...payload, created_at: nowIso(), updated_at: nowIso() },
        ]
      }
    }
  } catch {
    // 忽略
  }

  const hasAny = Object.values(tables).some((rows) => Array.isArray(rows) && rows.length > 0)
  if (hasAny) {
    window.tiaoma!.db!.importSnapshot({
      version: 1,
      exported_at: nowIso(),
      tables,
    })
  }

  window.tiaoma!.db!.setMeta(metaKey, '1')
}

export const db = {
  // 说明：默认不返回软删除数据；需要回收站时可传 includeDeleted=true
  getAll: (table: keyof typeof tableKeys, opts?: { includeDeleted?: boolean }) => {
    // 说明：Electron 单机使用 SQLite
    if (hasNativeDb()) {
      return window.tiaoma!.db!.getAll(table, opts)
    }

    // 浏览器调试：回退 localStorage
    const rows = legacyLoadRows(tableKeys[table])
    if (opts?.includeDeleted) return rows
    return rows.filter((r: any) => !isSoftDeleted(r))
  },
  setAll: (table: keyof typeof tableKeys, rows: any[]) => {
    if (hasNativeDb()) {
      // 说明：SQLite 侧做全量替换，避免双写
      return window.tiaoma!.db!.replaceAll(table as string, rows)
    }
    legacySaveRows(tableKeys[table], rows)
  },
  insert: (table: keyof typeof tableKeys, row: any) => {
    if (hasNativeDb()) {
      const inserted = window.tiaoma!.db!.insert(table as string, row)
      const id = (inserted as any)?.id || row?.id || ''
      if (id) emitChange({ type: 'insert', table, id })
      return inserted
    }

    const rows = legacyLoadRows(tableKeys[table])
    const id = row.id || uuid()
    const withMeta = { ...row, id, created_at: row.created_at || nowIso(), updated_at: row.updated_at || nowIso() }
    rows.unshift(withMeta)
    legacySaveRows(tableKeys[table], rows)
    emitChange({ type: 'insert', table, id })
    return withMeta
  },
  update: (table: keyof typeof tableKeys, id: string, patch: any) => {
    if (hasNativeDb()) {
      const updated = window.tiaoma!.db!.update(table as string, id, patch)
      if (updated) emitChange({ type: 'update', table, id })
      return updated
    }

    const rows = legacyLoadRows(tableKeys[table])
    const idx = rows.findIndex((r: any) => r.id === id)
    if (idx === -1) return null
    rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() }
    legacySaveRows(tableKeys[table], rows)
    emitChange({ type: 'update', table, id })
    return rows[idx]
  },
  delete: (table: keyof typeof tableKeys, id: string) => {
    if (hasNativeDb()) {
      const ok = window.tiaoma!.db!.delete(table as string, id)
      emitChange({ type: 'delete', table, id, soft: SOFT_DELETE_TABLES.has(table) })
      return ok
    }

    const rows = legacyLoadRows(tableKeys[table])
    const idx = rows.findIndex((r: any) => r.id === id)
    if (idx === -1) return false

    // 说明：核心业务表默认软删除，避免误删导致“数据丢失不可恢复”
    if (SOFT_DELETE_TABLES.has(table)) {
      if (!rows[idx]._deleted) {
        rows[idx] = { ...rows[idx], _deleted: true, _deleted_at: nowIso(), updated_at: nowIso() }
        legacySaveRows(tableKeys[table], rows)
        emitChange({ type: 'delete', table, id, soft: true })
        // 说明：为关键关联关系补齐级联软删除，避免出现“孤儿数据”
        cascadeSoftDelete(table, id)
      }
      return true
    }

    // 硬删除（仅用于非核心表）
    const next = rows.filter((r: any) => r.id !== id)
    legacySaveRows(tableKeys[table], next)
    emitChange({ type: 'delete', table, id, soft: false })
    return true
  },

  // 回收站：列出已软删除的数据
  listDeleted: (table: keyof typeof tableKeys) => {
    if (hasNativeDb()) {
      return window.tiaoma!.db!.listDeleted(table as string)
    }
    const rows = legacyLoadRows(tableKeys[table])
    return rows.filter((r: any) => isSoftDeleted(r))
  },

  // 回收站：恢复软删除数据
  restore: (table: keyof typeof tableKeys, id: string) => {
    if (hasNativeDb()) {
      const restored = window.tiaoma!.db!.restore(table as string, id)
      if (restored) emitChange({ type: 'restore', table, id })
      return restored
    }

    const rows = legacyLoadRows(tableKeys[table])
    const idx = rows.findIndex((r: any) => r.id === id)
    if (idx === -1) return null
    rows[idx] = { ...rows[idx], _deleted: false, _deleted_at: null, updated_at: nowIso() }
    legacySaveRows(tableKeys[table], rows)
    emitChange({ type: 'restore', table, id })
    return rows[idx]
  },

  // 回收站：永久删除（物理删除）
  hardDelete: (table: keyof typeof tableKeys, id: string) => {
    if (hasNativeDb()) {
      const ok = window.tiaoma!.db!.hardDelete(table as string, id)
      emitChange({ type: 'hardDelete', table, id })
      return ok
    }

    const rows = legacyLoadRows(tableKeys[table])
    const next = rows.filter((r: any) => r.id !== id)
    legacySaveRows(tableKeys[table], next)
    emitChange({ type: 'hardDelete', table, id })
    return rows.length !== next.length
  }
}

export const query = (rows: any[]) => {
  let data = [...rows]
  const api = {
    order: (field: string, opts: { ascending: boolean }) => { data.sort((a, b) => {
      const av = a[field]; const bv = b[field]
      if (av === bv) return 0
      const r = av > bv ? 1 : -1
      return opts.ascending ? r : -r
    }); return api },
    eq: (field: string, value: any) => { data = data.filter(r => r[field] === value); return api },
    lt: (field: string, value: any) => { data = data.filter(r => (r[field]||'') < value); return api },
    gte: (field: string, value: any) => { data = data.filter(r => (r[field]||'') >= value); return api },
    or: (expr: string) => {
      const parts = expr.split(',')
      data = data.filter(r => parts.some(p => {
        const [left, op, right] = p.split('.')
        const v = (r[left] ?? '').toString().toLowerCase()
        if (op === 'ilike') {
          const needle = right.replace(/%/g, '').toLowerCase()
          return v.includes(needle)
        }
        return false
      }))
      return api
    },
    range: (from: number, to: number) => { data = data.slice(from, to + 1); return api },
    select: (_sel?: any, opts?: any) => ({ data, error: null, count: opts?.count ? rows.length : null })
  }
  return api
}

export const session = {
  get: () => {
    if (hasNativeDb()) {
      return window.tiaoma!.db!.getById('sessions', 'current')
    }
    const s = localStorage.getItem(tableKeys.sessions)
    if (!s) return null
    try { return JSON.parse(s) } catch { return null }
  },
  set: (payload: any) => {
    if (hasNativeDb()) {
      // 说明：统一把会话也落到 SQLite，避免“换 origin/换目录导致重新登录”
      window.tiaoma!.db!.insert('sessions', { id: 'current', ...payload, updated_at: nowIso(), created_at: nowIso() })
      return
    }
    localStorage.setItem(tableKeys.sessions, JSON.stringify(payload))
  },
  clear: () => {
    if (hasNativeDb()) {
      window.tiaoma!.db!.hardDelete('sessions', 'current')
      return
    }
    localStorage.removeItem(tableKeys.sessions)
  }
}

export const seedIfEmpty = () => {
  const units = db.getAll('units') as any[]
  if (units.length === 0) {
    db.setAll('units', [
      { id: uuid(), code: 'PCS', name: '件', symbol: 'pcs', category: 'piece', conversion_factor: 1, created_at: nowIso(), updated_at: nowIso() },
      { id: uuid(), code: 'KG', name: '千克', symbol: 'kg', category: 'weight', conversion_factor: 1, created_at: nowIso(), updated_at: nowIso() }
    ])
  }
  const cats = db.getAll('material_categories') as any[]
  if (cats.length === 0) {
    db.setAll('material_categories', [
      { id: uuid(), code: 'RAW', name: '原材料', created_at: nowIso(), updated_at: nowIso() },
      { id: uuid(), code: 'FG', name: '成品', created_at: nowIso(), updated_at: nowIso() }
    ])
  }
  const sups = db.getAll('suppliers', { includeDeleted: true }) as any[]
  if (sups.length === 0) {
    db.setAll('suppliers', [
      { id: uuid(), code: 'SUP001', name: '默认供应商', status: 'active', created_at: nowIso(), updated_at: nowIso() }
    ])
  }
  const users = db.getAll('users') as any[]
  if (users.length === 0) {
    db.setAll('users', [
      {
        id: uuid(),
        email: 'admin@local',
        username: 'admin',
        full_name: '系统管理员',
        role: 'admin',
        status: 'active',
        department: 'IT部门',
        created_at: nowIso(),
        updated_at: nowIso()
      },
      {
        id: uuid(),
        email: 'manager@local',
        username: 'manager',
        full_name: '物料经理',
        role: 'manager',
        status: 'active',
        department: '物料管理部',
        created_at: nowIso(),
        updated_at: nowIso()
      },
      {
        id: uuid(),
        email: 'operator@local',
        username: 'operator',
        full_name: '仓库操作员',
        role: 'operator',
        status: 'active',
        department: '仓库部',
        created_at: nowIso(),
        updated_at: nowIso()
      }
    ])
  }
  const settings = db.getAll('system_settings') as any[]
  if (settings.length === 0) {
    db.setAll('system_settings', [
      {
        id: uuid(),
        site_name: '条码管理系统',
        company_name: '科技有限公司',
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        date_format: 'YYYY-MM-DD',
        password_min_length: 8,
        session_timeout: 480,
        max_login_attempts: 5,
        two_factor_required: false,
        email_enabled: true,
        low_stock_alerts: true,
        system_maintenance: false,
        user_activities: true,
        auto_backup: true,
        backup_frequency: 'daily',
        data_retention_days: 365,
        maintenance_mode: false,
        created_at: nowIso(),
        updated_at: nowIso()
      }
    ])
  }
}

export const enrich = {
  material: (m: any) => {
    const units = db.getAll('units') as any[]
    const cats = db.getAll('material_categories') as any[]
    // 说明：联表数据默认排除软删除记录，避免“已删除供应商/物料”仍在页面出现
    const suppliers = db.getAll('suppliers') as any[]
    const unit = units.find((u: any) => u.id === m.unit_id)
    const category = cats.find((c: any) => c.id === m.category_id)
    const supplier = suppliers.find((s: any) => s.id === m.supplier_id)
    return {
      ...m,
      // 统一使用 unit_obj 作为联表结果字段，避免与 materials.unit（字符串）混淆
      unit_obj: unit ? { id: unit.id, code: unit.code, name: unit.name, symbol: unit.symbol } : undefined,
      category: category ? { id: category.id, name: category.name, code: category.code } : undefined,
      // 说明：物料绑定默认供应商后，离线模式下也需要补齐 supplier，便于打印页直接展示
      supplier: supplier ? { ...supplier } : undefined,
      // 兼容旧代码：有些地方仍会读取 material.unit（字符串）
      unit: m.unit ?? unit?.symbol ?? unit?.code ?? unit?.name
    }
  },
  // 批次联表：补齐 batch.material 与 batch.supplier，方便离线列表/条码页展示
  batch: (b: any) => {
    // 说明：联表数据默认排除软删除记录
    const materials = db.getAll('materials') as any[]
    const suppliers = db.getAll('suppliers') as any[]
    const material = materials.find((m: any) => m.id === b.material_id)
    // 说明：若批次未保存 supplier_id，则尝试使用物料绑定的默认供应商
    const resolvedSupplierId = b.supplier_id ?? material?.supplier_id
    const supplier = suppliers.find((s: any) => s.id === resolvedSupplierId)
    return {
      ...b,
      material: material ? enrich.material(material) : undefined,
      supplier: supplier ? { ...supplier } : undefined
    }
  },
  // 条码联表：补齐 barcode.material / barcode.batch（如有）
  barcode: (bc: any) => {
    // 说明：联表数据默认排除软删除记录
    const materials = db.getAll('materials') as any[]
    const batches = db.getAll('material_batches') as any[]
    const material = materials.find((m: any) => m.id === bc.material_id)
    const batch = batches.find((b: any) => b.id === bc.batch_id)
    return {
      ...bc,
      material: material ? enrich.material(material) : undefined,
      batch: batch ? enrich.batch(batch) : undefined
    }
  }
}

// 说明：Electron 单机首次启动时，先尝试把旧 localStorage 数据迁移到 SQLite
migrateLegacyToSqliteIfNeeded()

seedIfEmpty()

export default db

// =============================================================================
// 单机备份导出：将本地数据快照导出为 JSON（给 Electron 主进程写文件用）
// =============================================================================

export const exportSnapshot = () => {
  const snapshot: Record<string, any> = {
    version: 1,
    exported_at: nowIso(),
    tables: {},
  }

  // 说明：备份包含软删除数据，便于恢复
  for (const name of Object.keys(tableKeys)) {
    try {
      snapshot.tables[name] = db.getAll(name as keyof typeof tableKeys, { includeDeleted: true })
    } catch {
      snapshot.tables[name] = []
    }
  }

  return snapshot
}

// =============================================================================
// 单机备份触发：提供订阅能力，便于自动备份（数据变更后触发一次）
// =============================================================================

export const onLocalDbChange = (cb: ChangeListener) => {
  changeListeners.push(cb)
  return () => {
    const idx = changeListeners.indexOf(cb)
    if (idx >= 0) changeListeners.splice(idx, 1)
  }
}

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

const nowIso = () => new Date().toISOString()

const load = (key: string) => {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

const save = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value))
}

// 说明：用 typeof 保护 crypto，避免在极少数运行环境下触发 ReferenceError
const uuid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const db = {
  getAll: (table: keyof typeof tableKeys) => load(tableKeys[table]),
  setAll: (table: keyof typeof tableKeys, rows: any[]) => save(tableKeys[table], rows),
  insert: (table: keyof typeof tableKeys, row: any) => {
    const rows = load(tableKeys[table])
    const id = row.id || uuid()
    const withMeta = { ...row, id, created_at: row.created_at || nowIso(), updated_at: row.updated_at || nowIso() }
    rows.unshift(withMeta)
    save(tableKeys[table], rows)
    return withMeta
  },
  update: (table: keyof typeof tableKeys, id: string, patch: any) => {
    const rows = load(tableKeys[table])
    const idx = rows.findIndex((r: any) => r.id === id)
    if (idx === -1) return null
    rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() }
    save(tableKeys[table], rows)
    return rows[idx]
  },
  delete: (table: keyof typeof tableKeys, id: string) => {
    const rows = load(tableKeys[table])
    const next = rows.filter((r: any) => r.id !== id)
    save(tableKeys[table], next)
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
    const s = localStorage.getItem(tableKeys.sessions)
    if (!s) return null
    try { return JSON.parse(s) } catch { return null }
  },
  set: (payload: any) => localStorage.setItem(tableKeys.sessions, JSON.stringify(payload)),
  clear: () => localStorage.removeItem(tableKeys.sessions)
}

export const seedIfEmpty = () => {
  const units = load(tableKeys.units)
  if (units.length === 0) {
    save(tableKeys.units, [
      { id: uuid(), code: 'PCS', name: '件', symbol: 'pcs', category: 'piece', conversion_factor: 1, created_at: nowIso(), updated_at: nowIso() },
      { id: uuid(), code: 'KG', name: '千克', symbol: 'kg', category: 'weight', conversion_factor: 1, created_at: nowIso(), updated_at: nowIso() }
    ])
  }
  const cats = load(tableKeys.material_categories)
  if (cats.length === 0) {
    save(tableKeys.material_categories, [
      { id: uuid(), code: 'RAW', name: '原材料', created_at: nowIso(), updated_at: nowIso() },
      { id: uuid(), code: 'FG', name: '成品', created_at: nowIso(), updated_at: nowIso() }
    ])
  }
  const sups = load(tableKeys.suppliers)
  if (sups.length === 0) {
    save(tableKeys.suppliers, [
      { id: uuid(), code: 'SUP001', name: '默认供应商', status: 'active', created_at: nowIso(), updated_at: nowIso() }
    ])
  }
  const users = load(tableKeys.users)
  if (users.length === 0) {
    save(tableKeys.users, [
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
  const settings = load(tableKeys.system_settings)
  if (settings.length === 0) {
    save(tableKeys.system_settings, [
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
    const units = load(tableKeys.units)
    const cats = load(tableKeys.material_categories)
    const unit = units.find((u: any) => u.id === m.unit_id)
    const category = cats.find((c: any) => c.id === m.category_id)
    return {
      ...m,
      // 统一使用 unit_obj 作为联表结果字段，避免与 materials.unit（字符串）混淆
      unit_obj: unit ? { id: unit.id, code: unit.code, name: unit.name, symbol: unit.symbol } : undefined,
      category: category ? { id: category.id, name: category.name, code: category.code } : undefined,
      // 兼容旧代码：有些地方仍会读取 material.unit（字符串）
      unit: m.unit ?? unit?.symbol ?? unit?.code ?? unit?.name
    }
  },
  // 批次联表：补齐 batch.material 与 batch.supplier，方便离线列表/条码页展示
  batch: (b: any) => {
    const materials = load(tableKeys.materials)
    const suppliers = load(tableKeys.suppliers)
    const material = materials.find((m: any) => m.id === b.material_id)
    const supplier = suppliers.find((s: any) => s.id === b.supplier_id)
    return {
      ...b,
      material: material ? enrich.material(material) : undefined,
      supplier: supplier ? { ...supplier } : undefined
    }
  },
  // 条码联表：补齐 barcode.material / barcode.batch（如有）
  barcode: (bc: any) => {
    const materials = load(tableKeys.materials)
    const batches = load(tableKeys.material_batches)
    const material = materials.find((m: any) => m.id === bc.material_id)
    const batch = batches.find((b: any) => b.id === bc.batch_id)
    return {
      ...bc,
      material: material ? enrich.material(material) : undefined,
      batch: batch ? enrich.batch(batch) : undefined
    }
  }
}

seedIfEmpty()

export default db

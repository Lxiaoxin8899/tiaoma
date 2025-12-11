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
  sessions: KEY_PREFIX + 'sessions'
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

const uuid = () => (crypto && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)

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
      { id: uuid(), email: 'admin@local', username: 'admin', role: 'admin', status: 'active', created_at: nowIso(), updated_at: nowIso() }
    ])
  }
}

export const enrich = {
  material: (m: any) => {
    const units = load(tableKeys.units)
    const cats = load(tableKeys.material_categories)
    const sups = load(tableKeys.suppliers)
    const unit = units.find((u: any) => u.id === m.unit_id)
    const category = cats.find((c: any) => c.id === m.category_id)
    const supplier = sups.find((s: any) => s.id === m.supplier_id)
    return {
      ...m,
      unit: unit ? { id: unit.id, name: unit.name, symbol: unit.symbol } : undefined,
      category: category ? { id: category.id, name: category.name, code: category.code } : undefined,
      supplier: supplier ? { id: supplier.id, name: supplier.name, code: supplier.code } : undefined
    }
  }
}

seedIfEmpty()

export default db


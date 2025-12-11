/* eslint-disable */
import { db, query, session, enrich } from './localdb'

type TableName = 'materials' | 'material_categories' | 'units' | 'suppliers' | 'material_batches' | 'barcodes' | 'users'

const wrap = (rows: any[]) => ({ data: rows, error: null })

class QueryBuilder {
  table: TableName
  rows: any[]
  _insertRows: any[] | null = null
  _updatePatch: any | null = null
  _delete: boolean = false
  _filters: ((r: any) => boolean)[] = []
  _order: { field: string, asc: boolean } | null = null
  _range: [number, number] | null = null
  _count: boolean = false

  constructor(table: TableName) {
    this.table = table
    this.rows = db.getAll(table)
  }

  select(_fields?: any, opts?: any) { this._count = !!opts?.count; return this }

  order(field: string, opts?: { ascending: boolean }) { this._order = { field, asc: opts?.ascending ?? true }; return this }
  eq(field: string, value: any) { this._filters.push(r => r[field] === value); return this }
  lt(field: string, value: any) { this._filters.push(r => (r[field]||'') < value); return this }
  gte(field: string, value: any) { this._filters.push(r => (r[field]||'') >= value); return this }
  or(expr: string) {
    const parts = expr.split(',')
    this._filters.push(r => parts.some(p => { const [left, op, right] = p.split('.'); const v = (r[left] ?? '').toString().toLowerCase(); if (op === 'ilike') { const needle = right.replace(/%/g, '').toLowerCase(); return v.includes(needle) } return false }))
    return this
  }
  range(from: number, to: number) { this._range = [from, to]; return this }

  insert(rows: any[]) { this._insertRows = rows; return { select: () => {
    const inserted = rows.map(r => db.insert(this.table, r))
    return { 
      data: inserted, 
      error: null,
      single: () => ({ data: inserted[0], error: null })
    }
  }, single: () => {
    const inserted = db.insert(this.table, rows[0])
    return { data: inserted, error: null }
  } } }

  update(patch: any) { this._updatePatch = patch; return {
    eq: (field: string, value: any) => {
      const updated = db.update(this.table, value, patch)
      return { 
        select: () => ({ 
          data: [updated], 
          error: null, 
          single: () => ({ data: updated, error: null }) 
        }), 
        single: () => ({ data: updated, error: null }) 
      }
    }
  } }

  delete() { this._delete = true; return {
    eq: (field: string, value: any) => {
      db.delete(this.table, value)
      return { error: null }
    }
  } }

  single() {
    let data = [...this.rows]
    if (this._filters.length) data = data.filter(r => this._filters.every(f => f(r)))
    if (this._order) {
      const { field, asc } = this._order
      data.sort((a, b) => { const av = a[field]; const bv = b[field]; if (av === bv) return 0; const r = av > bv ? 1 : -1; return asc ? r : -r })
    }
    if (this._range) {
      const [from, to] = this._range
      data = data.slice(from, to + 1)
    }
    if (this.table === 'materials') data = data.map(enrich.material)
    return { data: data[0] || null, error: null }
  }

  then(onfulfilled: (value: any) => any, onrejected?: (reason: any) => any) {
    let data = [...this.rows]
    if (this._filters.length) data = data.filter(r => this._filters.every(f => f(r)))
    if (this._order) {
      const { field, asc } = this._order
      data.sort((a, b) => { const av = a[field]; const bv = b[field]; if (av === bv) return 0; const r = av > bv ? 1 : -1; return asc ? r : -r })
    }
    if (this._range) {
      const [from, to] = this._range
      data = data.slice(from, to + 1)
    }
    if (this.table === 'materials') data = data.map(enrich.material)
    const count = this._count ? db.getAll(this.table).length : null
    try { return onfulfilled({ data, error: null, count }) } catch (e) { if (onrejected) return onrejected(e) }
  }
}

class LocalSupabaseAuth {
  async signInWithPassword({ email, password }: { email: string, password: string }) {
    const users = db.getAll('users')
    const u = users.find((x: any) => x.email === email) || users[0]
    const sessionPayload = { user: u, token: 'local', expires_at: Date.now() + 24*3600*1000 }
    session.set(sessionPayload)
    return { data: { user: u, session: sessionPayload }, error: null }
  }
  async signUp({ email, password, options }: any) {
    const user = db.insert('users', { email, username: email.split('@')[0], role: 'viewer', status: 'active', ...options?.data })
    const sessionPayload = { user, token: 'local', expires_at: Date.now() + 24*3600*1000 }
    session.set(sessionPayload)
    return { data: { user, session: sessionPayload }, error: null }
  }
  async signOut() { session.clear(); return { error: null } }
  // async getUser() { const s = session.get(); return { data: { user: s?.user || null } } }
  async getUser() {
    let s = session.get()
    if (!s) {
      const users = db.getAll('users')
      const u = users[0]
      const payload = { user: u, token: 'local', expires_at: Date.now() + 24*3600*1000 }
      session.set(payload)
      s = payload
    }
    return { data: { user: s.user } }
  }
  async getSession() { const s = session.get(); return { data: { session: s } } }
  onAuthStateChange(cb: any) { let s = session.get(); if (!s) { const users = db.getAll('users'); const u = users[0]; const payload = { user: u, token: 'local', expires_at: Date.now() + 24*3600*1000 }; session.set(payload); s = payload } cb('SIGNED_IN', s); return { data: { subscription: { unsubscribe(){} } } } }
  async updateUser({ data }: any) { const s = session.get(); if (!s?.user) return { error: null }; const updated = db.update('users', s.user.id, data); session.set({ ...s, user: updated }); return { data: { user: updated }, error: null } }
}

export class LocalSupabaseClient {
  auth = new LocalSupabaseAuth()
  from(table: TableName) { return new QueryBuilder(table) }
}

export const createLocalClient = () => new LocalSupabaseClient()

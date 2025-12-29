/* eslint-disable */
/**
 * localSupabase：离线模式下用 localStorage 模拟 supabase-js 的常用 API。
 *
 * 设计目标：
 * 1) 保持 stores 的调用方式不变（from().select().eq().range() / insert().update().delete() / single() 等）
 * 2) 支持基础的过滤、排序、分页、count/head
 * 3) 通过 localdb.enrich 在离线时补齐联表字段（例如 batch.material / material.unit_obj）
 *
 * 注意：
 * - 这是“够用”的实现，不追求覆盖 supabase-js 全部能力
 * - 这里用 any 简化 TS 泛型，避免把离线适配变成类型体操
 */

import { db, session, enrich } from './localdb'
import type { User } from '../types/database'

type TableName =
  | 'materials'
  | 'material_categories'
  | 'units'
  | 'suppliers'
  | 'material_batches'
  | 'barcodes'
  | 'users'
  | 'system_settings'
  | 'audit_logs'

interface QueryError {
  message: string
  code?: string
  details?: unknown
}

interface QueryResult<T> {
  data: T | T[] | null
  error: QueryError | null
  count?: number | null
}

interface AuthResult {
  data: {
    user: User | null
    session?: {
      user: User
      token: string
      expires_at: number
    }
  } | null
  error: QueryError | null
}

interface SignUpData {
  email: string
  password: string
  options?: {
    data?: Record<string, any>
  }
}

interface FilterFunction {
  (row: Record<string, any>): boolean
}

interface OrderConfig {
  field: string
  asc: boolean
}

interface RangeConfig {
  from: number
  to: number
}

type MutationType = 'select' | 'insert' | 'update' | 'delete'

const getByPath = (obj: any, path: string): unknown => {
  if (!path.includes('.')) return obj?.[path]
  return path.split('.').reduce((acc, key) => (acc as any)?.[key], obj)
}

const enrichRow = (table: TableName, row: any) => {
  switch (table) {
    case 'materials':
      return enrich.material(row)
    case 'material_batches':
      return enrich.batch(row)
    case 'barcodes':
      return enrich.barcode(row)
    default:
      return row
  }
}

class QueryBuilder<T = any> {
  private table: TableName

  private _filters: FilterFunction[] = []
  private _order: OrderConfig | null = null
  private _range: RangeConfig | null = null
  private _count: boolean = false
  private _head: boolean = false
  private _single: boolean = false

  private _mutation: MutationType = 'select'
  private _insertRows: Record<string, any>[] | null = null
  private _updatePatch: Record<string, any> | null = null
  private _returning: boolean = false // insert/update/delete 后是否返回 data（通过 select() 触发）

  constructor(table: TableName) {
    this.table = table
  }

  /** select() 在 supabase-js 里既用于查询也用于 insert/update 的 returning */
  select(_fields?: any, opts?: { count?: any; head?: boolean }): this {
    this._count = !!opts?.count
    this._head = !!opts?.head
    this._returning = true
    return this
  }

  single(): this {
    this._single = true
    return this
  }

  order(field: string, opts?: { ascending?: boolean }): this {
    this._order = { field, asc: opts?.ascending ?? true }
    return this
  }

  eq(field: string, value: any): this {
    this._filters.push((r) => (getByPath(r, field) as any) === value)
    return this
  }

  lt(field: string, value: any): this {
    this._filters.push((r) => ((getByPath(r, field) ?? '') as any) < value)
    return this
  }

  lte(field: string, value: any): this {
    this._filters.push((r) => ((getByPath(r, field) ?? '') as any) <= value)
    return this
  }

  gte(field: string, value: any): this {
    this._filters.push((r) => ((getByPath(r, field) ?? '') as any) >= value)
    return this
  }

  or(expr: string): this {
    const parts = expr.split(',')
    this._filters.push((row) =>
      parts.some((p) => {
        const segs = p.split('.')
        if (segs.length < 3) return false

        // 允许 fieldPath 含点（例如 material.name.ilike.%xx%）
        const op = segs[segs.length - 2]
        const right = segs[segs.length - 1]
        const fieldPath = segs.slice(0, -2).join('.')

        const v = (getByPath(row, fieldPath) ?? '').toString().toLowerCase()
        if (op === 'ilike') {
          const needle = right.replace(/%/g, '').toLowerCase()
          return v.includes(needle)
        }
        return false
      }),
    )
    return this
  }

  range(from: number, to: number): this {
    this._range = { from, to }
    return this
  }

  insert(rows: Record<string, any>[]): this {
    this._mutation = 'insert'
    this._insertRows = rows
    return this
  }

  update(patch: Record<string, any>): this {
    this._mutation = 'update'
    this._updatePatch = patch
    return this
  }

  delete(): this {
    this._mutation = 'delete'
    return this
  }

  private readEnrichedRows(): any[] {
    const base = db.getAll(this.table) as any[]
    return base.map((r) => enrichRow(this.table, r))
  }

  private applyOrder(rows: any[]): any[] {
    if (!this._order) return rows
    const { field, asc } = this._order
    const sorted = [...rows]
    sorted.sort((a, b) => {
      const av = getByPath(a, field) as any
      const bv = getByPath(b, field) as any
      if (av === bv) return 0
      const r = av > bv ? 1 : -1
      return asc ? r : -r
    })
    return sorted
  }

  private applyRange(rows: any[]): any[] {
    if (!this._range) return rows
    return rows.slice(this._range.from, this._range.to + 1)
  }

  private applyFilters(rows: any[]): any[] {
    if (!this._filters.length) return rows
    return rows.filter((r) => this._filters.every((f) => f(r)))
  }

  private ok<TData>(data: TData, count?: number | null): QueryResult<TData> {
    return { data, error: null, count }
  }

  private fail(message: string, details?: unknown): QueryResult<any> {
    return { data: null, error: { message, details }, count: null }
  }

  private executeSelect(): QueryResult<any> {
    const all = this.readEnrichedRows()
    const filtered = this.applyFilters(all)
    const totalCount = this._count ? filtered.length : null
    const ordered = this.applyOrder(filtered)
    const ranged = this.applyRange(ordered)

    if (this._head) return this.ok(null, totalCount)
    if (this._single) return this.ok(ranged[0] ?? null, totalCount)
    return this.ok(ranged, totalCount)
  }

  private executeInsert(): QueryResult<any> {
    const rows = this._insertRows ?? []
    const inserted = rows.map((r) => db.insert(this.table, r))
    const enriched = inserted.map((r) => enrichRow(this.table, r))

    // 默认不 returning（与 supabase-js 一致），只有调用 select() 才返回 data
    if (!this._returning || this._head) return this.ok(null)
    if (this._single) return this.ok(enriched[0] ?? null)
    return this.ok(enriched)
  }

  private executeUpdate(): QueryResult<any> {
    const patch = this._updatePatch ?? {}

    // 先用“富对象”做过滤（支持 material.name 等离线联表字段）
    const matched = this.applyFilters(this.readEnrichedRows())
    const ids = matched.map((r) => r?.id).filter(Boolean) as string[]

    if (ids.length === 0) {
      // supabase-js 一般不会因为 0 行而报错，这里保持一致：返回 data=null/error=null
      return this.ok(this._returning ? (this._single ? null : []) : null)
    }

    const updated = ids
      .map((id) => db.update(this.table, id, patch))
      .filter(Boolean)
      .map((r) => enrichRow(this.table, r))

    if (!this._returning || this._head) return this.ok(null)
    if (this._single) return this.ok(updated[0] ?? null)
    return this.ok(updated)
  }

  private executeDelete(): QueryResult<any> {
    const matched = this.applyFilters(this.readEnrichedRows())
    const ids = matched.map((r) => r?.id).filter(Boolean) as string[]

    const deleted = matched
    ids.forEach((id) => db.delete(this.table, id))

    if (!this._returning || this._head) return this.ok(null)
    if (this._single) return this.ok(deleted[0] ?? null)
    return this.ok(deleted)
  }

  private execute(): QueryResult<any> {
    switch (this._mutation) {
      case 'insert':
        return this.executeInsert()
      case 'update':
        return this.executeUpdate()
      case 'delete':
        return this.executeDelete()
      case 'select':
      default:
        return this.executeSelect()
    }
  }

  // 让 QueryBuilder 可以被 await：await builder => 调用 then(resolve, reject)
  then(onfulfilled: (value: QueryResult<T>) => any, onrejected?: (reason: any) => any) {
    try {
      const result = this.execute()
      return onfulfilled(result as QueryResult<T>)
    } catch (e) {
      if (onrejected) return onrejected(e)
      throw e
    }
  }
}

class LocalSupabaseAuth {
  // 说明：离线模式的认证能力有限（数据在本地可篡改），这里提供一个“最低限度”的口令校验：
  // - 必须输入密码且匹配固定口令，避免“随便输邮箱就能进/自动进第一个用户”的高风险行为
  // - 该口令仅用于演示/开发环境，生产环境请使用真实 Supabase 认证与 RLS
  private static readonly OFFLINE_DEMO_PASSWORD = 'local'

  async signInWithPassword({ email, password }: { email: string; password: string }): Promise<AuthResult> {
    const users = db.getAll('users') as any[]
    const u = users.find((x: any) => x.email === email)
    if (!u) {
      return { data: null, error: { message: '用户不存在（离线模式仅允许使用本地预置/已创建账号）' } }
    }

    // 说明：离线模式不做“真实密码体系”，但至少要求输入固定口令，降低误用风险
    if (!password || password !== LocalSupabaseAuth.OFFLINE_DEMO_PASSWORD) {
      return { data: null, error: { message: '密码错误（离线模式默认口令为 local）' } }
    }

    const sessionPayload = {
      user: u,
      token: 'local',
      expires_at: Date.now() + 24 * 3600 * 1000,
    }
    session.set(sessionPayload)

    return { data: { user: u, session: sessionPayload }, error: null }
  }

  async signUp({ email, password, options }: SignUpData): Promise<AuthResult> {
    // 说明：离线模式注册同样要求固定口令，避免误把“离线注册”当成真实账号体系
    if (!password || password !== LocalSupabaseAuth.OFFLINE_DEMO_PASSWORD) {
      return { data: null, error: { message: '注册失败：离线模式默认口令为 local' } }
    }

    const user = db.insert('users', {
      email,
      username: email.split('@')[0],
      role: 'viewer',
      status: 'active',
      ...options?.data,
    })

    const sessionPayload = {
      user,
      token: 'local',
      expires_at: Date.now() + 24 * 3600 * 1000,
    }
    session.set(sessionPayload)

    return { data: { user, session: sessionPayload }, error: null }
  }

  async signOut(): Promise<{ error: QueryError | null }> {
    session.clear()
    return { error: null }
  }

  async getUser(): Promise<{ data: { user: User | null }; error: QueryError | null }> {
    const s = session.get()
    // 说明：不再“自动登录第一个用户”，避免离线模式下绕过登录页直接进入系统
    return { data: { user: s?.user ?? null }, error: null }
  }

  async getSession(): Promise<{ data: { session: any } | null; error: QueryError | null }> {
    const s = session.get()
    return { data: { session: s }, error: null }
  }

  onAuthStateChange(cb: (event: string, session: any) => void): { data: { subscription: { unsubscribe(): void } } } {
    // 离线模式简单实现：立即触发一次 SIGNED_IN
    const s = session.get()
    if (s) cb('SIGNED_IN', s)
    return { data: { subscription: { unsubscribe() {} } } }
  }

  async updateUser({ data }: { data: Record<string, any> }): Promise<{ data: { user: User | null }; error: QueryError | null }> {
    const s = session.get()
    if (!s?.user) return { data: { user: null }, error: null }

    const updated = db.update('users', s.user.id, data)
    session.set({ ...s, user: updated })
    return { data: { user: updated }, error: null }
  }
}

export interface LocalSupabaseClient {
  auth: LocalSupabaseAuth
  from(table: TableName): QueryBuilder
  isOnline(): Promise<boolean>
}

export class LocalSupabaseClientImpl implements LocalSupabaseClient {
  auth = new LocalSupabaseAuth()

  from(table: TableName): QueryBuilder {
    return new QueryBuilder(table)
  }

  async isOnline(): Promise<boolean> {
    // 离线模式始终返回 false
    return false
  }
}

export const createLocalClient = (): LocalSupabaseClientImpl => new LocalSupabaseClientImpl()

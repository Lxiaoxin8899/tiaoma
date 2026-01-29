const { app, BrowserWindow, Menu, protocol, net, ipcMain, shell } = require('electron')

const path = require('path')

const fs = require('fs')

const url = require('url')

const Database = require('better-sqlite3')

const crypto = require('crypto')



// =============================================================================

// 数据持久化（单机模式）关键设置

//

// 背景：本项目当前“数据库”在渲染进程侧使用 localStorage（见 src/lib/localdb.ts）。

// Electron/Chromium 的 localStorage 数据落在 app.getPath('userData') 目录下。

//

// 用户反馈“过一段时间数据没了”，在桌面软件里最常见的原因是：

// 1) 升级/换包后应用名/协议变更导致 userData 路径或存储分区变化，看起来像“丢数据”

// 2) 安装版/便携版或不同启动方式（dev/preview/packaged）使用了不同的存储位置

//

// 这里做两件事：

// - 固定 userData 目录为稳定路径（与 productName/显示名变化解耦）

// - 固定渲染进程 storage partition（避免不同窗口/不同加载方式产生多套存储）

// 同时做一次“旧 userData -> 新 userData”的迁移兜底（尽量把历史数据拷贝过来）。

// =============================================================================



// 说明：捕获 Electron 默认计算的 userData（可能随版本/产品名变化）

const ORIGINAL_USER_DATA = app.getPath('userData')



// 说明：为 Windows 设置稳定的 AppUserModelId（任务栏分组/通知等；同时让路径更可预期）

app.setAppUserModelId('com.tiaoma.app')



// 说明：固定 userData 到一个稳定目录（避免 productName/显示名变化导致数据“换目录”）

const FIXED_USER_DATA = path.join(app.getPath('appData'), 'tiaoma')

if (ORIGINAL_USER_DATA !== FIXED_USER_DATA) {

  app.setPath('userData', FIXED_USER_DATA)



  // 尝试迁移：如果新目录还没有本地存储文件，而旧目录存在，则拷贝关键存储目录

  try {

    // 说明：优先从“本次启动 Electron 默认计算出来的 userData”迁移

    let src = ORIGINAL_USER_DATA

    const dst = FIXED_USER_DATA



    const ensureDir = (p) => {

      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })

    }



    // 仅迁移与 localStorage/IndexedDB 等持久化相关的目录，避免引入缓存/临时文件

    const CANDIDATES = [

      'Local Storage',

      'Session Storage',

      'IndexedDB',

      'WebStorage',

      'Cookies',

      'Preferences',

    ]



    // 说明：若 src 目录本身不存在/没有存储目录，则在 appData 下“猜测”旧目录位置：

    // - 有些历史包可能因 productName/编码变化导致 userData 目录名变化

    // - 这里按“包含 Local Storage 且最近修改”的目录做兜底（只在首次迁移阶段使用）

    const hasAnyCandidate = (baseDir) =>

      CANDIDATES.some((name) => fs.existsSync(path.join(baseDir, name)))



    if (!fs.existsSync(src) || !hasAnyCandidate(src)) {

      try {

        const appDataDir = app.getPath('appData')

        const dirs = fs.readdirSync(appDataDir, { withFileTypes: true })

        const maybeOldDirs = dirs

          .filter((d) => d.isDirectory())

          .map((d) => path.join(appDataDir, d.name))

          .filter((p) => p !== dst)

          .filter((p) => hasAnyCandidate(p))

          .map((p) => {

            const localStorageDir = path.join(p, 'Local Storage')

            let mtime = 0

            try {

              mtime = fs.statSync(localStorageDir).mtimeMs

            } catch {}

            return { p, mtime }

          })

          .sort((a, b) => b.mtime - a.mtime)



        if (maybeOldDirs.length > 0) {

          src = maybeOldDirs[0].p

        }

      } catch (e) {

        console.error('[userData迁移-扫描旧目录失败]', e)

      }

    }



    ensureDir(dst)

    for (const name of CANDIDATES) {

      const from = path.join(src, name)

      const to = path.join(dst, name)

      if (!fs.existsSync(from)) continue

      if (fs.existsSync(to)) continue



      // 递归拷贝：尽量把旧数据迁移到新目录

      fs.cpSync(from, to, { recursive: true, errorOnExist: false })

    }

  } catch (e) {

    // 说明：迁移失败不阻塞启动，但会在主进程日志中留下线索，便于排查“数据去哪了”

    console.error('[userData迁移失败]', e)

  }

}



// 禁用硬件加速（解决某些 Windows 显示问题）

// app.disableHardwareAcceleration()



// 说明：主进程兜底错误捕获，避免出现“闪退无提示”

process.on('uncaughtException', (err) => {

  console.error('[主进程未捕获异常]', err)

})

process.on('unhandledRejection', (reason) => {

  console.error('[主进程未处理 Promise Rejection]', reason)

})



let mainWindow



const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

const DIST_INDEX_PATH = path.join(__dirname, '../dist/index.html')

const DIST_DIR_PATH = path.dirname(DIST_INDEX_PATH)



// =============================================================================

// 单机备份：由渲染进程导出快照，主进程写入文件

// =============================================================================



// =============================================================================

// 单机数据库（SQLite）：主进程持久化存储

//

// 说明：

// - 渲染进程通过 preload 暴露的同步 IPC 调用数据库（兼容现有 localSupabase 查询链）

// - 数据库文件放在固定 userData 目录下（已在上方做了固定与迁移）

// =============================================================================



const SQLITE_FILE = path.join(app.getPath('userData'), 'tiaoma.sqlite3')



const SOFT_DELETE_TABLES = new Set(['materials', 'suppliers', 'material_batches', 'barcodes'])



let sqliteDb = null

const getDb = () => {

  if (sqliteDb) return sqliteDb

  const db = new Database(SQLITE_FILE)

  // 说明：WAL 能提升写入稳定性与性能（单机场景更适合）

  db.pragma('journal_mode = WAL')

  db.pragma('synchronous = NORMAL')



  db.exec(`

    CREATE TABLE IF NOT EXISTS meta (

      key TEXT PRIMARY KEY,

      value TEXT

    );

    CREATE TABLE IF NOT EXISTS records (

      table_name TEXT NOT NULL,

      id TEXT NOT NULL,

      json TEXT NOT NULL,

      deleted INTEGER NOT NULL DEFAULT 0,

      deleted_at TEXT,

      created_at TEXT,

      updated_at TEXT,

      -- 说明：关键外键字段抽取（用于级联软删除与查询优化，避免对 json 做模糊匹配）

      material_id TEXT,

      batch_id TEXT,

      supplier_id TEXT,

      PRIMARY KEY (table_name, id)

    );

    CREATE INDEX IF NOT EXISTS idx_records_table_deleted ON records(table_name, deleted);

    CREATE INDEX IF NOT EXISTS idx_records_table_updated ON records(table_name, updated_at);

    CREATE INDEX IF NOT EXISTS idx_records_batches_material ON records(table_name, material_id);

    CREATE INDEX IF NOT EXISTS idx_records_barcodes_batch ON records(table_name, batch_id);

    CREATE INDEX IF NOT EXISTS idx_records_materials_supplier ON records(table_name, supplier_id);

  `)



  sqliteDb = db

  return db

}



const nowIso = () => new Date().toISOString()



const safeParseJson = (s) => {

  try {

    return JSON.parse(s)

  } catch {

    return null

  }

}



const toStoredRow = (table, row) => {

  const id = row?.id || row?.ID || row?.Id

  const createdAt = row?.created_at || row?.createdAt || nowIso()

  const updatedAt = row?.updated_at || row?.updatedAt || nowIso()

  const deleted = row?._deleted ? 1 : 0

  const deletedAt = row?._deleted_at || null



  // 说明：抽取关键“外键”字段，便于级联/筛选（单机模式不依赖 Supabase 外键）

  let materialId = null

  let batchId = null

  let supplierId = null

  if (table === 'materials') {

    supplierId = row?.supplier_id ?? null

  }

  if (table === 'material_batches') {

    materialId = row?.material_id ?? null

    supplierId = row?.supplier_id ?? null

  }

  if (table === 'barcodes') {

    materialId = row?.material_id ?? null

    batchId = row?.batch_id ?? null

  }



  return {

    table_name: table,

    id,

    json: JSON.stringify(row),

    deleted,

    deleted_at: deletedAt,

    created_at: createdAt,

    updated_at: updatedAt,

    material_id: materialId,

    batch_id: batchId,

    supplier_id: supplierId,

  }

}



const fromStoredRow = (stored) => {

  const obj = safeParseJson(stored?.json)

  if (!obj || typeof obj !== 'object') return null

  // 说明：统一注入软删除标记字段，兼容旧逻辑

  obj._deleted = !!stored.deleted

  obj._deleted_at = stored.deleted_at || null

  return obj

}



const getById = (table, id) => {

  const db = getDb()

  const row = db.prepare('SELECT json, deleted, deleted_at FROM records WHERE table_name=? AND id=?').get(table, id)

  if (!row) return null

  return fromStoredRow(row)

}



const listAll = (table, includeDeleted) => {

  const db = getDb()

  const rows = db

    .prepare(

      includeDeleted

        ? 'SELECT json, deleted, deleted_at, updated_at FROM records WHERE table_name=? ORDER BY updated_at DESC'

        : 'SELECT json, deleted, deleted_at, updated_at FROM records WHERE table_name=? AND deleted=0 ORDER BY updated_at DESC',

    )

    .all(table)

  return rows.map(fromStoredRow).filter(Boolean)

}



const upsert = (table, row) => {

  const db = getDb()

  const stored = toStoredRow(table, row)

  if (!stored.id) return null



  db.prepare(

    `

      INSERT INTO records (table_name, id, json, deleted, deleted_at, created_at, updated_at, material_id, batch_id, supplier_id)

      VALUES (@table_name, @id, @json, @deleted, @deleted_at, @created_at, @updated_at, @material_id, @batch_id, @supplier_id)

      ON CONFLICT(table_name, id) DO UPDATE SET

        json=excluded.json,

        deleted=excluded.deleted,

        deleted_at=excluded.deleted_at,

        updated_at=excluded.updated_at,

        material_id=excluded.material_id,

        batch_id=excluded.batch_id,

        supplier_id=excluded.supplier_id

    `,

  ).run(stored)



  return getById(table, stored.id)

}



const softDelete = (db, table, id) => {

  db.prepare(

    'UPDATE records SET deleted=1, deleted_at=?, updated_at=? WHERE table_name=? AND id=?',

  ).run(nowIso(), nowIso(), table, id)

}



const hardDelete = (db, table, id) => {

  db.prepare('DELETE FROM records WHERE table_name=? AND id=?').run(table, id)

}



const cascadeDelete = (db, table, id) => {

  // 说明：保持关键关联一致性（避免出现“孤儿批次/条码”导致像丢数据）

  if (table === 'materials') {

    if (SOFT_DELETE_TABLES.has('material_batches')) {

      db.prepare(

        'UPDATE records SET deleted=1, deleted_at=?, updated_at=? WHERE table_name=? AND deleted=0 AND material_id=?',

      ).run(nowIso(), nowIso(), 'material_batches', id)

    }

    if (SOFT_DELETE_TABLES.has('barcodes')) {

      db.prepare(

        'UPDATE records SET deleted=1, deleted_at=?, updated_at=? WHERE table_name=? AND deleted=0 AND material_id=?',

      ).run(nowIso(), nowIso(), 'barcodes', id)

    }

  }

  if (table === 'material_batches') {

    if (SOFT_DELETE_TABLES.has('barcodes')) {

      db.prepare(

        'UPDATE records SET deleted=1, deleted_at=?, updated_at=? WHERE table_name=? AND deleted=0 AND batch_id=?',

      ).run(nowIso(), nowIso(), 'barcodes', id)

    }

  }

}



// 同步 IPC：给渲染进程提供同步数据库 API

ipcMain.on('tiaoma:db:getAll', (event, args) => {

  try {

    event.returnValue = listAll(args.table, !!args?.opts?.includeDeleted)

  } catch (e) {

    console.error('[db:getAll失败]', e)

    event.returnValue = []

  }

})



ipcMain.on('tiaoma:db:getById', (event, args) => {

  try {

    event.returnValue = getById(args.table, args.id)

  } catch (e) {

    console.error('[db:getById失败]', e)

    event.returnValue = null

  }

})



ipcMain.on('tiaoma:db:insert', (event, args) => {

  try {

    const row = args.row || {}

    if (!row.id) {

      row.id = crypto.randomUUID()

    }

    row.created_at = row.created_at || nowIso()

    row.updated_at = row.updated_at || nowIso()

    event.returnValue = upsert(args.table, row)

  } catch (e) {

    console.error('[db:insert失败]', e)

    event.returnValue = null

  }

})



ipcMain.on('tiaoma:db:update', (event, args) => {

  try {

    const current = getById(args.table, args.id)

    if (!current) {

      event.returnValue = null

      return

    }

    const next = { ...current, ...(args.patch || {}), updated_at: nowIso() }

    event.returnValue = upsert(args.table, next)

  } catch (e) {

    console.error('[db:update失败]', e)

    event.returnValue = null

  }

})



ipcMain.on('tiaoma:db:delete', (event, args) => {

  try {

    const table = args.table

    const id = args.id

    const db = getDb()

    if (SOFT_DELETE_TABLES.has(table)) {

      // 说明：事务保证“主记录删除 + 级联删除”要么全部成功，要么全部失败，避免半删导致数据异常

      const tx = db.transaction(() => {

        softDelete(db, table, id)

        cascadeDelete(db, table, id)

      })

      tx()

      event.returnValue = true

      return

    }

    hardDelete(db, table, id)

    event.returnValue = true

  } catch (e) {

    console.error('[db:delete失败]', e)

    event.returnValue = false

  }

})



ipcMain.on('tiaoma:db:listDeleted', (event, args) => {

  try {

    const db = getDb()

    const rows = db

      .prepare('SELECT json, deleted, deleted_at, updated_at FROM records WHERE table_name=? AND deleted=1 ORDER BY updated_at DESC')

      .all(args.table)

    event.returnValue = rows.map(fromStoredRow).filter(Boolean)

  } catch (e) {

    console.error('[db:listDeleted失败]', e)

    event.returnValue = []

  }

})



ipcMain.on('tiaoma:db:restore', (event, args) => {

  try {

    const db = getDb()

    db.prepare('UPDATE records SET deleted=0, deleted_at=NULL, updated_at=? WHERE table_name=? AND id=?')

      .run(nowIso(), args.table, args.id)

    event.returnValue = getById(args.table, args.id)

  } catch (e) {

    console.error('[db:restore失败]', e)

    event.returnValue = null

  }

})



ipcMain.on('tiaoma:db:hardDelete', (event, args) => {

  try {

    hardDelete(getDb(), args.table, args.id)

    event.returnValue = true

  } catch (e) {

    console.error('[db:hardDelete失败]', e)

    event.returnValue = false

  }

})



ipcMain.on('tiaoma:db:getMeta', (event, args) => {

  try {

    const db = getDb()

    const row = db.prepare('SELECT value FROM meta WHERE key=?').get(args.key)

    event.returnValue = row?.value ?? null

  } catch (e) {

    console.error('[db:getMeta失败]', e)

    event.returnValue = null

  }

})



ipcMain.on('tiaoma:db:setMeta', (event, args) => {

  try {

    const db = getDb()

    db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')

      .run(args.key, String(args.value ?? ''))

    event.returnValue = true

  } catch (e) {

    console.error('[db:setMeta失败]', e)

    event.returnValue = false

  }

})



ipcMain.on('tiaoma:db:importSnapshot', (event, args) => {

  try {

    const snapshot = args.snapshot

    const tables = snapshot?.tables || {}

    const db = getDb()

    const tx = db.transaction(() => {

      for (const [table, rows] of Object.entries(tables)) {

        if (!Array.isArray(rows)) continue

        db.prepare('DELETE FROM records WHERE table_name=?').run(table)

        for (const r of rows) {

          if (!r?.id) continue

          upsert(table, r)

        }

      }

    })

    tx()

    event.returnValue = true

  } catch (e) {

    console.error('[db:importSnapshot失败]', e)

    event.returnValue = false

  }

})



ipcMain.on('tiaoma:db:replaceAll', (event, args) => {

  try {

    const table = args.table

    const rows = Array.isArray(args.rows) ? args.rows : []

    const db = getDb()

    const tx = db.transaction(() => {

      db.prepare('DELETE FROM records WHERE table_name=?').run(table)

      for (const r of rows) {

        if (!r?.id) continue

        upsert(table, r)

      }

    })

    tx()

    event.returnValue = true

  } catch (e) {

    console.error('[db:replaceAll失败]', e)

    event.returnValue = false

  }

})



const getBackupDir = () => {

  const dir = path.join(app.getPath('userData'), 'backups')

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  return dir

}



const pruneOldBackups = (dir, retentionDays) => {

  try {

    const days = Number(retentionDays || 30)

    if (!Number.isFinite(days) || days <= 0) return

    const cutoff = Date.now() - days * 24 * 3600 * 1000

    const files = fs.readdirSync(dir).filter((n) => n.endsWith('.json'))

    for (const name of files) {

      const full = path.join(dir, name)

      let stat

      try {

        stat = fs.statSync(full)

      } catch {

        continue

      }

      if (stat.mtimeMs < cutoff) {

        try {

          fs.unlinkSync(full)

        } catch {}

      }

    }

  } catch (e) {

    console.error('[备份清理失败]', e)

  }

}



ipcMain.handle('tiaoma:backup:save', async (_event, args) => {

  try {

    const json = typeof args?.json === 'string' ? args.json : ''

    const retentionDays = args?.retentionDays

    if (!json) return { ok: false, error: '空备份内容' }



    // 说明：简单限流，避免异常情况下写入超大文件占满磁盘

    const maxBytes = 50 * 1024 * 1024

    if (Buffer.byteLength(json, 'utf8') > maxBytes) {

      return { ok: false, error: '备份内容过大，已拒绝写入（>50MB）' }

    }



    const dir = getBackupDir()

    const now = new Date()

    const pad = (n) => String(n).padStart(2, '0')

    const ts =

      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +

      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

    const fileName = `tiaoma-backup-${ts}.json`

    const filePath = path.join(dir, fileName)



    fs.writeFileSync(filePath, json, 'utf8')

    pruneOldBackups(dir, retentionDays)

    return { ok: true, path: filePath }

  } catch (e) {

    console.error('[备份写入失败]', e)

    return { ok: false, error: '备份写入失败' }

  }

})



ipcMain.handle('tiaoma:backup:openFolder', async () => {

  try {

    const dir = getBackupDir()

    // 说明：openPath 会返回错误字符串；这里统一返回 ok

    const r = await shell.openPath(dir)

    return { ok: !r, error: r || null, path: dir }

  } catch (e) {

    console.error('[打开备份目录失败]', e)

    return { ok: false, error: '打开备份目录失败' }

  }

})



// 列出所有备份文件
ipcMain.handle('tiaoma:backup:list', async () => {
  try {
    const dir = getBackupDir()
    const files = fs.readdirSync(dir)
      .filter((name) => name.endsWith('.json') && name.startsWith('tiaoma-backup-'))
      .map((name) => {
        const filePath = path.join(dir, name)
        const stat = fs.statSync(filePath)
        return {
          name,
          path: filePath,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
    return { ok: true, files }
  } catch (e) {
    console.error('[列出备份文件失败]', e)
    return { ok: false, error: '列出备份文件失败', files: [] }
  }
})

// 读取备份文件内容
ipcMain.handle('tiaoma:backup:read', async (_event, args) => {
  try {
    const filePath = args?.filePath
    if (!filePath) return { ok: false, error: '未指定文件路径' }

    // 安全检查：确保文件在备份目录内
    const dir = getBackupDir()
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(dir)) {
      return { ok: false, error: '非法文件路径' }
    }

    if (!fs.existsSync(resolvedPath)) {
      return { ok: false, error: '文件不存在' }
    }

    const content = fs.readFileSync(resolvedPath, 'utf8')
    return { ok: true, content }
  } catch (e) {
    console.error('[读取备份文件失败]', e)
    return { ok: false, error: '读取备份文件失败' }
  }
})

// 删除备份文件
ipcMain.handle('tiaoma:backup:delete', async (_event, args) => {
  try {
    const filePath = args?.filePath
    if (!filePath) return { ok: false, error: '未指定文件路径' }

    // 安全检查：确保文件在备份目录内
    const dir = getBackupDir()
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(dir)) {
      return { ok: false, error: '非法文件路径' }
    }

    if (!fs.existsSync(resolvedPath)) {
      return { ok: false, error: '文件不存在' }
    }

    fs.unlinkSync(resolvedPath)
    return { ok: true }
  } catch (e) {
    console.error('[删除备份文件失败]', e)
    return { ok: false, error: '删除备份文件失败' }
  }
})



// 自定义协议名称（用于解决 file:// 协议下 ES modules 的 CORS 问题）

const PROTOCOL_SCHEME = 'app'



// MIME 类型映射

const MIME_TYPES = {

  '.html': 'text/html',

  '.js': 'text/javascript',

  '.mjs': 'text/javascript',

  '.css': 'text/css',

  '.json': 'application/json',

  '.png': 'image/png',

  '.jpg': 'image/jpeg',

  '.jpeg': 'image/jpeg',

  '.gif': 'image/gif',

  '.svg': 'image/svg+xml',

  '.ico': 'image/x-icon',

  '.woff': 'font/woff',

  '.woff2': 'font/woff2',

  '.ttf': 'font/ttf',

  '.eot': 'application/vnd.ms-fontobject'

}



// 注册自定义协议（必须在 app ready 之前调用）

protocol.registerSchemesAsPrivileged([

  {

    scheme: PROTOCOL_SCHEME,

    privileges: {

      standard: true,

      secure: true,

      supportFetchAPI: true,

      corsEnabled: true,

      stream: true

    }

  }

])



function fileUrlToPath(url) {

  try {

    const parsed = new URL(url)

    if (parsed.protocol !== 'file:') return null



    // 说明：Windows 下 file URL 的 pathname 形如 /C:/xxx，需要去掉开头的 / 才能转成磁盘路径。

    const pathname = decodeURIComponent(parsed.pathname).replace(/^\/([A-Za-z]:)/, '$1')

    return path.normalize(pathname)

  } catch {

    return null

  }

}



function isAllowedNavigation(targetUrl) {

  // 说明：打印窗口使用 about:blank / blob:，这里放行。

  if (targetUrl.startsWith('about:blank')) return true

  if (targetUrl.startsWith('blob:')) return true



  // 允许自定义协议

  if (targetUrl.startsWith(`${PROTOCOL_SCHEME}://`)) return true



  // 开发环境允许访问本地 dev server

  if (!app.isPackaged && targetUrl.startsWith(DEV_SERVER_URL)) return true



  const targetPath = fileUrlToPath(targetUrl)

  if (!targetPath) return false



  // 说明：生产环境只允许在 dist 目录内导航，避免被带到任意本地 file:// 地址。

  const distDir = path.resolve(DIST_DIR_PATH)

  const resolvedTarget = path.resolve(targetPath)

  return resolvedTarget === distDir || resolvedTarget.startsWith(distDir + path.sep)

}



// 设置自定义协议处理器

function setupProtocolHandler() {

  protocol.handle(PROTOCOL_SCHEME, (request) => {

    try {

      const requestUrl = new URL(request.url)

      let pathname = decodeURIComponent(requestUrl.pathname)



      // 处理根路径

      if (pathname === '/' || pathname === '') {

        pathname = '/index.html'

      }



      // 移除开头的斜杠以构建正确的文件路径

      const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname



      // 构建文件路径

      const filePath = path.join(DIST_DIR_PATH, relativePath)



      // 安全检查：确保路径在 dist 目录内

      const resolvedPath = path.resolve(filePath)

      const resolvedDist = path.resolve(DIST_DIR_PATH)

      // 说明：不能直接用 startsWith(resolvedDist)，否则像 "C:\\distmalicious" 也会误判为在 "C:\\dist" 下。

      // 这里使用 “相等 或 以 dist\\ 为前缀” 的判断，避免路径穿越与前缀碰撞。

      if (resolvedPath !== resolvedDist && !resolvedPath.startsWith(resolvedDist + path.sep)) {

        return new Response('Forbidden', { status: 403 })

      }



      const readFileAsResponse = (filePath) => {

        const ext = path.extname(filePath).toLowerCase()

        const type = MIME_TYPES[ext] || 'application/octet-stream'

        const data = fs.readFileSync(filePath)

        return new Response(data, { status: 200, headers: { 'Content-Type': type } })

      }



      // 检查文件是否存在

      if (!fs.existsSync(resolvedPath)) {

        // 对于 SPA，未找到的路径返回 index.html

        const indexPath = path.join(DIST_DIR_PATH, 'index.html')

        if (fs.existsSync(indexPath)) {

          return readFileAsResponse(indexPath)

        }

        return new Response('Not Found', { status: 404 })

      }



      // 说明：直接读取文件并返回 Response，避免某些环境下 net.fetch(file://) 失败导致白屏

      return readFileAsResponse(resolvedPath)

    } catch (error) {

      console.error('[Protocol Handler Error]', error)

      return new Response('Internal Server Error', { status: 500 })

    }

  })

}



function createWindow() {

  // 创建浏览器窗口，模拟网页尺寸

  mainWindow = new BrowserWindow({

    width: 1440,

    height: 900,

    minWidth: 1024,

    minHeight: 768,

    title: '物料与条码管理系统',

    webPreferences: {

      nodeIntegration: false,

      contextIsolation: true,

      // 说明：预加载脚本仅暴露“备份/打开目录”等最小能力，避免渲染进程直接接触 Node API

      preload: path.join(__dirname, 'preload.cjs'),

      // 说明：固定 storage partition，避免不同窗口/不同加载方式产生多套本地存储

      // - persist:* 表示持久分区，会落到 userData 下（上面已固定 userData 目录）

      partition: 'persist:tiaoma',

      // 说明：为避免打包后白屏，临时关闭 sandbox，确保 preload 可用（需要时可再开启）

      sandbox: false,

      webSecurity: true,

      // 生产环境禁用 DevTools，减少被调试/注入的风险

      devTools: !app.isPackaged,

      // 显式禁用 <webview>（大多数业务不需要，且是常见攻击面）

      webviewTag: false

    },

    // 窗口样式

    frame: true,

    autoHideMenuBar: true, // 自动隐藏菜单栏，按 Alt 可显示

    backgroundColor: '#f3f4f6'

  })



  // 加载渲染进程页面：优先 dev server，失败则回退到 dist（便于本地预览 build 后效果）

  const loadRenderer = async () => {

    if (app.isPackaged) {

      // 生产环境使用自定义协议加载（解决 ES modules CORS 问题）

      await mainWindow.loadFile(DIST_INDEX_PATH)

      return

    }



    try {

      await mainWindow.loadURL(DEV_SERVER_URL)

      // 打开开发者工具（仅开发环境）

      mainWindow.webContents.openDevTools()

    } catch {

      // 说明：用于 `pnpm electron:preview`（未启动 Vite dev server）时也能直接打开 dist。

      // 非打包模式也使用自定义协议

      await mainWindow.loadFile(DIST_INDEX_PATH)

    }

  }

  loadRenderer()



  // 窗口关闭时清理引用

  mainWindow.on('closed', () => {

    mainWindow = null

  })



  // 处理新窗口打开请求（如打印）

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {

    // 允许打印窗口

    if (url === 'about:blank' || url.startsWith('blob:')) {

      return {

        action: 'allow',

        overrideBrowserWindowOptions: {

          width: 800,

          height: 600,

          title: '打印预览',

          autoHideMenuBar: true,

          webPreferences: {

            nodeIntegration: false,

            contextIsolation: true,

            preload: path.join(__dirname, 'preload.cjs'),

            // 说明：打印窗口也使用同一持久分区，保证读取到同一份本地数据

            partition: 'persist:tiaoma',

            // 说明：打印窗口同样关闭 sandbox，避免预加载桥接失效导致白屏

            sandbox: false,

            webSecurity: true,

            // 生产环境禁用 DevTools，减少被调试/注入的风险

            devTools: !app.isPackaged,

            webviewTag: false

          }

        }

      }

    }

    return { action: 'deny' }

  })

}



// 创建简洁的应用菜单

function createMenu() {

  const isProd = app.isPackaged



  const template = [

    {

      label: '文件',

      submenu: [

        {

          label: '刷新',

          accelerator: 'CmdOrCtrl+R',

          click: () => {

            if (mainWindow) mainWindow.reload()

          }

        },

        { type: 'separator' },

        {

          label: '退出',

          accelerator: 'CmdOrCtrl+Q',

          click: () => app.quit()

        }

      ]

    },

    {

      label: '视图',

      submenu: [

        {

          label: '全屏',

          accelerator: 'F11',

          click: () => {

            if (mainWindow) {

              mainWindow.setFullScreen(!mainWindow.isFullScreen())

            }

          }

        },

        // 生产环境默认隐藏开发者工具入口

        ...(!isProd ? [{

          label: '开发者工具',

          accelerator: 'F12',

          click: () => {

            if (mainWindow) mainWindow.webContents.toggleDevTools()

          }

        }] : [])

      ]

    },

    {

      label: '帮助',

      submenu: [

        {

          label: '关于',

          click: () => {

            const { dialog } = require('electron')

            dialog.showMessageBox(mainWindow, {

              type: 'info',

              title: '关于',

              message: '物料与条码管理系统',

              detail: `版本: ${app.getVersion()}\n基于 Electron + React + Vite 构建`

            })

          }

        }

      ]

    }

  ]



  const menu = Menu.buildFromTemplate(template)

  Menu.setApplicationMenu(menu)

}



// 额外的 WebContents 安全加固：禁止 webview 注入

app.on('web-contents-created', (_event, contents) => {

  // 说明：禁止 <webview>，避免引入额外攻击面。

  contents.on('will-attach-webview', (event) => {

    event.preventDefault()

  })



  // 说明：默认禁止随意打开新窗口；主窗口会显式放行打印窗口。

  contents.setWindowOpenHandler(() => ({ action: 'deny' }))



  // 说明：禁止导航到非白名单地址（防止被恶意链接带离应用页面，或跳转到任意 file://）。

  contents.on('will-navigate', (event, url) => {

    if (!isAllowedNavigation(url)) {

      event.preventDefault()

    }

  })

})



// Electron 初始化完成后创建窗口

app.whenReady().then(() => {

  // 设置自定义协议处理器（必须在创建窗口之前）

  setupProtocolHandler()



  createMenu()

  createWindow()



  // macOS 点击 dock 图标时重新创建窗口

  app.on('activate', () => {

    if (BrowserWindow.getAllWindows().length === 0) {

      createWindow()

    }

  })

})



// 所有窗口关闭时退出应用（Windows/Linux）

app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') {

    app.quit()

  }

})



// 处理证书错误（开发环境）

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {

  if (!app.isPackaged) {

    event.preventDefault()

    callback(true)

  } else {

    callback(false)

  }

})


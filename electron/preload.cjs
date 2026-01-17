const { contextBridge, ipcRenderer } = require('electron')

// =============================================================================
// 预加载桥接（单机模式）
//
// 目标：
// - 渲染进程保持 nodeIntegration=false / contextIsolation=true / sandbox=true
// - 仅暴露“备份写入/打开备份目录”等最小能力
// =============================================================================

contextBridge.exposeInMainWorld('tiaoma', {
  // 单机数据库（SQLite）：通过同步 IPC 暴露同步 API（用于兼容现有 localSupabase 查询链）
  db: {
    getAll: (table, opts) => ipcRenderer.sendSync('tiaoma:db:getAll', { table, opts }),
    getById: (table, id) => ipcRenderer.sendSync('tiaoma:db:getById', { table, id }),
    insert: (table, row) => ipcRenderer.sendSync('tiaoma:db:insert', { table, row }),
    update: (table, id, patch) => ipcRenderer.sendSync('tiaoma:db:update', { table, id, patch }),
    delete: (table, id) => ipcRenderer.sendSync('tiaoma:db:delete', { table, id }),
    listDeleted: (table) => ipcRenderer.sendSync('tiaoma:db:listDeleted', { table }),
    restore: (table, id) => ipcRenderer.sendSync('tiaoma:db:restore', { table, id }),
    hardDelete: (table, id) => ipcRenderer.sendSync('tiaoma:db:hardDelete', { table, id }),
    getMeta: (key) => ipcRenderer.sendSync('tiaoma:db:getMeta', { key }),
    setMeta: (key, value) => ipcRenderer.sendSync('tiaoma:db:setMeta', { key, value }),
    importSnapshot: (snapshot) => ipcRenderer.sendSync('tiaoma:db:importSnapshot', { snapshot }),
    replaceAll: (table, rows) => ipcRenderer.sendSync('tiaoma:db:replaceAll', { table, rows }),
  },
  backup: {
    // 保存备份快照（JSON 字符串）
    save: async (json, opts) => {
      return await ipcRenderer.invoke('tiaoma:backup:save', {
        json,
        retentionDays: opts?.retentionDays,
      })
    },

    // 打开备份目录
    openFolder: async () => {
      return await ipcRenderer.invoke('tiaoma:backup:openFolder')
    },
  },
})

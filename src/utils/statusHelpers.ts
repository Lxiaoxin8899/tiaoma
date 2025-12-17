export const getStatusBadgeColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    // Material statuses
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    discontinued: 'bg-red-100 text-red-800',
    
    // Batch statuses
    pending: 'bg-yellow-100 text-yellow-800',
    available: 'bg-green-100 text-green-800',
    locked: 'bg-orange-100 text-orange-800',
    expired: 'bg-red-100 text-red-800',
    disposed: 'bg-gray-100 text-gray-800',
    
    // General statuses
    enabled: 'bg-green-100 text-green-800',
    disabled: 'bg-gray-100 text-gray-800',
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-blue-100 text-blue-800',
    
    // User roles
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    operator: 'bg-green-100 text-green-800',
    viewer: 'bg-gray-100 text-gray-800'
  }
  
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

export const getStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    // Material statuses
    active: '活跃',
    inactive: '停用',
    discontinued: '停产',
    
    // Batch statuses
    pending: '待入库',
    available: '可用',
    locked: '锁定',
    expired: '过期',
    disposed: '已处置',
    
    // General statuses
    enabled: '启用',
    disabled: '禁用',
    draft: '草稿',
    published: '已发布',
    
    // User roles
    admin: '管理员',
    manager: '经理',
    operator: '操作员',
    viewer: '查看者'
  }
  
  return textMap[status] || status
}

export const getPriorityBadgeColor = (priority: string): string => {
  const colorMap: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }
  
  return colorMap[priority] || 'bg-gray-100 text-gray-800'
}

export const getPriorityText = (priority: string): string => {
  const textMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }
  
  return textMap[priority] || priority
}

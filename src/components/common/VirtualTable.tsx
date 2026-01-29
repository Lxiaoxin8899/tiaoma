import React, { useCallback, useMemo, memo, useRef } from 'react'

export interface Column<T> {
  key: string
  title: string
  width?: number
  render?: (value: any, record: T, index: number) => React.ReactNode
  className?: string
}

interface VirtualTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowHeight?: number
  height?: number
  rowKey: keyof T | ((record: T) => string)
  onRowClick?: (record: T, index: number) => void
  emptyText?: string
  loading?: boolean
  className?: string
}

// 表头组件
const TableHeader = memo(function TableHeader<T>({
  columns
}: {
  columns: Column<T>[]
}) {
  return (
    <div className="flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      {columns.map((col) => (
        <div
          key={col.key}
          className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex-shrink-0 ${col.className || ''}`}
          style={{ width: col.width || 150, minWidth: col.width || 150 }}
        >
          {col.title}
        </div>
      ))}
    </div>
  )
})

// 行渲染组件
function TableRowComponent<T>({
  record,
  index,
  columns,
  rowKey,
  onRowClick,
  rowHeight,
}: {
  record: T
  index: number
  columns: Column<T>[]
  rowKey: keyof T | ((record: T) => string)
  onRowClick?: (record: T, index: number) => void
  rowHeight: number
}) {
  const key = typeof rowKey === 'function' ? rowKey(record) : String(record[rowKey])

  const handleClick = useCallback(() => {
    onRowClick?.(record, index)
  }, [onRowClick, record, index])

  const getValue = (record: T, key: string): any => {
    const keys = key.split('.')
    let value: any = record
    for (const k of keys) {
      value = value?.[k]
    }
    return value
  }

  return (
    <div
      className={`flex items-center border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
        onRowClick ? 'cursor-pointer' : ''
      } ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}
      style={{ height: rowHeight }}
      onClick={handleClick}
      data-key={key}
    >
      {columns.map((col) => {
        const value = getValue(record, col.key)
        return (
          <div
            key={col.key}
            className={`px-4 py-2 text-sm text-gray-900 dark:text-gray-100 flex-shrink-0 truncate ${col.className || ''}`}
            style={{ width: col.width || 150, minWidth: col.width || 150 }}
          >
            {col.render ? col.render(value, record, index) : (value ?? '-')}
          </div>
        )
      })}
    </div>
  )
}

const MemoizedTableRow = memo(TableRowComponent) as typeof TableRowComponent

// 虚拟表格主组件 - 使用简单的虚拟滚动实现
function VirtualTable<T>({
  columns,
  data,
  rowHeight = 52,
  height = 500,
  rowKey,
  onRowClick,
  emptyText = '暂无数据',
  loading = false,
  className = '',
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = React.useState(0)

  const totalWidth = useMemo(
    () => columns.reduce((sum, col) => sum + (col.width || 150), 0),
    [columns]
  )

  const totalHeight = data.length * rowHeight

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / rowHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(height / rowHeight) + 2, // 多渲染2行作为缓冲
      data.length
    )
    return { startIndex: Math.max(0, startIndex - 1), endIndex }
  }, [scrollTop, rowHeight, height, data.length])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 ${className}`}>
        <TableHeader columns={columns} />
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-500 dark:text-gray-400">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 ${className}`}>
        <TableHeader columns={columns} />
        <div className="flex flex-col items-center justify-center py-12" style={{ minHeight: 200 }}>
          <div className="text-4xl mb-4">📦</div>
          <p className="text-gray-500 dark:text-gray-400">{emptyText}</p>
        </div>
      </div>
    )
  }

  // 获取可见的数据
  const visibleData = data.slice(visibleRange.startIndex, visibleRange.endIndex)

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      <div style={{ minWidth: totalWidth }}>
        <TableHeader columns={columns} />
        <div
          ref={containerRef}
          className="overflow-auto"
          style={{ height, overflowX: 'auto' }}
          onScroll={handleScroll}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: visibleRange.startIndex * rowHeight,
                left: 0,
                right: 0,
              }}
            >
              {visibleData.map((record, i) => {
                const actualIndex = visibleRange.startIndex + i
                return (
                  <MemoizedTableRow
                    key={typeof rowKey === 'function' ? rowKey(record) : String(record[rowKey])}
                    record={record}
                    index={actualIndex}
                    columns={columns}
                    rowKey={rowKey}
                    onRowClick={onRowClick}
                    rowHeight={rowHeight}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(VirtualTable) as typeof VirtualTable

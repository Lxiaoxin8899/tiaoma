/**
 * 全局搜索组件
 * 支持跨模块搜索物料、批次、供应商
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useHotkey } from '@/hooks/useHotkeys'
import { useMaterialStore } from '@/stores/materialStore'
import { useBatchStore } from '@/stores/batchStore'
import { useSupplierStore } from '@/stores/supplierStore'

interface SearchResult {
  id: string
  type: 'material' | 'batch' | 'supplier'
  title: string
  subtitle: string
  icon: string
  path: string
}

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  const { materials } = useMaterialStore()
  const { batches } = useBatchStore()
  const { suppliers } = useSupplierStore()

  // 加载搜索历史
  useEffect(() => {
    const history = localStorage.getItem('search_history')
    if (history) {
      try {
        setSearchHistory(JSON.parse(history))
      } catch {
        // ignore
      }
    }
  }, [])

  // 保存搜索历史
  const saveToHistory = useCallback((term: string) => {
    if (!term.trim()) return
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('search_history', JSON.stringify(newHistory))
  }, [searchHistory])

  // 搜索结果
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return []

    const q = query.toLowerCase()
    const results: SearchResult[] = []

    // 搜索物料
    materials.forEach(m => {
      if (
        m.code?.toLowerCase().includes(q) ||
        m.name?.toLowerCase().includes(q) ||
        m.specification?.toLowerCase().includes(q)
      ) {
        results.push({
          id: m.id,
          type: 'material',
          title: `${m.code} - ${m.name}`,
          subtitle: m.specification || '无规格',
          icon: '📦',
          path: `/materials/${m.id}`,
        })
      }
    })

    // 搜索批次
    batches.forEach(b => {
      if (
        b.batch_number?.toLowerCase().includes(q) ||
        b.material?.name?.toLowerCase().includes(q) ||
        b.material?.code?.toLowerCase().includes(q)
      ) {
        results.push({
          id: b.id,
          type: 'batch',
          title: b.batch_number,
          subtitle: `${b.material?.name || '未知物料'} - 库存: ${b.remaining_quantity ?? b.quantity}`,
          icon: '📋',
          path: `/batches?highlight=${b.id}`,
        })
      }
    })

    // 搜索供应商
    suppliers.forEach(s => {
      if (
        s.code?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q)
      ) {
        results.push({
          id: s.id,
          type: 'supplier',
          title: `${s.code} - ${s.name}`,
          subtitle: s.contact_person || '无联系人',
          icon: '🏢',
          path: `/suppliers?highlight=${s.id}`,
        })
      }
    })

    return results.slice(0, 20) // 限制结果数量
  }, [query, materials, batches, suppliers])

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // 处理选择
  const handleSelect = useCallback((result: SearchResult) => {
    saveToHistory(query)
    navigate(result.path)
    onClose()
    setQuery('')
  }, [navigate, onClose, query, saveToHistory])

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [results, selectedIndex, handleSelect, onClose])

  // 快捷键关闭
  useHotkey('escape', onClose, { enabled: isOpen })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* 搜索框容器 */}
      <div className="flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div className="relative w-full max-w-2xl transform rounded-xl bg-white dark:bg-gray-900 shadow-2xl transition-all">
          {/* 搜索输入 */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索物料、批次、供应商..."
              className="flex-1 border-0 bg-transparent py-4 px-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-0"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded ml-2">
              ESC
            </kbd>
          </div>

          {/* 搜索结果 */}
          <div className="max-h-[60vh] overflow-y-auto">
            {query.trim() === '' ? (
              // 显示搜索历史
              searchHistory.length > 0 && (
                <div className="p-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    最近搜索
                  </div>
                  <div className="space-y-1">
                    {searchHistory.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(term)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                <p>未找到匹配的结果</p>
              </div>
            ) : (
              <div className="p-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-2xl mr-3">{result.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {result.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {result.subtitle}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      result.type === 'material'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : result.type === 'batch'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    }`}>
                      {result.type === 'material' ? '物料' : result.type === 'batch' ? '批次' : '供应商'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded ml-1">↓</kbd>
                <span className="ml-1">导航</span>
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd>
                <span className="ml-1">选择</span>
              </span>
            </div>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Ctrl</kbd>
              <span className="mx-1">+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">K</kbd>
              <span className="ml-1">打开搜索</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlobalSearch

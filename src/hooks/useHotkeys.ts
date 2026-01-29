/**
 * 快捷键 Hook
 * 提供全局和局部快捷键支持
 */

import { useEffect, useCallback, useRef } from 'react'

type KeyHandler = (event: KeyboardEvent) => void

interface HotkeyConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  handler: KeyHandler
  preventDefault?: boolean
  enabled?: boolean
}

/**
 * 解析快捷键字符串
 * 例如: "ctrl+s", "ctrl+shift+n", "escape"
 */
function parseHotkey(hotkey: string): Omit<HotkeyConfig, 'handler'> {
  const parts = hotkey.toLowerCase().split('+')
  const key = parts[parts.length - 1]

  return {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
  }
}

/**
 * 检查事件是否匹配快捷键配置
 */
function matchesHotkey(event: KeyboardEvent, config: Omit<HotkeyConfig, 'handler'>): boolean {
  const eventKey = event.key.toLowerCase()
  const configKey = config.key.toLowerCase()

  // 特殊键映射
  const keyMap: Record<string, string[]> = {
    'escape': ['escape', 'esc'],
    'enter': ['enter', 'return'],
    'space': [' ', 'space', 'spacebar'],
    'arrowup': ['arrowup', 'up'],
    'arrowdown': ['arrowdown', 'down'],
    'arrowleft': ['arrowleft', 'left'],
    'arrowright': ['arrowright', 'right'],
  }

  const possibleKeys = keyMap[configKey] || [configKey]
  const keyMatches = possibleKeys.includes(eventKey)

  const ctrlMatches = !!config.ctrl === (event.ctrlKey || event.metaKey)
  const shiftMatches = !!config.shift === event.shiftKey
  const altMatches = !!config.alt === event.altKey

  return keyMatches && ctrlMatches && shiftMatches && altMatches
}

/**
 * 单个快捷键 Hook
 */
export function useHotkey(
  hotkey: string,
  handler: KeyHandler,
  options: { preventDefault?: boolean; enabled?: boolean } = {}
) {
  const { preventDefault = true, enabled = true } = options
  const handlerRef = useRef(handler)

  // 保持 handler 引用最新
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) return

    const config = parseHotkey(hotkey)

    const handleKeyDown = (event: KeyboardEvent) => {
      // 忽略输入框中的快捷键（除非是 Escape）
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' ||
                      target.tagName === 'TEXTAREA' ||
                      target.isContentEditable

      if (isInput && config.key !== 'escape') {
        return
      }

      if (matchesHotkey(event, config)) {
        if (preventDefault) {
          event.preventDefault()
        }
        handlerRef.current(event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hotkey, preventDefault, enabled])
}

/**
 * 多个快捷键 Hook
 */
export function useHotkeys(
  hotkeys: Record<string, KeyHandler>,
  options: { preventDefault?: boolean; enabled?: boolean } = {}
) {
  const { preventDefault = true, enabled = true } = options
  const handlersRef = useRef(hotkeys)

  useEffect(() => {
    handlersRef.current = hotkeys
  }, [hotkeys])

  useEffect(() => {
    if (!enabled) return

    const configs = Object.entries(handlersRef.current).map(([key, handler]) => ({
      ...parseHotkey(key),
      handler,
    }))

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' ||
                      target.tagName === 'TEXTAREA' ||
                      target.isContentEditable

      for (const config of configs) {
        if (isInput && config.key !== 'escape') {
          continue
        }

        if (matchesHotkey(event, config)) {
          if (preventDefault) {
            event.preventDefault()
          }
          config.handler(event)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [preventDefault, enabled])
}

/**
 * 列表导航快捷键 Hook
 */
export function useListNavigation<T>(
  items: T[],
  options: {
    onSelect?: (item: T, index: number) => void
    onEnter?: (item: T, index: number) => void
    enabled?: boolean
  } = {}
) {
  const { onSelect, onEnter, enabled = true } = options
  const selectedIndexRef = useRef(0)

  const selectIndex = useCallback((index: number) => {
    if (index < 0) index = 0
    if (index >= items.length) index = items.length - 1
    selectedIndexRef.current = index
    onSelect?.(items[index], index)
  }, [items, onSelect])

  useHotkeys({
    'arrowup': () => selectIndex(selectedIndexRef.current - 1),
    'arrowdown': () => selectIndex(selectedIndexRef.current + 1),
    'enter': () => {
      const index = selectedIndexRef.current
      if (items[index]) {
        onEnter?.(items[index], index)
      }
    },
    'home': () => selectIndex(0),
    'end': () => selectIndex(items.length - 1),
  }, { enabled: enabled && items.length > 0 })

  return {
    selectedIndex: selectedIndexRef.current,
    selectIndex,
  }
}

/**
 * 常用快捷键常量
 */
export const HOTKEYS = {
  SAVE: 'ctrl+s',
  NEW: 'ctrl+n',
  SEARCH: 'ctrl+f',
  CLOSE: 'escape',
  DELETE: 'delete',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+shift+z',
  SELECT_ALL: 'ctrl+a',
  COPY: 'ctrl+c',
  PASTE: 'ctrl+v',
  CUT: 'ctrl+x',
  REFRESH: 'ctrl+r',
  PRINT: 'ctrl+p',
} as const

export default useHotkey

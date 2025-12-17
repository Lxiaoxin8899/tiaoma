import { reportError } from '../lib/errorHandler'

declare global {
  interface Window {
    /** 防止在 HMR/重复初始化时重复绑定事件 */
    __mmsGlobalErrorInited?: boolean
  }
}

/**
 * 初始化全局未捕获错误监听。
 * - window.onerror：同步运行时错误/资源加载错误（部分场景无 error 对象）
 * - unhandledrejection：未处理的 Promise rejection
 *
 * 说明：该文件只需在入口处 import 一次即可（如 src/main.tsx）。
 */
export const initGlobalErrorHandlers = () => {
  if (typeof window === 'undefined') return
  if (window.__mmsGlobalErrorInited) return
  window.__mmsGlobalErrorInited = true

  window.addEventListener('error', (event) => {
    const err =
      (event as ErrorEvent).error ??
      new Error((event as ErrorEvent).message || '捕获到未处理错误（未提供 error 对象）')

    reportError(err, 'window.error', {
      filename: (event as ErrorEvent).filename,
      lineno: (event as ErrorEvent).lineno,
      colno: (event as ErrorEvent).colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'window.unhandledrejection')
  })
}

// 入口文件直接 import 时自动初始化，避免遗漏。
initGlobalErrorHandlers()


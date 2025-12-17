/* eslint-disable react-refresh/only-export-components */
import React, { useMemo } from 'react'
import { notify } from '@/lib/notify'

/**
 * 统一 Toast Hook（组件侧使用）。
 * 说明：底层使用 react-hot-toast；App.tsx 里渲染的 `<Toaster />` 负责承载展示。
 */
export const useToast = () => {
  // 说明：返回稳定引用，避免触发不必要的渲染
  return useMemo(
    () => ({
      success: (title: string, message?: string, duration?: number) =>
        notify.success(title, message, duration ? { duration } : undefined),
      error: (title: string, message?: string, duration?: number) =>
        notify.error(title, message, duration ? { duration } : undefined),
      warning: (title: string, message?: string, duration?: number) =>
        notify.warning(title, message, duration ? { duration } : undefined),
      info: (title: string, message?: string, duration?: number) =>
        notify.info(title, message, duration ? { duration } : undefined),
    }),
    [],
  )
}

/**
 * 兼容旧用法：保留 ToastProvider 但不再维护自建 Toast 栈。
 * - 统一由 react-hot-toast 承载显示
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>

export default ToastProvider

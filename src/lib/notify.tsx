/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import toast, { type ToastOptions } from 'react-hot-toast'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

export type NotifyOptions = ToastOptions & {
  title: string
  message?: string
}

// 说明：统一 Toast 外观，支持暗色模式
const BASE_CLASSNAME =
  'border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100'

const Content: React.FC<{ title: string; message?: string }> = ({ title, message }) => (
  <div className="flex flex-col">
    <div className="text-sm font-medium leading-5">{title}</div>
    {message ? <div className="text-sm opacity-80 leading-5 mt-0.5">{message}</div> : null}
  </div>
)

const buildOptions = (options?: Omit<NotifyOptions, 'title' | 'message'>): ToastOptions => ({
  duration: 5000,
  ...options,
  className: options?.className ? `${BASE_CLASSNAME} ${options.className}` : BASE_CLASSNAME,
})

/**
 * 统一通知入口：
 * - 组件里可以用 `useToast()`，store 里建议直接用 `notify`（避免 hook 限制）。
 */
export const notify = {
  success: (title: string, message?: string, options?: Omit<NotifyOptions, 'title' | 'message'>) =>
    toast.success(<Content title={title} message={message} />, buildOptions(options)),

  error: (title: string, message?: string, options?: Omit<NotifyOptions, 'title' | 'message'>) =>
    toast.error(<Content title={title} message={message} />, buildOptions(options)),

  warning: (title: string, message?: string, options?: Omit<NotifyOptions, 'title' | 'message'>) =>
    toast(<Content title={title} message={message} />, {
      ...buildOptions(options),
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    }),

  info: (title: string, message?: string, options?: Omit<NotifyOptions, 'title' | 'message'>) =>
    toast(<Content title={title} message={message} />, {
      ...buildOptions(options),
      icon: <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    }),

  // 说明：提供基础控制能力，便于在关键流程里手动关闭/更新
  dismiss: (toastId?: string) => toast.dismiss(toastId),
  remove: (toastId?: string) => toast.remove(toastId),
}

// 说明：可选导出，用于在需要自定义 icon 的场景复用
export const notifyIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
}

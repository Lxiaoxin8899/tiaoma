/**
 * 预警中心组件
 * 显示库存预警、过期预警等通知
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  CheckIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { useAlertStore, Alert } from '@/stores/alertStore'

interface AlertCenterProps {
  className?: string
}

const AlertCenter: React.FC<AlertCenterProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const {
    alerts,
    settings,
    checkAlerts,
    markAsRead,
    markAllAsRead,
    dismissAlert,
    updateSettings,
    getUnreadCount,
  } = useAlertStore()

  // 初始化时检查预警
  useEffect(() => {
    checkAlerts()
    // 每5分钟检查一次
    const interval = setInterval(checkAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkAlerts])

  const unreadCount = getUnreadCount()

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'danger':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityBg = (severity: Alert['severity']) => {
    switch (severity) {
      case 'danger':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  const getAlertLink = (alert: Alert) => {
    if (alert.materialId) {
      return `/materials/${alert.materialId}`
    }
    if (alert.batchId) {
      return `/batches?highlight=${alert.batchId}`
    }
    return null
  }

  return (
    <div className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 面板内容 */}
          <div className="absolute right-0 mt-2 w-96 max-h-[80vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                预警中心
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    全部已读
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* 设置面板 */}
            {showSettings && (
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  预警设置
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">低库存预警</span>
                    <input
                      type="checkbox"
                      checked={settings.lowStockEnabled}
                      onChange={(e) => updateSettings({ lowStockEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">过期预警</span>
                    <input
                      type="checkbox"
                      checked={settings.expiringEnabled}
                      onChange={(e) => updateSettings({ expiringEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  {settings.expiringEnabled && (
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">提前预警天数</span>
                      <input
                        type="number"
                        value={settings.expiringDays}
                        onChange={(e) => updateSettings({ expiringDays: parseInt(e.target.value) || 30 })}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        min={1}
                        max={365}
                      />
                    </label>
                  )}
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">超库存提醒</span>
                    <input
                      type="checkbox"
                      checked={settings.overstockEnabled}
                      onChange={(e) => updateSettings({ overstockEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 预警列表 */}
            <div className="overflow-y-auto max-h-[50vh]">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <BellIcon className="h-12 w-12 mb-2 opacity-50" />
                  <p>暂无预警</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {alerts.map((alert) => {
                    const link = getAlertLink(alert)
                    return (
                      <div
                        key={alert.id}
                        className={`relative px-4 py-3 ${
                          !alert.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        } hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getSeverityIcon(alert.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {alert.title}
                              </p>
                              {!alert.read && (
                                <span className="h-2 w-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {alert.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              {link ? (
                                <Link
                                  to={link}
                                  onClick={() => {
                                    markAsRead(alert.id)
                                    setIsOpen(false)
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                  查看详情 →
                                </Link>
                              ) : (
                                <span />
                              )}
                              <div className="flex items-center space-x-2">
                                {!alert.read && (
                                  <button
                                    onClick={() => markAsRead(alert.id)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                    title="标记已读"
                                  >
                                    <CheckIcon className="h-4 w-4 text-gray-400" />
                                  </button>
                                )}
                                <button
                                  onClick={() => dismissAlert(alert.id)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                  title="忽略"
                                >
                                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 底部 */}
            {alerts.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={checkAlerts}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 py-1"
                >
                  刷新预警
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AlertCenter

import React, { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/common/Toast'

/**
 * 个人资料页：用于用户查看/修改自己的基础信息（metadata）。
 * 说明：权限上默认所有登录用户可访问；管理员对其他用户的管理仍在“用户管理”页面。
 */
const Profile: React.FC = () => {
  const { user, loading, error, updateUser, clearError } = useAuthStore()
  const { success, error: showError } = useToast()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [department, setDepartment] = useState('')

  const roleText = useMemo(() => {
    if (!user) return '-'
    return user.role === 'admin'
      ? '管理员'
      : user.role === 'manager'
        ? '经理'
        : user.role === 'operator'
          ? '操作员'
          : '查看者'
  }, [user])

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name || '')
    setUsername(user.username || '')
    setDepartment(user.department || '')
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!user) {
      showError('保存失败', '当前未登录')
      return
    }

    if (!username.trim()) {
      showError('校验失败', '用户名不能为空')
      return
    }

    const ok = await updateUser({
      full_name: fullName.trim() || undefined,
      username: username.trim(),
      department: department.trim() || undefined,
    })

    if (ok) {
      success('保存成功', '个人资料已更新')
    } else {
      showError('保存失败', '请检查输入或稍后重试')
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">个人资料</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">当前未登录或用户信息未加载。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">个人资料</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">更新你的姓名、用户名与部门信息。</p>

        <div className="mt-6 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">账号</div>
                <div className="text-base font-medium text-gray-900 dark:text-gray-100">{user.email || '-'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">角色</div>
                <div className="text-base font-medium text-gray-900 dark:text-gray-100">{roleText}</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            {error && (
              <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">姓名</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="例如：张三"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">用户名 *</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="例如：zhangsan"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">部门</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="例如：仓库部"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? '保存中…' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile

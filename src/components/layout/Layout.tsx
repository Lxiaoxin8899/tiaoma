import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CubeIcon,
  QrCodeIcon,
  UserGroupIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ChartBarIcon,
  TruckIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  SunIcon,
  MoonIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useTheme } from '../../hooks/useTheme';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, hasPermission } = useAuthStore();
  const { status: connectivityStatus, lastCheckedAt, recheck } = useConnectivity();
  const { theme, toggleTheme, isDark } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    // 说明：`/` 仅用于重定向到 `/dashboard`，这里统一把导航入口指向 `/dashboard`，便于高亮与面包屑展示
    { name: '仪表盘', href: '/dashboard', icon: HomeIcon, permission: 'read' },
    { name: '物料管理', href: '/materials', icon: CubeIcon, permission: 'read_materials' },
    { name: '库存管理', href: '/batches', icon: ArchiveBoxIcon, permission: 'read_batches' },
    { name: '供应商管理', href: '/suppliers', icon: TruckIcon, permission: 'read_suppliers' },
    { name: '条码生成', href: '/barcodes', icon: QrCodeIcon, permission: 'read_barcodes' },
    { name: '标签打印', href: '/label-print', icon: PrinterIcon, permission: 'read_barcodes' },
    { name: '统计分析', href: '/analytics', icon: ChartBarIcon, permission: 'read_analytics' },
    { name: '用户管理', href: '/users', icon: UserGroupIcon, permission: 'read_users' },
    { name: '操作日志', href: '/audit-logs', icon: ClipboardDocumentListIcon, permission: 'read_audit_logs' },
    { name: '系统设置', href: '/settings', icon: CogIcon, permission: 'read_settings' }
  ];

  const filteredNavigation = navigation.filter(item =>
    hasPermission(item.permission)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    // 说明：支持二级页面高亮（如 /materials/:id 仍高亮“物料管理”）
    if (path === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (userMenuOpen && !target.closest('#user-menu')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // 路由切换时收起菜单（避免菜单残留影响操作）
  useEffect(() => {
    setUserMenuOpen(false);
    // 移动端侧边栏在路由切换后自动收起
    setSidebarOpen(false);
  }, [location.pathname]);

  // Esc 关闭菜单（提高可用性/可访问性）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const connectivityUi = (() => {
    switch (connectivityStatus) {
      case 'local':
        return { text: '本地模式', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' };
      case 'online':
        return { text: '在线', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' };
      case 'offline':
        return { text: '离线', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' };
      case 'checking':
      default:
        return { text: '检测中', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' };
    }
  })();

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-950">
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MMS</span>
              </div>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">物料管理系统</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-5 px-2 space-y-1">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                ${isActive(item.href)
                  ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600 dark:bg-blue-900/30 dark:text-blue-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${isActive(item.href)
                    ? 'text-blue-600 dark:text-blue-300'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-200'
                  }
                `}
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              {/* 面包屑导航 */}
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <div>
                      <Link to="/" className="text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-200">
                        <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                  {location.pathname !== '/' && (
                    <li>
                      <div className="flex items-center">
                        <span className="text-gray-400">/</span>
                        <span className="ml-4 text-sm font-medium text-gray-500 dark:text-gray-300">
                          {(() => {
                            // 说明：面包屑做“最长前缀”匹配，兼容详情页等二级路由
                            if (/^\/materials\/[^/]+$/.test(location.pathname)) return '物料详情';
                            const matched = navigation
                              .filter((item) => {
                                if (item.href === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard';
                                return location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
                              })
                              .sort((a, b) => b.href.length - a.href.length)[0];
                            return matched?.name || '页面';
                          })()}
                        </span>
                      </div>
                    </li>
                  )}
                </ol>
              </nav>
            </div>

            {/* 用户信息 */}
            <div className="flex items-center space-x-4">
              {/* 连接状态（点击可手动探测） */}
              <button
                type="button"
                onClick={recheck}
                className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-transparent ${connectivityUi.className}`}
                title={lastCheckedAt ? `上次检测：${new Date(lastCheckedAt).toLocaleTimeString('zh-CN')}` : '点击重新检测连接状态'}
              >
                {connectivityUi.text}
              </button>

              {/* 主题切换：light/dark（auto 需要在设置页扩展，这里先提供最常用切换） */}
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                title={theme === 'auto' ? '主题：跟随系统（点击切换为亮/暗）' : `主题：${isDark ? '暗色' : '亮色'}（点击切换）`}
                aria-label="切换主题"
              >
                {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>

              <div className="relative" id="user-menu">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <UserCircleIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.full_name || user?.username || '用户'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role === 'admin' ? '管理员' :
                        user?.role === 'manager' ? '经理' :
                          user?.role === 'operator' ? '操作员' : '查看者'}
                    </div>
                  </div>
                </button>

                {/* 用户菜单下拉 */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-800">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserCircleIcon className="h-4 w-4 inline mr-2" />
                      个人资料
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 inline mr-2" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950">
          <div className="py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

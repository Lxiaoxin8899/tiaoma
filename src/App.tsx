import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import LoadingSpinner from './components/common/LoadingSpinner';

// 说明：路由级懒加载，降低首屏包体与首次解析开销（配合 Vite 代码分割效果更佳）
const LoginPage = React.lazy(() => import('./components/auth/LoginPage'));
import Home from './pages/Home';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const MaterialManagement = React.lazy(() => import('./pages/MaterialManagement'));
const SupplierManagement = React.lazy(() => import('./pages/SupplierManagement'));
const InventoryManagement = React.lazy(() => import('./pages/InventoryManagement'));
const BarcodeManagement = React.lazy(() => import('./pages/BarcodeManagement'));
const LabelPrint = React.lazy(() => import('./pages/LabelPrint'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Settings = React.lazy(() => import('./pages/Settings'));
const MaterialDetail = React.lazy(() => import('./pages/MaterialDetail'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'));
const Profile = React.lazy(() => import('./pages/Profile'));

function App() {
  // 说明：isAuthenticated 是方法，不是布尔值
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // 说明：Electron 打包后使用 file:// 协议，BrowserRouter 刷新/深链会找不到文件；用 HashRouter 更稳妥。
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      {/* 说明：统一通知系统使用 react-hot-toast，Toaster 负责承载 UI（同时支持暗色模式） */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          className:
            'border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100',
        }}
      />
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <React.Suspense fallback={<LoadingSpinner className="min-h-[60vh]" />}>
            <Routes>
                {/* 公开路由：登录 */}
                <Route
                  path="/login"
                  element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
                />

                {/* 受保护路由：登录后才可访问 */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/materials" element={<MaterialManagement />} />
                  <Route path="/materials/:id" element={<MaterialDetail />} />
                  <Route path="/suppliers" element={<SupplierManagement />} />
                  <Route path="/batches" element={<InventoryManagement />} />
                  <Route path="/barcodes" element={<BarcodeManagement />} />
                  <Route path="/label-print" element={<LabelPrint />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/profile" element={<Profile />} />

                  {/* 404：重定向到仪表盘 */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
            </Routes>
          </React.Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

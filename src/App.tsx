import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { Toaster } from 'react-hot-toast';

// 页面组件（统一放在 src/pages，便于按"路由=页面"维护）
import LoginPage from './components/auth/LoginPage';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import MaterialManagement from './pages/MaterialManagement';
import SupplierManagement from './pages/SupplierManagement';
import InventoryManagement from './pages/InventoryManagement';
import BarcodeManagement from './pages/BarcodeManagement';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import MaterialDetail from './pages/MaterialDetail';
import AuditLogs from './pages/AuditLogs';

function App() {
  // 说明：isAuthenticated 是方法，不是布尔值
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // 说明：Electron 打包后使用 file:// 协议，BrowserRouter 刷新/深链会找不到文件；用 HashRouter 更稳妥。
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      <ToastProvider>
        {/* 兼容 stores 中的 react-hot-toast（离线/在线通用） */}
        <Toaster position="top-right" />
        <Router>
          <div className="min-h-screen bg-gray-50">
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
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/audit-logs" element={<AuditLogs />} />

                {/* 404：重定向到仪表盘 */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import MaterialManagement from "@/pages/MaterialManagement";
import BatchManagement from "@/pages/BatchManagement";
import SupplierManagement from "@/pages/SupplierManagement";
import BarcodeManagement from "@/pages/BarcodeManagement";
import Analytics from "@/pages/Analytics";
import LoginForm from "@/components/auth/LoginForm";
import Layout from "@/components/layout/Layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/materials" element={<MaterialManagement />} />
          <Route path="/batches" element={<BatchManagement />} />
          <Route path="/suppliers" element={<SupplierManagement />} />
          <Route path="/barcodes" element={<BarcodeManagement />} />
          <Route path="/analytics" element={<Analytics />} />
          
          {/* 占位路由，用于尚未实现的页面 */}
          <Route path="/users" element={<div className="p-8 text-center text-xl text-gray-500">用户管理 - 即将上线</div>} />
          <Route path="/settings" element={<div className="p-8 text-center text-xl text-gray-500">系统设置 - 即将上线</div>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

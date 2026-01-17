import React, { useEffect } from 'react';
// 说明：单机版不再需要登录页与重定向，这里仅保留“启动时拉取本地会话”的能力
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, checkAuth } = useAuthStore();

  useEffect(() => {
    // 说明：单机版启动即进入系统，但仍需要初始化当前用户（本地会话）。
    // localSupabase 在无会话时会自动选择第一个本地用户，确保可直接进入。
    void checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

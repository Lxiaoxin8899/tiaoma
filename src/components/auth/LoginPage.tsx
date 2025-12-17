import React from 'react';
import LoginForm from './LoginForm';

// 登录页面容器，负责呈现品牌信息与登录表单
const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 px-6 py-16">
        <div className="hidden lg:flex flex-col justify-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            物料管理与条码生成系统
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            集中管理物料、批次、供应商与条码，支持离线模式与完善的角色权限控制，帮助团队快速落地数字化仓储。
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-200">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <p className="font-semibold text-gray-900 dark:text-gray-100">角色与权限</p>
              <p className="mt-1 text-gray-600 dark:text-gray-300">管理员/经理/操作员/查看者分级管理，安全可控。</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <p className="font-semibold text-gray-900 dark:text-gray-100">离线可用</p>
              <p className="mt-1 text-gray-600 dark:text-gray-300">无网络时自动切换本地存储，继续录入与查询。</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

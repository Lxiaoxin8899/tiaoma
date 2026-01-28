import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, isOfflineMode } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const DEFAULT_EMAIL = 'admin@local';
const DEFAULT_PASSWORD = 'Admin@123456';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading, error, clearError, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [initStatus, setInitStatus] = useState<'idle' | 'creating' | 'ready' | 'error'>('idle');
  const [initMessage, setInitMessage] = useState<string>('');

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || '/dashboard';
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    if (isOfflineMode) return;

    let cancelled = false;
    const ensureDefaultAccount = async () => {
      setInitStatus('creating');
      setInitMessage('');

      const { error: signUpError } = await supabase.auth.signUp({
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD,
        options: {
          data: {
            username: 'admin',
            role: 'admin',
            full_name: '系统管理员',
            status: 'active',
          },
        },
      });

      if (cancelled) return;

      if (!signUpError) {
        setInitStatus('ready');
        return;
      }

      const msg = signUpError.message || '';
      const exists = /already registered|already exists|Email address already in use/i.test(msg);
      if (exists) {
        setInitStatus('ready');
        return;
      }

      setInitStatus('error');
      setInitMessage(signUpError.message || '默认账号初始化失败');
    };

    ensureDefaultAccount().catch((err) => {
      if (cancelled) return;
      setInitStatus('error');
      setInitMessage(err?.message || '默认账号初始化失败');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();

    const ok = await signIn(email.trim(), password);
    if (ok) {
      navigate(redirectTo, { replace: true });
    }
  };

  const fillDefault = () => {
    setEmail(DEFAULT_EMAIL);
    setPassword(DEFAULT_PASSWORD);
  };

  if (isOfflineMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">离线模式</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">当前为离线模式，无需登录即可进入系统。</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="w-full py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            进入系统
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">登录</h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">使用默认账号或自定义账号登录系统。</p>
        </div>

        <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div>默认账号：{DEFAULT_EMAIL}</div>
              <div>默认密码：{DEFAULT_PASSWORD}</div>
            </div>
            <button
              type="button"
              onClick={fillDefault}
              className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              填入
            </button>
          </div>
          {initStatus === 'creating' && (
            <div className="mt-2 text-xs text-blue-600">正在初始化默认账号…</div>
          )}
          {initStatus === 'error' && initMessage && (
            <div className="mt-2 text-xs text-red-600">{initMessage}</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">账号</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              placeholder="请输入账号"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              placeholder="请输入密码"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || initStatus === 'creating'}
            className="w-full py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

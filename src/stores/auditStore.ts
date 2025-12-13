import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { db } from '../lib/localdb';
import type { AuditLog, AuditLogQueryParams } from '../types/database';
import { errorHandler, reportError } from '../lib/errorHandler';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface AuditState {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

interface AuditActions {
  logAction: (
    action: AuditLog['action'],
    module: AuditLog['module'],
    targetId?: string,
    targetName?: string,
    details?: Record<string, unknown>
  ) => Promise<void>;
  fetchLogs: (params?: AuditLogQueryParams) => Promise<void>;
  clearLogs: () => void;
}

type AuditStore = AuditState & AuditActions;

export const useAuditStore = create<AuditStore>((set) => ({
  logs: [],
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,

  logAction: async (action, module, targetId, targetName, details) => {
    try {
      // 异步记录日志，不阻塞主操作
      const user = useAuthStore.getState().user;
      if (!user) return;

      // 尝试获取 IP 地址（浏览器环境下有限）
      let ipAddress: string | undefined;
      // 说明：出于隐私/合规与稳定性考虑，默认不请求第三方 IP 服务；如需开启请设置 VITE_ENABLE_IP_LOGGING=true。
      if (import.meta.env.VITE_ENABLE_IP_LOGGING === 'true') {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1000);
          const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
          clearTimeout(timer);
          const data = (await response.json()) as { ip?: string };
          ipAddress = data.ip;
        } catch {
          // IP 获取失败不影响日志记录
          ipAddress = undefined;
        }
      }

      const logEntry: Omit<AuditLog, 'id' | 'created_at'> = {
        user_id: user.id,
        user_name: user.username || user.email,
        action,
        module,
        target_id: targetId,
        target_name: targetName,
        details,
        ip_address: ipAddress,
      };

      const isOffline = !(await supabase.isOnline());

      if (isOffline) {
        // 离线模式：保存到本地
        db.insert('audit_logs', logEntry);
      } else {
        // 在线模式：保存到 Supabase
        const { error } = await supabase
          .from('audit_logs')
          .insert([logEntry]);

        if (error) {
          // 如果在线保存失败，降级到本地存储
          reportError(error, 'audit.logAction');
          db.insert('audit_logs', logEntry);
        }
      }
    } catch (err) {
      // 日志记录失败不应该影响主操作，静默处理
      reportError(err, 'audit.logAction');
    }
  },

  fetchLogs: async (params = {}) => {
    set({ loading: true, error: null });

    try {
      const {
        page = 1,
        limit = 20,
        search,
        user_id,
        action,
        module,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = params;

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const isOffline = !(await supabase.isOnline());

      if (isOffline) {
        // 离线模式：从本地读取
        let logs = db.getAll('audit_logs') as AuditLog[];

        // 应用筛选
        if (user_id) {
          logs = logs.filter((log) => log.user_id === user_id);
        }
        if (action) {
          logs = logs.filter((log) => log.action === action);
        }
        if (module) {
          logs = logs.filter((log) => log.module === module);
        }
        if (start_date) {
          logs = logs.filter((log) => log.created_at >= start_date);
        }
        if (end_date) {
          logs = logs.filter((log) => log.created_at <= end_date);
        }
        if (search) {
          const searchLower = search.toLowerCase();
          logs = logs.filter(
            (log) =>
              log.user_name.toLowerCase().includes(searchLower) ||
              log.target_name?.toLowerCase().includes(searchLower) ||
              log.action.toLowerCase().includes(searchLower) ||
              log.module.toLowerCase().includes(searchLower)
          );
        }

        // 排序
        // 说明：sort_by 可能是任意字符串，这里做一次安全取值，避免离线模式运行时报错。
        const getSortValue = (log: AuditLog, key: string): string => {
          const v = (log as unknown as Record<string, unknown>)[key];
          if (typeof v === 'string') return v;
          if (typeof v === 'number') return String(v);
          return '';
        };

        logs.sort((a, b) => {
          const aVal = getSortValue(a, sort_by);
          const bVal = getSortValue(b, sort_by);
          const order = sort_order === 'asc' ? 1 : -1;
          return aVal > bVal ? order : aVal < bVal ? -order : 0;
        });

        const totalCount = logs.length;
        const paginatedLogs = logs.slice(from, to + 1);

        set({
          logs: paginatedLogs,
          currentPage: page,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          loading: false,
        });
      } else {
        // 在线模式：从 Supabase 读取
        let queryBuilder = supabase
          .from('audit_logs')
          .select('*', { count: 'exact' });

        // 应用筛选
        if (user_id) queryBuilder = queryBuilder.eq('user_id', user_id);
        if (action) queryBuilder = queryBuilder.eq('action', action);
        if (module) queryBuilder = queryBuilder.eq('module', module);
        if (start_date) queryBuilder = queryBuilder.gte('created_at', start_date);
        if (end_date) queryBuilder = queryBuilder.lte('created_at', end_date);
        if (search) {
          queryBuilder = queryBuilder.or(
            `user_name.ilike.%${search}%,target_name.ilike.%${search}%,action.ilike.%${search}%,module.ilike.%${search}%`
          );
        }

        // 排序和分页
        queryBuilder = queryBuilder.order(sort_by, { ascending: sort_order === 'asc' });
        queryBuilder = queryBuilder.range(from, to);

        const { data, error, count } = await queryBuilder;

        if (error) {
          reportError(error, 'audit.fetchLogs');
          set({ error: error.message, loading: false });
          toast.error('获取审计日志失败');
          return;
        }

        const logs = Array.isArray(data) ? data : (data ? [data] : []);

        set({
          logs: logs as AuditLog[],
          currentPage: page,
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          loading: false,
        });
      }
    } catch (err) {
      const appError = errorHandler.handle(err, '获取审计日志失败');
      reportError(err, 'audit.fetchLogs');
      set({ error: errorHandler.getUserMessage(appError), loading: false });
      toast.error('获取审计日志失败');
    }
  },

  clearLogs: () => {
    set({
      logs: [],
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      error: null,
    });
  },
}));

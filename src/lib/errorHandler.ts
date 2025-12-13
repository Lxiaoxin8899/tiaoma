/**
 * 错误处理工具类
 * 提供统一的错误处理、报告和格式化功能
 */

export interface AppError {
  code?: string;
  message: string;
  // 详情可能是字符串，也可能是对象（例如表单字段错误、请求上下文等）
  details?: unknown;
  cause?: unknown;
}

export interface ErrorReport {
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  code?: string;
  message: string;
  details?: unknown;
  stack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private reports: ErrorReport[] = [];
  private maxReports = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 创建标准化的应用错误
   */
  createError(code: string, message: string, details?: unknown, cause?: unknown): AppError {
    return {
      code,
      message,
      details,
      cause
    };
  }

  /**
   * 统一错误处理
   */
  handle(error: unknown, context?: string): AppError {
    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: context ? `${context}: ${error.message}` : error.message,
        cause: error
      };
    }

    if (typeof error === 'string') {
      return {
        code: 'STRING_ERROR',
        message: error
      };
    }

    return this.createError(
      'UNKNOWN_ERROR',
      context ? `${context}: 未知错误` : '未知错误',
      { originalError: error }
    );
  }

  /**
   * 获取用户友好的错误信息
   */
  getUserMessage(error: AppError | Error): string {
    const appError = error instanceof Error ? this.handle(error) : error;
    
    // 根据错误代码返回用户友好的消息
    switch (appError.code) {
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络连接后重试';
      case 'AUTH_ERROR':
        return '认证失败，请重新登录';
      case 'VALIDATION_ERROR':
        return typeof appError.details === 'string' && appError.details
          ? appError.details
          : '输入数据无效，请检查后重试';
      case 'PERMISSION_ERROR':
        return '您没有权限执行此操作';
      case 'NOT_FOUND':
        return '请求的资源不存在';
      case 'SERVER_ERROR':
        return '服务器错误，请稍后重试';
      case 'TIMEOUT_ERROR':
        return '请求超时，请重试';
      default:
        return appError.message || '操作失败，请重试';
    }
  }

  /**
   * 记录错误报告
   */
  report(error: unknown, context?: string, additionalContext?: Record<string, unknown>) {
    const appError = this.handle(error, context);
    const errorReport: ErrorReport = {
      timestamp: new Date().toISOString(),
      level: 'error',
      code: appError.code,
      message: appError.message,
      details: appError.details,
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: {
        context,
        ...additionalContext
      }
    };

    // 添加到报告队列
    this.reports.push(errorReport);
    
    // 保持队列大小限制
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }

    // 输出到控制台
    console.error(`[错误报告] ${context || '未知上下文'}:`, {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      error: error
    });

    // 开发环境下显示详细信息（Vite 环境使用 import.meta.env）
    if (import.meta.env.DEV) {
      console.group(`🚨 错误详情 [${context || 'Unknown'}]`);
      console.error('错误代码:', appError.code);
      console.error('错误信息:', appError.message);
      if (appError.details) console.error('详细信息:', appError.details);
      if (error instanceof Error && error.stack) {
        console.error('错误堆栈:', error.stack);
      }
      console.groupEnd();
    }

    // 可以在这里发送到远程错误报告服务
    // this.sendToRemote(errorReport);
  }

  /**
   * 警告处理
   */
  warn(message: string, context?: string, additionalContext?: Record<string, unknown>) {
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: {
        context,
        ...additionalContext
      }
    };

    this.reports.push(report);
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }

    console.warn(`[警告] ${context || '未知上下文'}:`, message);
  }

  /**
   * 信息日志
   */
  info(message: string, context?: string, additionalContext?: Record<string, unknown>) {
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: {
        context,
        ...additionalContext
      }
    };

    this.reports.push(report);
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }

    console.info(`[信息] ${context || '未知上下文'}:`, message);
  }

  /**
   * 获取所有报告
   */
  getReports(): ErrorReport[] {
    return [...this.reports];
  }

  /**
   * 清空报告
   */
  clearReports() {
    this.reports = [];
  }

  /**
   * 导出错误报告
   */
  exportReports(): string {
    return JSON.stringify(this.reports, null, 2);
  }

  /**
   * 处理异步操作的错误
   */
  async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    fallback?: T
  ): Promise<{ data?: T; error?: AppError }> {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const appError = this.handle(error, context);
      this.report(error, context);
      return { error: appError, data: fallback };
    }
  }

  /**
   * 检查是否是网络错误
   */
  isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    if (error instanceof Error && error.message.includes('Network Error')) {
      return true;
    }
    return false;
  }

  /**
   * 检查是否是认证错误
   */
  isAuthError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    return errorMessage.includes('unauthorized') || 
           errorMessage.includes('unauthenticated') ||
           errorMessage.includes('invalid token') ||
           errorMessage.includes('authentication');
  }

  /**
   * 检查是否是权限错误
   */
  isPermissionError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    return errorMessage.includes('permission') ||
           errorMessage.includes('forbidden') ||
           errorMessage.includes('access denied');
  }

  /**
   * 创建重试操作的包装器
   */
  createRetryWrapper<T extends unknown[], R>(
    operation: (...args: T) => Promise<R>,
    options: {
      maxRetries?: number;
      delay?: number;
      backoffFactor?: number;
      context?: string;
    } = {}
  ) {
    const { maxRetries = 3, delay = 1000, backoffFactor = 2, context = 'retry_operation' } = options;

    return async (...args: T): Promise<{ data?: R; error?: AppError }> => {
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const data = await operation(...args);
          return { data };
        } catch (error) {
          lastError = error as Error;
          const appError = this.handle(error, context);
          
          // 如果是最后一次尝试，记录错误并返回
          if (attempt === maxRetries) {
            this.report(error, `${context}_final_attempt`, { attempt, maxRetries });
            return { error: appError };
          }

          // 记录重试尝试
          this.report(error, `${context}_retry`, { attempt, maxRetries });

          // 等待一段时间后重试
          const waitTime = delay * Math.pow(backoffFactor, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      return { error: this.handle(lastError, context) };
    };
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 导出便捷函数
export const createError = (code: string, message: string, details?: unknown, cause?: unknown) =>
  errorHandler.createError(code, message, details, cause);

export const reportError = (error: unknown, context?: string, additionalContext?: Record<string, unknown>) =>
  errorHandler.report(error, context, additionalContext);

export const handleAsync = <T>(
  operation: () => Promise<T>,
  context?: string,
  fallback?: T
) => errorHandler.handleAsync(operation, context, fallback);

export const createRetryWrapper = <T extends unknown[], R>(
  operation: (...args: T) => Promise<R>,
  options?: Parameters<ErrorHandler['createRetryWrapper']>[1]
) => errorHandler.createRetryWrapper(operation, options);

import React, { Component, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // 记录错误信息
    console.error('错误边界捕获到错误:', error, errorInfo);
    
    // 调用自定义错误处理
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // 可以在这里发送错误报告到日志服务
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // 这里可以发送到错误报告服务
    console.error('错误报告:', errorReport);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，则使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误页面
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  出现了一些问题
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  抱歉，应用程序遇到了意外错误
                </p>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="mt-6">
                  <details className="text-left">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      错误详情 (开发模式)
                    </summary>
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-800 overflow-auto max-h-40">
                      <div className="font-semibold mb-2">错误信息:</div>
                      <div className="mb-4">{this.state.error.message}</div>
                      {this.state.error.stack && (
                        <>
                          <div className="font-semibold mb-2">错误堆栈:</div>
                          <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                        </>
                      )}
                    </div>
                  </details>
                </div>
              )}

              <div className="mt-6 flex flex-col space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  重试
                </button>
                <button
                  onClick={this.handleReload}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  重新加载页面
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  如果问题持续存在，请联系技术支持
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

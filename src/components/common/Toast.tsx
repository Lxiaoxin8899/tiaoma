import React, { createContext, useContext, useState, useCallback } from 'react';
import { Transition } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const iconProps = { className: "h-6 w-6" };

  switch (type) {
    case 'success':
      return <CheckCircleIcon {...iconProps} className="h-6 w-6 text-green-400" />;
    case 'error':
      return <XCircleIcon {...iconProps} className="h-6 w-6 text-red-400" />;
    case 'warning':
      return <ExclamationTriangleIcon {...iconProps} className="h-6 w-6 text-yellow-400" />;
    case 'info':
      return <InformationCircleIcon {...iconProps} className="h-6 w-6 text-blue-400" />;
    default:
      return null;
  }
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isShowing, setIsShowing] = useState(true);

  const handleClose = useCallback(() => {
    setIsShowing(false);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  React.useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(handleClose, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleClose]);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-white border-l-4 border-green-400';
      case 'error':
        return 'bg-white border-l-4 border-red-400';
      case 'warning':
        return 'bg-white border-l-4 border-yellow-400';
      case 'info':
        return 'bg-white border-l-4 border-blue-400';
      default:
        return 'bg-white border-l-4 border-gray-400';
    }
  };

  const getTitleStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getMessageStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      case 'info':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <Transition
      show={isShowing}
      enter="transition ease-in-out duration-300 transform"
      enterFrom="translate-x-full opacity-0"
      enterTo="translate-x-0 opacity-100"
      leave="transition ease-in-out duration-300 transform"
      leaveFrom="translate-x-0 opacity-100"
      leaveTo="translate-x-full opacity-0"
    >
      <div className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${getToastStyles(toast.type)}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ToastIcon type={toast.type} />
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className={`text-sm font-medium ${getTitleStyles(toast.type)}`}>
                {toast.title}
              </p>
              {toast.message && (
                <p className={`mt-1 text-sm ${getMessageStyles(toast.type)}`}>
                  {toast.message}
                </p>
              )}
              {toast.action && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={toast.action.onClick}
                    className={`text-sm font-medium ${getTitleStyles(toast.type)} hover:opacity-75 transition-opacity`}
                  >
                    {toast.action.label}
                  </button>
                </div>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                type="button"
                onClick={handleClose}
                className={`rounded-md inline-flex ${getTitleStyles(toast.type)} hover:opacity-75 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                <span className="sr-only">关闭</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const createToastMethod = (type: ToastType) => (title: string, message?: string, duration: number = 5000) => {
    addToast({ type, title, message, duration });
  };

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success: createToastMethod('success'),
    error: createToastMethod('error'),
    warning: createToastMethod('warning'),
    info: createToastMethod('info')
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;

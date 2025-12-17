import React from 'react';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
  // 兼容旧用法：不建议新代码继续使用 confirmClass/cancelClass
  confirmClass?: string;
  cancelClass?: string;
  icon?: React.ReactNode;
  isOpen?: boolean; // Add optional props to match usage
  variant?: 'danger' | 'info' | 'warning'; // Add optional props to match usage
  confirmLabel?: string; // Add optional props to match usage
  cancelLabel?: string; // Add optional props to match usage
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  confirmButtonClass,
  cancelButtonClass,
  confirmClass,
  cancelClass,
  icon,
  isOpen = true,
  variant = 'danger',
  confirmLabel,
  cancelLabel
}) => {
  // Use labels if provided, otherwise fallback to text or defaults
  const finalConfirmText = confirmLabel || confirmText || '确认';
  const finalCancelText = cancelLabel || cancelText || '取消';

  // Determine styles based on variant
  let finalConfirmClass = confirmButtonClass || confirmClass;
  if (!finalConfirmClass) {
    switch (variant) {
      case 'danger':
        finalConfirmClass = 'bg-red-600 hover:bg-red-700 text-white';
        break;
      case 'warning':
        finalConfirmClass = 'bg-orange-600 hover:bg-orange-700 text-white';
        break;
      case 'info':
      default:
        finalConfirmClass = 'bg-blue-600 hover:bg-blue-700 text-white';
        break;
    }
  }

  const finalCancelClass = cancelButtonClass || cancelClass || 'bg-gray-300 hover:bg-gray-400 text-gray-700';

  const defaultIcon = variant === 'danger' || variant === 'warning' 
    ? <ExclamationTriangleIcon className={`h-6 w-6 ${variant === 'danger' ? 'text-red-600' : 'text-orange-600'}`} />
    : null;

  const finalIcon = icon || defaultIcon;

  return (
    <Dialog open={isOpen} onClose={onCancel} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-transparent dark:border-gray-800">
          <div className="p-6">
            <div className="flex items-center mb-4">
              {finalIcon}
              <Dialog.Title className={`ml-3 text-lg font-semibold text-gray-900 dark:text-gray-100 ${!finalIcon ? '' : ''}`}>
                {title}
              </Dialog.Title>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {message}
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className={`px-4 py-2 rounded-lg transition-colors ${finalCancelClass}`}
              >
                {finalCancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${finalConfirmClass}`}
              >
                {finalConfirmText}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ConfirmDialog;

import React, { useState, useRef } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { parseExcelFile, ImportError, ImportResult } from '../../lib/importUtils';

export interface ImportModalProps {
  title: string;
  onClose: () => void;
  onImport: (data: unknown[]) => Promise<{ success: number; failed: number }>;
  onDownloadTemplate: () => void;
  validateData: (rows: unknown[]) => ImportResult<unknown>;
  templateFields: string[];
}

const ImportModal: React.FC<ImportModalProps> = ({
  title,
  onClose,
  onImport,
  onDownloadTemplate,
  validateData,
  templateFields
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportResult<unknown> | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // 解析 Excel 文件
      const data = await parseExcelFile(selectedFile);

      // 验证数据
      const result = validateData(data);
      setValidationResult(result);

      // 切换到预览步骤
      setCurrentStep('preview');
    } catch (error) {
      alert('解析文件失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsUploading(false);
    }
  };

  // 处理拖拽
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      handleFileChange(droppedFile);
    } else {
      alert('请上传 Excel 文件（.xlsx 或 .xls）');
    }
  };

  // 处理导入
  const handleImport = async () => {
    if (!validationResult || validationResult.validData.length === 0) {
      alert('没有有效数据可以导入');
      return;
    }

    setIsUploading(true);

    try {
      const result = await onImport(validationResult.validData);
      setImportResult(result);
      setCurrentStep('result');
    } catch (error) {
      alert('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsUploading(false);
    }
  };

  // 重置状态
  const handleReset = () => {
    setValidationResult(null);
    setImportResult(null);
    setCurrentStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 渲染错误信息
  const renderErrors = (errors: ImportError[]) => {
    // 按行分组错误
    const errorsByRow: { [row: number]: ImportError[] } = {};
    errors.forEach(error => {
      if (!errorsByRow[error.row]) {
        errorsByRow[error.row] = [];
      }
      errorsByRow[error.row].push(error);
    });

    return (
      <div className="mt-4 max-h-64 overflow-auto">
        <h4 className="text-sm font-medium text-red-800 mb-2">验证错误（{errors.length} 个）</h4>
        <div className="space-y-2">
          {Object.entries(errorsByRow).map(([row, rowErrors]) => (
            <div key={row} className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="font-medium text-red-900 mb-1">第 {row} 行：</div>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {rowErrors.map((error, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{error.field}:</span> {error.message}
                    {error.value && <span className="text-red-600"> (值: {String(error.value)})</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* 居中对齐 */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* 模态框内容 */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* 头部 */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="bg-white px-6 py-6">
            {/* 步骤 1: 上传文件 */}
            {currentStep === 'upload' && (
              <div>
                <div className="mb-4">
                  <button
                    onClick={onDownloadTemplate}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2 text-gray-500" />
                    下载导入模板
                  </button>
                </div>

                <div
                  className={`mt-4 border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        拖拽文件到此处，或
                        <span className="text-blue-600 hover:text-blue-500"> 点击选择文件</span>
                      </span>
                      <input
                        ref={fileInputRef}
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">支持 .xlsx 和 .xls 格式</p>
                  </div>
                </div>

                {isUploading && (
                  <div className="mt-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-600">正在解析文件...</p>
                  </div>
                )}
              </div>
            )}

            {/* 步骤 2: 预览数据 */}
            {currentStep === 'preview' && validationResult && (
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-base font-medium text-gray-900">数据预览</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        共 {validationResult.totalRows} 行数据，
                        <span className="text-green-600 font-medium">{validationResult.validData.length} 行有效</span>
                        {validationResult.errors.length > 0 && (
                          <span className="text-red-600 font-medium">
                            ，{validationResult.errors.length} 个错误
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      重新上传
                    </button>
                  </div>

                  {/* 错误信息 */}
                  {validationResult.errors.length > 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3 flex-1">
                          <p className="text-sm text-yellow-700">
                            检测到 {validationResult.errors.length} 个数据错误，这些行将被跳过。
                            {validationResult.validData.length > 0 && '您可以继续导入有效数据。'}
                          </p>
                          {renderErrors(validationResult.errors)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 有效数据预览 */}
                  {validationResult.validData.length > 0 && (
                    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                #
                              </th>
                              {templateFields.map(field => (
                                <th
                                  key={field}
                                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {field}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {validationResult.validData.slice(0, 10).map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {idx + 1}
                                </td>
                                {templateFields.map(field => (
                                  <td
                                    key={field}
                                    className="px-3 py-2 whitespace-nowrap text-sm text-gray-900"
                                  >
                                    {String((row as Record<string, unknown>)[field] || '-')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {validationResult.validData.length > 10 && (
                        <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center">
                          仅显示前 10 条数据，共 {validationResult.validData.length} 条
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 步骤 3: 导入结果 */}
            {currentStep === 'result' && importResult && (
              <div className="text-center py-8">
                <div className="mb-6">
                  {importResult.success > 0 && importResult.failed === 0 ? (
                    <div className="text-green-600">
                      <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="text-yellow-600">
                      <ExclamationTriangleIcon className="mx-auto h-16 w-16" />
                    </div>
                  )}
                </div>

                <h4 className="text-xl font-medium text-gray-900 mb-4">导入完成</h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    成功导入：<span className="text-green-600 font-medium text-lg">{importResult.success}</span> 条
                  </p>
                  {importResult.failed > 0 && (
                    <p className="text-sm text-gray-600">
                      导入失败：<span className="text-red-600 font-medium text-lg">{importResult.failed}</span> 条
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            {currentStep === 'preview' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!validationResult || validationResult.validData.length === 0 || isUploading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? '导入中...' : `确认导入 (${validationResult?.validData.length || 0} 条)`}
                </button>
              </>
            )}

            {currentStep === 'result' && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;

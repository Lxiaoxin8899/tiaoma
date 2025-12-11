import React, { useState, useEffect } from 'react';
import { useMaterialStore } from '../../stores/materialStore';
import { useBatchStore } from '../../stores/batchStore';
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import BarcodeViewer from './BarcodeViewer';

const BarcodeGenerator: React.FC = () => {
  const { materials, fetchMaterials } = useMaterialStore();
  const { batches, fetchBatches } = useBatchStore();
  
  const [sourceType, setSourceType] = useState<'material' | 'batch' | 'custom'>('material');
  const [selectedId, setSelectedId] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>('barcode');
  const [showValue, setShowValue] = useState(true);

  useEffect(() => {
    fetchMaterials();
    fetchBatches();
  }, [fetchMaterials, fetchBatches]);

  const getDisplayValue = () => {
    if (sourceType === 'material') {
      const material = materials.find(m => m.id === selectedId);
      return material ? material.code : '';
    } else if (sourceType === 'batch') {
      const batch = batches.find(b => b.id === selectedId);
      return batch ? batch.batch_number : '';
    } else {
      return customValue;
    }
  };

  const displayValue = getDisplayValue();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL();
        printWindow.document.write(`
          <html>
            <head>
              <title>打印条码 - ${displayValue}</title>
              <style>
                body {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                }
                img {
                  max-width: 100%;
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" />
              <script>
                window.onload = () => {
                  window.print();
                  window.close();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `barcode-${displayValue}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：配置区域 */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">生成配置</h3>
            
            {/* 来源选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                条码来源
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="sourceType"
                    value="material"
                    checked={sourceType === 'material'}
                    onChange={() => {
                      setSourceType('material');
                      setSelectedId('');
                    }}
                  />
                  <span className="ml-2">物料编码</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="sourceType"
                    value="batch"
                    checked={sourceType === 'batch'}
                    onChange={() => {
                      setSourceType('batch');
                      setSelectedId('');
                    }}
                  />
                  <span className="ml-2">批次号</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="sourceType"
                    value="custom"
                    checked={sourceType === 'custom'}
                    onChange={() => {
                      setSourceType('custom');
                      setCustomValue('');
                    }}
                  />
                  <span className="ml-2">自定义输入</span>
                </label>
              </div>
            </div>

            {/* 内容选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择内容
              </label>
              {sourceType === 'material' && (
                <select
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">请选择物料...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              )}

              {sourceType === 'batch' && (
                <select
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">请选择批次...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} - {b.material?.name}
                    </option>
                  ))}
                </select>
              )}

              {sourceType === 'custom' && (
                <input
                  type="text"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="输入条码内容..."
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
              )}
            </div>

            {/* 格式选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                条码格式
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="codeType"
                    value="barcode"
                    checked={codeType === 'barcode'}
                    onChange={() => setCodeType('barcode')}
                  />
                  <span className="ml-2">一维码 (Code128)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="codeType"
                    value="qrcode"
                    checked={codeType === 'qrcode'}
                    onChange={() => setCodeType('qrcode')}
                  />
                  <span className="ml-2">二维码 (QR Code)</span>
                </label>
              </div>
            </div>

            {/* 其他选项 */}
            {codeType === 'barcode' && (
              <div className="mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox text-blue-600"
                    checked={showValue}
                    onChange={(e) => setShowValue(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-700">显示文本数值</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：预览区域 */}
        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-300">
          {displayValue ? (
            <div className="space-y-6 text-center">
              <h3 className="text-lg font-medium text-gray-900">预览</h3>
              
              <div className="bg-white p-4 rounded shadow-sm inline-block">
                <BarcodeViewer
                  value={displayValue}
                  type={codeType}
                  showValue={showValue}
                />
              </div>

              <div className="flex justify-center space-x-4 mt-6">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PrinterIcon className="-ml-1 mr-2 h-5 w-5" />
                  打印
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                  下载图片
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <p>请在左侧选择数据生成条码</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useMaterialStore } from '../../stores/materialStore';
import { useBatchStore } from '../../stores/batchStore';
import { PrinterIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import BarcodeViewer from './BarcodeViewer';
import { Material, MaterialBatch } from '../../types/database';

// 可搜索下拉组件
interface SearchableSelectProps<T> {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemSubLabel?: (item: T) => string;
  loading?: boolean;
  disabled?: boolean;
}

function SearchableSelect<T>({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  getItemId,
  getItemLabel,
  getItemSubLabel,
  loading = false,
  disabled = false
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lowerSearch = search.toLowerCase();
    return items.filter(item => {
      const label = getItemLabel(item).toLowerCase();
      const subLabel = getItemSubLabel?.(item)?.toLowerCase() || '';
      return label.includes(lowerSearch) || subLabel.includes(lowerSearch);
    });
  }, [items, search, getItemLabel, getItemSubLabel]);

  const selectedItem = items.find(item => getItemId(item) === value);

  const handleSelect = (item: T) => {
    onChange(getItemId(item));
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className="relative">
      {/* 选择框 */}
      <div
        className={`mt-1 relative w-full bg-white border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {loading ? (
          <span className="text-gray-400">加载中...</span>
        ) : selectedItem ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{getItemLabel(selectedItem)}</span>
              {getItemSubLabel && (
                <span className="text-gray-500 ml-2">- {getItemSubLabel(selectedItem)}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}

        {/* 清除按钮 */}
        {selectedItem && !disabled && (
          <button
            type="button"
            className="absolute inset-y-0 right-8 flex items-center pr-2"
            onClick={handleClear}
          >
            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}

        {/* 下拉箭头 */}
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </div>

      {/* 下拉面板 */}
      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-80 rounded-md border border-gray-200 overflow-hidden">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          {/* 选项列表 */}
          <ul className="max-h-60 overflow-auto py-1">
            {filteredItems.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 text-center">
                {search ? '没有找到匹配项' : '暂无数据'}
              </li>
            ) : (
              filteredItems.map((item) => {
                const itemId = getItemId(item);
                const isSelected = itemId === value;
                return (
                  <li
                    key={itemId}
                    className={`px-3 py-2 cursor-pointer text-sm ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={isSelected ? 'font-medium' : ''}>
                          {getItemLabel(item)}
                        </span>
                        {getItemSubLabel && (
                          <span className="text-gray-500 ml-2">- {getItemSubLabel(item)}</span>
                        )}
                      </div>
                      {isSelected && (
                        <svg className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L7 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* 点击外部关闭 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

const BarcodeGenerator: React.FC = () => {
  const { materials, loading: materialsLoading, fetchMaterials } = useMaterialStore();
  const { batches, loading: batchesLoading, fetchBatches, getBatchesByMaterial } = useBatchStore();

  // 说明：用于定位预览区域的 canvas，避免 document.querySelector 误选到其他 canvas（例如图表等）。
  const previewRef = useRef<HTMLDivElement>(null);

  const [sourceType, setSourceType] = useState<'material' | 'batch' | 'custom'>('material');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>('barcode');
  const [showValue, setShowValue] = useState(true);

  // 批次模式下，存储筛选后的批次列表
  const [filteredBatches, setFilteredBatches] = useState<MaterialBatch[]>([]);
  const [loadingFilteredBatches, setLoadingFilteredBatches] = useState(false);

  // 加载所有物料和批次（不分页）
  useEffect(() => {
    fetchMaterials({ limit: 1000 });
    fetchBatches({ limit: 1000 });
  }, [fetchMaterials, fetchBatches]);

  // 当选择物料后，加载该物料的批次
  useEffect(() => {
    if (sourceType === 'batch' && selectedMaterialId) {
      setLoadingFilteredBatches(true);
      getBatchesByMaterial(selectedMaterialId).then((data) => {
        setFilteredBatches(data);
        setLoadingFilteredBatches(false);
      });
    } else if (sourceType === 'batch' && !selectedMaterialId) {
      // 如果没有选择物料，显示所有批次
      setFilteredBatches(batches);
    }
  }, [sourceType, selectedMaterialId, getBatchesByMaterial, batches]);

  const getDisplayValue = () => {
    if (sourceType === 'material') {
      const material = materials.find(m => m.id === selectedMaterialId);
      return material ? material.code : '';
    } else if (sourceType === 'batch') {
      const batch = (selectedMaterialId ? filteredBatches : batches).find(b => b.id === selectedBatchId);
      return batch ? batch.batch_number : '';
    } else {
      return customValue;
    }
  };

  const displayValue = getDisplayValue();

  // 说明：下载文件名需要规避 Windows 非法字符，避免保存失败或行为不一致。
  const sanitizeFilename = (name: string) => {
    const safe = name
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/[\r\n\t]+/g, '_')
      .slice(0, 80);
    return safe || 'barcode';
  };

  const handlePrint = () => {
    if (!displayValue) return;

    const canvas = previewRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    // 说明：使用 noopener/noreferrer，避免打印窗口意外获取 opener 引用导致的安全风险。
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const printWidth = Math.max(1, Math.round(canvas.width / 2));
    const printHeight = Math.max(1, Math.round(canvas.height / 2));

    const doc = printWindow.document;
    // 说明：写入固定骨架，再通过 title/textContent 等设置动态内容，避免 XSS 注入。
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
    doc.close();

    doc.title = `打印条码 - ${displayValue}`;

    const style = doc.createElement('style');
    style.textContent = `
      @page { size: auto; margin: 10mm; }
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      img {
        width: ${printWidth}px;
        height: ${printHeight}px;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
      }
    `;
    doc.head.appendChild(style);

    const img = doc.createElement('img');
    img.src = dataUrl;
    img.alt = displayValue;
    doc.body.appendChild(img);

    // 说明：等待图片加载完成再触发打印，避免出现空白页。
    img.onload = () => {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } finally {
          printWindow.close();
        }
      }, 100);
    };
  };

  const handleDownload = () => {
    if (!displayValue) return;

    const canvas = previewRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `barcode-${sanitizeFilename(displayValue)}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  // 切换来源类型时重置选择
  const handleSourceTypeChange = (type: 'material' | 'batch' | 'custom') => {
    setSourceType(type);
    setSelectedMaterialId('');
    setSelectedBatchId('');
    setCustomValue('');
    setFilteredBatches(batches);
  };

  // 批次列表（根据是否选择了物料来决定显示哪些）
  const displayBatches = selectedMaterialId ? filteredBatches : batches;

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
                    onChange={() => handleSourceTypeChange('material')}
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
                    onChange={() => handleSourceTypeChange('batch')}
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
                    onChange={() => handleSourceTypeChange('custom')}
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
                <SearchableSelect<Material>
                  items={materials}
                  value={selectedMaterialId}
                  onChange={setSelectedMaterialId}
                  placeholder="请选择物料..."
                  searchPlaceholder="搜索物料编码或名称..."
                  getItemId={(m) => m.id}
                  getItemLabel={(m) => m.code}
                  getItemSubLabel={(m) => m.name}
                  loading={materialsLoading}
                />
              )}

              {sourceType === 'batch' && (
                <div className="space-y-3">
                  {/* 先选物料（可选） */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      按物料筛选（可选）
                    </label>
                    <SearchableSelect<Material>
                      items={materials}
                      value={selectedMaterialId}
                      onChange={(id) => {
                        setSelectedMaterialId(id);
                        setSelectedBatchId(''); // 重置批次选择
                      }}
                      placeholder="全部物料"
                      searchPlaceholder="搜索物料..."
                      getItemId={(m) => m.id}
                      getItemLabel={(m) => m.code}
                      getItemSubLabel={(m) => m.name}
                      loading={materialsLoading}
                    />
                  </div>

                  {/* 再选批次 */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      选择批次 {selectedMaterialId && `(${filteredBatches.length} 个批次)`}
                    </label>
                    <SearchableSelect<MaterialBatch>
                      items={displayBatches}
                      value={selectedBatchId}
                      onChange={setSelectedBatchId}
                      placeholder="请选择批次..."
                      searchPlaceholder="搜索批次号..."
                      getItemId={(b) => b.id}
                      getItemLabel={(b) => b.batch_number}
                      getItemSubLabel={(b) => b.material?.name || ''}
                      loading={batchesLoading || loadingFilteredBatches}
                    />
                  </div>
                </div>
              )}

              {sourceType === 'custom' && (
                <input
                  type="text"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="输入条码内容（支持扫码枪输入）..."
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  autoFocus
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

            {/* 数据统计 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-500">
              <div className="flex justify-between">
                <span>可用物料：{materials.length} 个</span>
                <span>可用批次：{batches.length} 个</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：预览区域 */}
        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-300">
          {displayValue ? (
            <div className="space-y-6 text-center">
              <h3 className="text-lg font-medium text-gray-900">预览</h3>

              <div ref={previewRef} className="bg-white p-4 rounded shadow-sm inline-block">
                <BarcodeViewer
                  value={displayValue}
                  type={codeType}
                  showValue={showValue}
                />
              </div>

              <div className="text-sm text-gray-600">
                条码内容：<span className="font-mono font-medium">{displayValue}</span>
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
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-sm">请在左侧选择数据生成条码</p>
              <p className="text-xs mt-1 text-gray-400">支持搜索物料编码、名称或批次号</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;

import React, { useState, useEffect, useRef } from 'react';
import {
  PrinterIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useMaterialStore } from '../stores/materialStore';
import { useBatchStore } from '../stores/batchStore';
import { useSettingsStore } from '../stores/settingsStore';
import LabelPrintTemplate from '../components/labels/LabelPrintTemplate';
import { LabelPrintData } from '../types/database';
import { useToast } from '../components/common/Toast';

// 标签配置类型
export interface LabelConfig {
  // 标签尺寸
  labelWidth: number;        // 标签宽度 mm
  labelHeight: number;       // 标签高度 mm
  // 打印边距
  marginTop: number;         // 上边距 mm
  marginBottom: number;      // 下边距 mm
  marginLeft: number;        // 左边距 mm
  marginRight: number;       // 右边距 mm
  // 打印偏移（用于校准打印位置，支持负值）
  offsetX: number;           // 水平偏移 mm（正值向右，负值向左）
  offsetY: number;           // 垂直偏移 mm（正值向下，负值向上）
  // 表格设置
  tableWidth: number;        // 表格宽度 (百分比 1-100)
  labelColumnWidth: number;  // 标签列宽度 (百分比 1-50)
  // 字体设置
  titleFontSize: number;     // 标题字号
  labelFontSize: number;     // 标签字号
  valueFontSize: number;     // 值字号
  // 固定内容
  companyName: string;       // 公司名称
  // 显示选项
  showBarcode: boolean;      // 显示材料条形码
  showQrcode: boolean;       // 显示批次二维码
  // 预览缩放
  previewScale: number;
}

// 配置版本号 - 修改默认配置时递增此值，会自动清除旧配置
const CONFIG_VERSION = 4;

// 默认配置
const DEFAULT_LABEL_CONFIG: LabelConfig = {
  labelWidth: 100,
  labelHeight: 100,
  marginTop: 2,
  marginBottom: 2,
  marginLeft: 2,
  marginRight: 2,
  offsetX: 0,
  offsetY: 0,
  tableWidth: 80,  // 降低表格宽度，让内容不超出
  labelColumnWidth: 25,
  titleFontSize: 12,
  labelFontSize: 10,
  valueFontSize: 12,
  companyName: '深圳市颖灿生物科技有限公司',
  showBarcode: false,  // 默认关闭一维条形码，使用双二维码布局
  showQrcode: true,
  previewScale: 1.2
};

// 从 localStorage 加载配置
const loadLabelConfig = (): LabelConfig => {
  try {
    // 检查配置版本
    const savedVersion = localStorage.getItem('labelPrintConfigVersion');
    if (savedVersion !== String(CONFIG_VERSION)) {
      // 版本不匹配，清除旧配置，使用新默认值
      localStorage.removeItem('labelPrintConfig');
      localStorage.setItem('labelPrintConfigVersion', String(CONFIG_VERSION));
      return DEFAULT_LABEL_CONFIG;
    }

    const saved = localStorage.getItem('labelPrintConfig');
    if (saved) {
      return { ...DEFAULT_LABEL_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load label config:', e);
  }
  return DEFAULT_LABEL_CONFIG;
};

// 保存配置到 localStorage
const saveLabelConfig = (config: LabelConfig) => {
  try {
    localStorage.setItem('labelPrintConfig', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save label config:', e);
  }
};

const LabelPrint: React.FC = () => {
  const { materials, fetchMaterials, suppliers, fetchSuppliers } = useMaterialStore();
  const { batches, fetchBatches } = useBatchStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { success, error: showError } = useToast();

  // 选择状态
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  // 新建批次状态
  const [showNewBatchForm, setShowNewBatchForm] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    production_date: new Date().toISOString().split('T')[0],
    quantity: 1
  });

  // 打印数量
  const [printCount, setPrintCount] = useState(1);

  // 标签配置
  const [labelConfig, setLabelConfig] = useState<LabelConfig>(loadLabelConfig);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // 临时编辑数据（打印前可临时修改）
  const [editData, setEditData] = useState<Partial<LabelPrintData>>({});

  // 预览区域引用
  const printRef = useRef<HTMLDivElement>(null);

  // 初始化数据
  useEffect(() => {
    fetchMaterials();
    fetchSuppliers();
    fetchSettings();
  }, [fetchMaterials, fetchSuppliers, fetchSettings]);

  // 当选择物料后，获取该物料的批次
  useEffect(() => {
    if (selectedMaterialId) {
      fetchBatches({ materialId: selectedMaterialId });
      setSelectedBatchId('');
      setEditData({});  // 清空临时编辑
    }
  }, [selectedMaterialId, fetchBatches]);

  // 当选择批次后，清空临时编辑
  useEffect(() => {
    setEditData({});
  }, [selectedBatchId]);

  // 保存配置
  useEffect(() => {
    saveLabelConfig(labelConfig);
  }, [labelConfig]);

  // 获取选中的物料和批次
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const materialBatches = batches.filter(b => b.material_id === selectedMaterialId);

  // 获取供应商信息（优先使用批次中的联表数据）
  const getSupplierInfo = (batch?: typeof selectedBatch): { code: string; name: string } => {
    // 首先尝试从批次的联表数据中获取
    if (batch?.supplier) {
      const supplier = batch.supplier as { id?: string; code?: string; name?: string };
      return {
        code: supplier.code || '-',
        name: supplier.name || '-'
      };
    }

    // 如果批次没有联表的 supplier，尝试通过 supplier_id 从 suppliers 数组中查找
    if (batch?.supplier_id && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === batch.supplier_id);
      if (supplier) {
        return {
          code: supplier.code || '-',
          name: supplier.name || '-'
        };
      }
    }

    return { code: '-', name: '-' };
  };

  // 生成批次号
  const generateBatchNumber = (productionDate: string): string => {
    const date = new Date(productionDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 构建打印数据
  const buildLabelData = (): LabelPrintData | null => {
    if (!selectedMaterial) return null;

    let baseData: LabelPrintData | null = null;

    // 如果有选中的批次，使用批次数据
    if (selectedBatch) {
      const supplierInfo = getSupplierInfo(selectedBatch);
      // 确保 barcode 数据是字符串类型
      const materialCode = String(selectedMaterial.code || '');
      const batchNumber = String(selectedBatch.batch_number || '');

      baseData = {
        company_name: labelConfig.companyName || settings?.company_name || '深圳市颖灿生物科技有限公司',
        supplier_code: supplierInfo.code,
        supplier_name: supplierInfo.name,
        product_name: selectedMaterial.name,
        product_code: selectedMaterial.code,
        weight: selectedMaterial.weight,
        storage_conditions: selectedMaterial.storage_conditions,
        main_ingredients: selectedMaterial.main_ingredients,
        shelf_life: selectedMaterial.shelf_life,
        production_date: selectedBatch.production_date,
        batch_number: batchNumber,
        material_barcode: materialCode,
        batch_barcode: batchNumber
      };
    }

    // 如果是新建批次模式
    if (showNewBatchForm && !baseData) {
      const batchNumber = generateBatchNumber(newBatchData.production_date);
      // 确保 barcode 数据是字符串类型
      const materialCode = String(selectedMaterial.code || '');

      baseData = {
        company_name: labelConfig.companyName || settings?.company_name || '深圳市颖灿生物科技有限公司',
        supplier_code: '-',
        supplier_name: '-',
        product_name: selectedMaterial.name,
        product_code: selectedMaterial.code,
        weight: selectedMaterial.weight,
        storage_conditions: selectedMaterial.storage_conditions,
        main_ingredients: selectedMaterial.main_ingredients,
        shelf_life: selectedMaterial.shelf_life,
        production_date: newBatchData.production_date,
        batch_number: batchNumber,
        material_barcode: materialCode,
        batch_barcode: batchNumber
      };
    }

    if (!baseData) return null;

    // 合并临时编辑数据
    return {
      ...baseData,
      ...editData,
      company_name: editData.company_name || baseData.company_name
    };
  };

  const labelData = buildLabelData();

  // 过滤物料列表
  const filteredMaterials = materials.filter(m => {
    const searchLower = materialSearch.toLowerCase();
    const name = typeof m.name === 'string' ? m.name : String(m.name || '');
    const code = typeof m.code === 'string' ? m.code : String(m.code || '');
    const nameMatch = name.toLowerCase().includes(searchLower);
    const codeMatch = code.toLowerCase().includes(searchLower);
    return nameMatch || codeMatch;
  });

  // 将 Canvas 转换为图片的辅助函数
  const convertCanvasToImages = (container: HTMLElement): string => {
    // 克隆容器以避免修改原始内容
    const clone = container.cloneNode(true) as HTMLElement;

    // 获取原始容器中的所有 canvas
    const originalCanvases = container.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');

    // 将每个 canvas 替换为 img 标签
    originalCanvases.forEach((canvas, index) => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = canvas.getAttribute('style') || '';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';

        const clonedCanvas = clonedCanvases[index];
        if (clonedCanvas && clonedCanvas.parentNode) {
          clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
        }
      } catch (error) {
        console.error('Canvas to image conversion error:', error);
      }
    });

    return clone.innerHTML;
  };

  // 打印功能
  const handlePrint = () => {
    if (!labelData || !printRef.current) {
      showError('请先选择物料和批次');
      return;
    }

    // 将 Canvas 转换为图片后获取 HTML
    const labelHtml = convertCanvasToImages(printRef.current);

    // 创建隐藏的 iframe 进行打印（兼容 Electron）
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDocument) {
      showError('无法创建打印文档');
      document.body.removeChild(printFrame);
      return;
    }

    // 计算实际打印区域尺寸
    const contentWidth = labelConfig.labelWidth - labelConfig.marginLeft - labelConfig.marginRight;
    const contentHeight = labelConfig.labelHeight - labelConfig.marginTop - labelConfig.marginBottom;

    // 构建打印页面
    printDocument.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>打印标签</title>
        <style>
          @page {
            size: ${labelConfig.labelWidth}mm ${labelConfig.labelHeight}mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: SimHei, "Microsoft YaHei", sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            /* 应用打印偏移 */
            padding-top: ${labelConfig.marginTop + labelConfig.offsetY}mm;
            padding-left: ${labelConfig.marginLeft + labelConfig.offsetX}mm;
            padding-right: ${labelConfig.marginRight}mm;
            padding-bottom: ${labelConfig.marginBottom}mm;
          }
          .label-container {
            width: ${contentWidth}mm;
            height: ${contentHeight}mm;
            overflow: hidden;
            page-break-after: always;
          }
          .label-container:last-child {
            page-break-after: auto;
          }
          .label-template {
            width: 100%;
            border: 1px solid #000;
            background: #fff;
            font-size: ${labelConfig.labelFontSize}px;
          }
          table {
            width: ${labelConfig.tableWidth}%;
            border-collapse: collapse;
          }
          td {
            border: 1px solid #000;
            padding: 1mm 2mm;
            font-size: ${labelConfig.labelFontSize}px;
            line-height: 1.2;
          }
          td:first-child {
            width: ${labelConfig.labelColumnWidth}%;
          }
          .text-red-600 {
            color: #000;
          }
          .font-bold {
            font-weight: bold;
          }
          .text-center {
            text-align: center;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          .flex {
            display: flex;
          }
          .justify-center {
            justify-content: center;
          }
          .align-top {
            vertical-align: top;
          }
          .border-b {
            border-bottom: 1px solid #000;
          }
          .border-r {
            border-right: 1px solid #000;
          }
          .px-2 {
            padding-left: 2mm;
            padding-right: 2mm;
          }
          .py-1 {
            padding-top: 1mm;
            padding-bottom: 1mm;
          }
          .py-2 {
            padding-top: 2mm;
            padding-bottom: 2mm;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .label-container {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${Array(printCount).fill(`<div class="label-container">${labelHtml}</div>`).join('')}
      </body>
      </html>
    `);
    printDocument.close();

    // 等待内容加载完成后打印
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        success(`正在打印 ${printCount} 张标签`);
      } catch (err) {
        console.error('Print error:', err);
        showError('打印失败，请重试');
      } finally {
        // 延迟移除 iframe，确保打印对话框已关闭
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }
    }, 500);
  };

  // 下载为 HTML 文件（包含条形码图片）
  const handleDownload = () => {
    if (!printRef.current || !labelData) {
      showError('请先选择物料和批次');
      return;
    }

    const barcodeCanvases = printRef.current.querySelectorAll('canvas');
    if (barcodeCanvases.length === 0) {
      showError('标签数据未加载完成');
      return;
    }

    // 将 Canvas 转换为图片
    const labelHtml = convertCanvasToImages(printRef.current);

    // 创建 Blob 并下载为 HTML 文件
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>标签 - ${labelData.product_code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: SimHei, "Microsoft YaHei", sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f0f0f0;
      padding: 20px;
    }
    .label-template {
      background: #fff;
      border: 2px solid #000;
    }
    table { width: 100%; border-collapse: collapse; }
    td { border: 1px solid #000; padding: 4px 8px; }
    .text-red-600 { color: #dc2626; }
    .font-bold { font-weight: bold; }
    .text-center { text-align: center; }
    img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    .flex { display: flex; }
    .justify-center { justify-content: center; }
    @media print {
      body { background: #fff; padding: 0; }
    }
  </style>
</head>
<body>
  ${labelHtml}
  <script>
    // 提示用户可以直接打印
    console.log('提示：可以按 Ctrl+P 打印此标签');
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `标签_${labelData.product_code}_${labelData.batch_number}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    success('标签已下载为 HTML 文件，可用浏览器打开后打印');
  };

  // 创建新批次
  const handleCreateBatch = async () => {
    if (!selectedMaterial) return;

    try {
      const batchNumber = generateBatchNumber(newBatchData.production_date);

      const { createBatch } = useBatchStore.getState();
      const result = await createBatch({
        material_id: selectedMaterialId,
        batch_number: batchNumber,
        production_date: newBatchData.production_date,
        quantity: newBatchData.quantity,
        remaining_quantity: newBatchData.quantity,
        status: 'available'
      });

      if (result) {
        success('批次创建成功');
        await fetchBatches({ materialId: selectedMaterialId });
        const updatedBatches = useBatchStore.getState().batches;
        const newBatch = updatedBatches.find(b => b.batch_number === batchNumber);
        if (newBatch) {
          setSelectedBatchId(newBatch.id);
        }
        setShowNewBatchForm(false);
      }
    } catch (err) {
      console.error('Create batch error:', err);
      showError('创建批次失败');
    }
  };

  // 重置配置
  const handleResetConfig = () => {
    setLabelConfig(DEFAULT_LABEL_CONFIG);
    success('已恢复默认设置');
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">标签打印</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            选择物料和批次，预览并打印标签
          </p>
        </div>
        <button
          onClick={() => setShowConfigPanel(!showConfigPanel)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showConfigPanel
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Cog6ToothIcon className="h-5 w-5" />
          标签设置
        </button>
      </div>

      {/* 标签设置面板 */}
      {showConfigPanel && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">标签设置</h2>
            <button
              onClick={handleResetConfig}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowPathIcon className="h-4 w-4" />
              恢复默认
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 公司名称 */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                公司名称
              </label>
              <input
                type="text"
                value={labelConfig.companyName}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 标签宽度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标签宽度 (mm)
              </label>
              <input
                type="number"
                min="40"
                max="150"
                value={labelConfig.labelWidth}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, labelWidth: parseInt(e.target.value) || 100 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 标签高度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标签高度 (mm)
              </label>
              <input
                type="number"
                min="40"
                max="200"
                value={labelConfig.labelHeight}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, labelHeight: parseInt(e.target.value) || 100 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 表格宽度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                表格宽度 (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={labelConfig.tableWidth}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, tableWidth: parseInt(e.target.value) || 100 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 标签列宽度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标签列宽 (%)
              </label>
              <input
                type="number"
                min="15"
                max="50"
                value={labelConfig.labelColumnWidth}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, labelColumnWidth: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 打印边距分组 */}
            <div className="lg:col-span-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">打印边距 (mm)</h3>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">上边距</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={labelConfig.marginTop}
                    onChange={(e) => setLabelConfig(prev => ({ ...prev, marginTop: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">下边距</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={labelConfig.marginBottom}
                    onChange={(e) => setLabelConfig(prev => ({ ...prev, marginBottom: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">左边距</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={labelConfig.marginLeft}
                    onChange={(e) => setLabelConfig(prev => ({ ...prev, marginLeft: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">右边距</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={labelConfig.marginRight}
                    onChange={(e) => setLabelConfig(prev => ({ ...prev, marginRight: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 打印偏移校准 */}
            <div className="lg:col-span-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">打印位置校准 (mm)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                如果打印内容对不齐标签纸，可调整偏移量。负值向上/左移动，正值向下/右移动。
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    水平偏移 (X)
                    <span className="ml-1 text-gray-400">← 负值 | 正值 →</span>
                  </label>
                  <input
                    type="number"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={labelConfig.offsetX}
                    onChange={(e) => setLabelConfig(prev => ({ ...prev, offsetX: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    垂直偏移 (Y)
                    <span className="ml-1 text-gray-400">↑ 负值 | 正值 ↓</span>
                  </label>
                  <input
                    type="number"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={labelConfig.offsetY}
                    onChange={(e) => setLabelConfig(prev => ({ ...prev, offsetY: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 标题字号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标题字号 (px)
              </label>
              <input
                type="number"
                min="10"
                max="24"
                value={labelConfig.titleFontSize}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, titleFontSize: parseInt(e.target.value) || 14 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 标签字号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标签字号 (px)
              </label>
              <input
                type="number"
                min="8"
                max="18"
                value={labelConfig.labelFontSize}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, labelFontSize: parseInt(e.target.value) || 12 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 数值字号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                数值字号 (px)
              </label>
              <input
                type="number"
                min="10"
                max="24"
                value={labelConfig.valueFontSize}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, valueFontSize: parseInt(e.target.value) || 16 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 预览缩放 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                预览缩放
              </label>
              <select
                value={labelConfig.previewScale}
                onChange={(e) => setLabelConfig(prev => ({ ...prev, previewScale: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="0.8">80%</option>
                <option value="1">100%</option>
                <option value="1.2">120%</option>
                <option value="1.5">150%</option>
              </select>
            </div>

            {/* 显示选项 */}
            <div className="lg:col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={labelConfig.showBarcode}
                  onChange={(e) => setLabelConfig(prev => ({ ...prev, showBarcode: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">显示材料条形码</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={labelConfig.showQrcode}
                  onChange={(e) => setLabelConfig(prev => ({ ...prev, showQrcode: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">显示批次二维码</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：选择和配置 */}
        <div className="space-y-6">
          {/* 物料选择 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              选择物料
            </h2>

            <div className="relative">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={materialSearch}
                  onChange={(e) => {
                    setMaterialSearch(e.target.value);
                    setShowMaterialDropdown(true);
                  }}
                  onFocus={() => setShowMaterialDropdown(true)}
                  placeholder="搜索物料名称或编码..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {showMaterialDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredMaterials.length === 0 ? (
                    <div className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      未找到匹配的物料
                    </div>
                  ) : (
                    filteredMaterials.map(material => (
                      <button
                        key={material.id}
                        onClick={() => {
                          setSelectedMaterialId(material.id);
                          setMaterialSearch(material.name);
                          setShowMaterialDropdown(false);
                          setShowNewBatchForm(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 ${
                          selectedMaterialId === material.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {material.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          编码: {material.code}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 已选物料信息 */}
            {selectedMaterial && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">名称：</span>
                    <span className="text-gray-900 dark:text-white">{selectedMaterial.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">编码：</span>
                    <span className="text-gray-900 dark:text-white">{selectedMaterial.code}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">重量：</span>
                    <span className="text-gray-900 dark:text-white">{selectedMaterial.weight || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">保质期：</span>
                    <span className="text-gray-900 dark:text-white">{selectedMaterial.shelf_life || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 批次选择 */}
          {selectedMaterial && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  选择批次
                </h2>
                <button
                  onClick={() => {
                    setShowNewBatchForm(true);
                    setSelectedBatchId('');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  新建批次
                </button>
              </div>

              {/* 现有批次列表 */}
              {materialBatches.length > 0 && !showNewBatchForm && (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {materialBatches.map(batch => {
                    const batchSupplier = getSupplierInfo(batch);
                    return (
                      <button
                        key={batch.id}
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setShowNewBatchForm(false);
                        }}
                        className={`w-full p-3 text-left border rounded-lg transition-colors ${
                          selectedBatchId === batch.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            批次号: {batch.batch_number}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            库存: {batch.remaining_quantity}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>生产日期: {batch.production_date || '-'}</span>
                          <span>供应商: {batchSupplier.code !== '-' ? batchSupplier.code : (batchSupplier.name !== '-' ? batchSupplier.name : '-')}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 新建批次表单 */}
              {showNewBatchForm && (
                <div className="space-y-4 p-4 border border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="font-medium text-gray-900 dark:text-white">新建批次</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      生产日期
                    </label>
                    <input
                      type="date"
                      value={newBatchData.production_date}
                      onChange={(e) => setNewBatchData(prev => ({ ...prev, production_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      生产批号（自动生成）
                    </label>
                    <input
                      type="text"
                      value={generateBatchNumber(newBatchData.production_date)}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      数量
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newBatchData.quantity}
                      onChange={(e) => setNewBatchData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateBatch}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      创建并选择
                    </button>
                    <button
                      onClick={() => setShowNewBatchForm(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {materialBatches.length === 0 && !showNewBatchForm && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>该物料暂无批次记录</p>
                  <p className="text-sm mt-1">点击"新建批次"创建</p>
                </div>
              )}
            </div>
          )}

          {/* 临时编辑（打印前调整） */}
          {labelData && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                临时编辑
                <span className="ml-2 text-sm font-normal text-gray-500">（仅影响本次打印）</span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    重量
                  </label>
                  <input
                    type="text"
                    value={editData.weight ?? labelData.weight ?? ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder={labelData.weight || '如：0.18KG'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    保质期
                  </label>
                  <input
                    type="text"
                    value={editData.shelf_life ?? labelData.shelf_life ?? ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, shelf_life: e.target.value }))}
                    placeholder={labelData.shelf_life || '如：12个月'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    储存条件
                  </label>
                  <input
                    type="text"
                    value={editData.storage_conditions ?? labelData.storage_conditions ?? ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, storage_conditions: e.target.value }))}
                    placeholder={labelData.storage_conditions || '如：阴凉干燥处保存'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    主要成份
                  </label>
                  <input
                    type="text"
                    value={editData.main_ingredients ?? labelData.main_ingredients ?? ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, main_ingredients: e.target.value }))}
                    placeholder={labelData.main_ingredients || '主要成份'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>

                {Object.keys(editData).length > 0 && (
                  <div className="col-span-2">
                    <button
                      onClick={() => setEditData({})}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      清除临时修改
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 打印设置 */}
          {labelData && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                打印设置
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    打印数量
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={printCount}
                    onChange={(e) => setPrintCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PrinterIcon className="h-5 w-5" />
                    打印标签
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    下载
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：预览区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              标签预览
            </h2>
            {labelData && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {labelConfig.labelWidth}mm × {labelConfig.labelHeight}mm
              </span>
            )}
          </div>

          <div className="flex justify-center items-start min-h-[500px] bg-gray-100 dark:bg-gray-700 rounded-lg p-4 overflow-auto">
            {labelData ? (
              <div ref={printRef}>
                <LabelPrintTemplate
                  data={labelData}
                  config={labelConfig}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <PrinterIcon className="h-16 w-16 mb-4 opacity-50" />
                <p>请先选择物料和批次</p>
                <p className="text-sm mt-1">选择后将在此处显示标签预览</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 点击其他区域关闭下拉 */}
      {showMaterialDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMaterialDropdown(false)}
        />
      )}
    </div>
  );
};

export default LabelPrint;

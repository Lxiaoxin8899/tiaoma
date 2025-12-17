import React, { useState, useEffect, useRef } from 'react';
import { useMaterialStore } from '../../stores/materialStore';
import { useBatchStore } from '../../stores/batchStore';
import BarcodeViewer from './BarcodeViewer';
import {
    MagnifyingGlassIcon,
    PrinterIcon,
    ArrowDownTrayIcon,
    QrCodeIcon,
    Bars3Icon, // Using similar icon for barcode
} from '@heroicons/react/24/outline';

const BarcodeGeneratorRedesigned: React.FC = () => {
    // Store hooks
    const {
        materials,
        loading: materialsLoading,
        totalItems: totalMaterials,
        totalPages: materialPages,
        currentPage: materialPage,
        fetchMaterials
    } = useMaterialStore();

    const {
        batches,
        loading: batchesLoading,
        totalCount: totalBatches,
        currentPage: batchPage,
        pageSize: batchPageSize,
        fetchBatches
    } = useBatchStore();

    // Local state
    const [activeTab, setActiveTab] = useState<'material' | 'batch' | 'custom'>('material');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<{ type: 'material' | 'batch', id: string, code: string, name: string } | null>(null);
    const [customCode, setCustomCode] = useState('');

    // Barcode config
    const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>('barcode');
    const [showValue, setShowValue] = useState(true);

    // Debounce search
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 说明：用于定位预览区域的 canvas，避免 document.querySelector 误选到其他 canvas（例如图表等）。
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 说明：搜索采用防抖，避免每次输入都触发请求；Tab 切换也会复用同一套逻辑。
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        const delayMs = searchQuery ? 500 : 0;
        searchTimeoutRef.current = setTimeout(() => {
            if (activeTab === 'material') {
                fetchMaterials({ page: 1, limit: 15, search: searchQuery });
            } else if (activeTab === 'batch') {
                fetchBatches({ page: 1, limit: 15, search: searchQuery });
            }
        }, delayMs);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [activeTab, searchQuery, fetchBatches, fetchMaterials]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handlePageChange = (newPage: number) => {
        if (activeTab === 'material') {
            fetchMaterials({ page: newPage, limit: 15, search: searchQuery });
        } else if (activeTab === 'batch') {
            fetchBatches({ page: newPage, limit: 15, search: searchQuery });
        }
    };

    const getDisplayValue = () => {
        if (activeTab === 'custom') return customCode;
        return selectedItem?.code || '';
    };

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
        const value = getDisplayValue();
        if (!value) return;

        const canvas = previewRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
        if (!canvas) return;

        // 说明：使用 noopener/noreferrer，避免打印窗口意外获取 opener 引用导致的安全风险。
        const printWindow = window.open('', '_blank', 'noopener,noreferrer');
        if (!printWindow) return;

        const dataUrl = canvas.toDataURL('image/png', 1.0);
        // 说明：标签尺寸做近似（业务可根据实际打印机/标签纸再微调）。
        const printWidth = codeType === 'barcode' ? 300 : 200;

        const doc = printWindow.document;
        // 说明：写入固定骨架，再通过 title/textContent 等设置动态内容，避免 XSS 注入。
        doc.open();
        doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
        doc.close();

        doc.title = `打印条码 - ${value}`;

        const style = doc.createElement('style');
        style.textContent = `
            @page { size: auto; margin: 0; }
            body {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            img { width: ${printWidth}px; max-width: 100%; }
            .label { margin-top: 10px; font-family: sans-serif; font-size: 14px; }
        `;
        doc.head.appendChild(style);

        const img = doc.createElement('img');
        img.src = dataUrl;
        img.alt = value;
        doc.body.appendChild(img);

        if (showValue && codeType === 'qrcode') {
            const label = doc.createElement('div');
            label.className = 'label';
            label.textContent = value;
            doc.body.appendChild(label);
        }

        // 说明：等待图片加载完成再触发打印，避免出现空白页。
        img.onload = () => {
            setTimeout(() => {
                try {
                    printWindow.focus();
                    printWindow.print();
                } finally {
                    printWindow.close();
                }
            }, 200);
        };
    };

    const handleDownload = () => {
        const value = getDisplayValue();
        if (!value) return;

        const canvas = previewRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `barcode-${sanitizeFilename(value)}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    };

    return (
        <div className="bg-gray-50 h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4">
            {/* Left Pane: Search & List */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                {/* Header / Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex">
                        <button
                            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'material' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('material')}
                        >
                            物料列表
                        </button>
                        <button
                            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'batch' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('batch')}
                        >
                            批次列表
                        </button>
                        <button
                            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'custom' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => {
                                setActiveTab('custom');
                                setSelectedItem(null);
                            }}
                        >
                            自定义输入
                        </button>
                    </div>

                    {/* Search Bar (Only for Material/Batch) */}
                    {activeTab !== 'custom' && (
                        <div className="p-3 border-b border-gray-100 bg-gray-50">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder={activeTab === 'material' ? "搜索物料编码、名称..." : "搜索批次号、物料名称..."}
                                    value={searchQuery}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto">
                    {activeTab === 'material' && (
                        <div className="min-w-full inline-block align-middle">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">编码</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/3">名称</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">规格</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">当前库存</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {materialsLoading ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">加载中...</td></tr>
                                    ) : materials.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">无数据</td></tr>
                                    ) : (
                                        materials.map((material) => (
                                            <tr
                                                key={material.id}
                                                onClick={() => setSelectedItem({ type: 'material', id: material.id, code: material.code, name: material.name })}
                                                className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedItem?.id === material.id ? 'bg-blue-100 ring-1 ring-inset ring-blue-500' : ''}`}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{material.code}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{material.name}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{material.specification || '-'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right font-mono">{material.current_stock} <span className="text-gray-400 text-xs ml-1">{material.unit_obj?.name}</span></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'batch' && (
                        <div className="min-w-full inline-block align-middle">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/3">批次号</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/3">物料</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">数量</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">有效期</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {batchesLoading ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">加载中...</td></tr>
                                    ) : batches.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">无数据</td></tr>
                                    ) : (
                                        batches.map((batch) => (
                                            <tr
                                                key={batch.id}
                                                onClick={() => setSelectedItem({ type: 'batch', id: batch.id, code: batch.batch_number, name: batch.material?.name || '未知物料' })}
                                                className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedItem?.id === batch.id ? 'bg-blue-100 ring-1 ring-inset ring-blue-500' : ''}`}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{batch.batch_number}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                    <div className="flex flex-col">
                                                        <span>{batch.material?.name}</span>
                                                        <span className="text-xs text-gray-400 font-mono">{batch.material?.code}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{batch.quantity}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'custom' && (
                        <div className="p-8 flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <p>请输入右侧的自定义内容</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Pagination */}
                {activeTab !== 'custom' && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => handlePageChange((activeTab === 'material' ? materialPage : batchPage) - 1)}
                                    disabled={(activeTab === 'material' ? materialPage : batchPage) === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    上一页
                                </button>
                                <button
                                    onClick={() => handlePageChange((activeTab === 'material' ? materialPage : batchPage) + 1)}
                                    disabled={(activeTab === 'material' ? materialPage : batchPage) >= (activeTab === 'material' ? materialPages : Math.ceil(totalBatches / batchPageSize))}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    下一页
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        显示 <span className="font-medium">{((activeTab === 'material' ? materialPage : batchPage) - 1) * 15 + 1}</span> 到 <span className="font-medium">{Math.min((activeTab === 'material' ? materialPage : batchPage) * 15, activeTab === 'material' ? totalMaterials : totalBatches)}</span> 条，
                                        共 <span className="font-medium">{activeTab === 'material' ? totalMaterials : totalBatches}</span> 条
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => handlePageChange((activeTab === 'material' ? materialPage : batchPage) - 1)}
                                            disabled={(activeTab === 'material' ? materialPage : batchPage) === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            上一页
                                        </button>
                                        <button
                                            onClick={() => handlePageChange((activeTab === 'material' ? materialPage : batchPage) + 1)}
                                            disabled={(activeTab === 'material' ? materialPage : batchPage) >= (activeTab === 'material' ? materialPages : Math.ceil(totalBatches / batchPageSize))}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            下一页
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Pane: Preview & Actions */}
            <div className="w-full md:w-96 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">条码预览</h3>

                {/* Input Area for Custom Mode */}
                {activeTab === 'custom' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">自定义内容</label>
                        <input
                            type="text"
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="请输入..."
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}

                {/* Selected Item Detail */}
                {activeTab !== 'custom' && selectedItem && (
                    <div className="mb-4 bg-blue-50 p-3 rounded-md">
                        <p className="text-sm font-medium text-blue-900">{selectedItem.name}</p>
                        <p className="text-xs text-blue-700 mt-1 font-mono">{selectedItem.code}</p>
                    </div>
                )}

                {/* Preview Area */}
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 mb-6 bg-gray-50 min-h-[200px]">
                    {getDisplayValue() ? (
                        <>
                            <div ref={previewRef} className="bg-white p-4 rounded shadow-sm mb-4">
                                <BarcodeViewer
                                    value={getDisplayValue()}
                                    type={codeType}
                                    showValue={showValue}
                                />
                            </div>
                            <p className="text-sm text-gray-500 font-mono break-all text-center">{getDisplayValue()}</p>
                        </>
                    ) : (
                        <div className="text-center text-gray-400">
                            <QrCodeIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-sm">{activeTab === 'custom' ? '请输入内容' : '请从左侧选择一项'}</p>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="space-y-4">
                    {/* Code Type */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setCodeType('barcode')}
                            className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium ${codeType === 'barcode' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            <div className="rotate-90 mr-2"><Bars3Icon className="h-4 w-4" /></div>
                            一维码
                        </button>
                        <button
                            onClick={() => setCodeType('qrcode')}
                            className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium ${codeType === 'qrcode' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            <QrCodeIcon className="mr-2 h-4 w-4" />
                            二维码
                        </button>
                    </div>

                    {/* Options */}
                    {codeType === 'barcode' && (
                        <label className="flex items-center space-x-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                className="rounded text-blue-600 focus:ring-blue-500"
                                checked={showValue}
                                onChange={(e) => setShowValue(e.target.checked)}
                            />
                            <span>显示底部文本</span>
                        </label>
                    )}

                    <hr className="border-gray-200" />

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handlePrint}
                            disabled={!getDisplayValue()}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PrinterIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                            打印
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={!getDisplayValue()}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                            下载
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarcodeGeneratorRedesigned;

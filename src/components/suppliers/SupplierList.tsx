import React, { useState, useEffect } from 'react';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useSupplierStore } from '../../stores/supplierStore';
import { Supplier } from '../../types/database';
import { useToast } from '../common/Toast';
import { exportToExcel, getDateSuffix, downloadSupplierTemplate } from '../../lib/exportUtils';
import { validateSupplierData } from '../../lib/importUtils';
import SupplierForm from './SupplierForm';
import ImportModal from '../common/ImportModal';
import { supabase } from '../../lib/supabase';

const SupplierList: React.FC = () => {
  const { 
    suppliers, 
    loading, 
    error,
    fetchSuppliers, 
    deleteSupplier,
    setError
  } = useSupplierStore();
  const { success } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // 获取物料数据
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // 过滤供应商
  const filteredSuppliers = suppliers.filter(supplier => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
                         supplier.name.toLowerCase().includes(searchLower) ||
                         supplier.code.toLowerCase().includes(searchLower) ||
                         supplier.contact_person?.toLowerCase().includes(searchLower) ||
                         String(supplier.phone || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 分页数据
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // 处理状态筛选
  const handleStatusFilter = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // 处理刷新
  const handleRefresh = async () => {
    await fetchSuppliers();
    success('供应商数据已刷新');
  };

  // 处理编辑
  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  // 处理删除
  const handleDelete = (supplier: Supplier) => {
    setDeleteConfirm(supplier);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        const result = await deleteSupplier(deleteConfirm.id);
        if (result) {
          success('供应商删除成功');
        }
      } catch (error) {
        console.error('Delete error:', error);
      } finally {
        setDeleteConfirm(null);
      }
    }
  };

  // 关闭表单
  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedSupplier(undefined);
  };

  // 表单成功回调
  const handleFormSuccess = () => {
    handleFormClose();
    success(selectedSupplier ? '供应商更新成功' : '供应商创建成功');
  };

  // 清除错误
  const clearError = () => {
    setError(null);
  };

  // 导出供应商数据
  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (suppliers.length === 0) {
        return;
      }

      // 定义列映射
      const columnMap = {
        'code': '供应商编码',
        'name': '供应商名称',
        'contact_person': '联系人',
        'phone': '联系电话',
        'email': '邮箱',
        'address': '地址',
        'status': '状态',
        'created_at': '创建时间',
        'updated_at': '更新时间'
      };

      // 生成文件名
      const filename = `供应商列表_${getDateSuffix()}`;

      // 导出数据
      exportToExcel(suppliers, filename, '供应商列表', columnMap);

      success('数据已导出成功');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '导出失败';
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  // 处理导入
  const handleImport = async (data: unknown[]) => {
    let successCount = 0;
    let failedCount = 0;

    for (const item of data) {
      try {
        const supplierData = item as Partial<Supplier>;

        // 插入供应商数据
        const { error } = await supabase
          .from('suppliers')
          .insert([supplierData]);

        if (error) {
          console.error('导入供应商失败:', error);
          failedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('处理供应商数据失败:', error);
        failedCount++;
      }
    }

    // 刷新供应商列表
    await fetchSuppliers();

    return { success: successCount, failed: failedCount };
  };

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">供应商管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            管理供应商信息，包括联系方式和状态。
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-3">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:w-auto"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            批量导入
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || suppliers.length === 0}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            {isExporting ? '导出中...' : '导出'}
          </button>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            添加供应商
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">搜索</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              name="search"
              id="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="搜索供应商名称、编码、联系人或电话..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="status-filter" className="sr-only">状态筛选</label>
          <select
            id="status-filter"
            name="status-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">所有状态</option>
            <option value="active">正常</option>
            <option value="inactive">停用</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          刷新
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                操作失败
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    onClick={clearError}
                    className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                  >
                    知道了
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 供应商表格 */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      供应商编码
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      供应商名称
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      联系人
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      联系电话
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      状态
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : currentSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                        {searchTerm || statusFilter !== 'all' ? '没有找到匹配的供应商' : '暂无供应商数据'}
                      </td>
                    </tr>
                  ) : (
                    currentSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {supplier.code}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {supplier.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {supplier.contact_person || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {supplier.phone || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            supplier.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {supplier.status === 'active' ? '正常' : '停用'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text:pr-6-sm font-medium sm">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(supplier)}
                            className="text-red-600 hover:text-red-900"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                显示第 <span className="font-medium">{indexOfFirstItem + 1}</span> 到{' '}
                <span className="font-medium">{Math.min(indexOfLastItem, filteredSuppliers.length)}</span> 条，
                共 <span className="font-medium">{filteredSuppliers.length}</span> 条记录
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 供应商表单模态框 */}
      {isFormOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleFormClose}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <SupplierForm
                initialData={selectedSupplier}
                onSuccess={handleFormSuccess}
                onCancel={handleFormClose}
              />
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setDeleteConfirm(null)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    删除供应商
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      您确定要删除供应商 <strong>{deleteConfirm.name}</strong> 吗？此操作不可撤销。
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  删除
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导入模态框 */}
      {showImportModal && (
        <ImportModal
          title="批量导入供应商"
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          onDownloadTemplate={downloadSupplierTemplate}
          validateData={validateSupplierData}
          templateFields={['code', 'name', 'contact_person', 'phone', 'email', 'address', 'status']}
        />
      )}
    </div>
  );
};

export default SupplierList;

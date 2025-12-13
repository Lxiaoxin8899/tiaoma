import React from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon 
} from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  className?: string;
  pageSize?: number; // Add optional props to match usage
  totalItems?: number; // Add optional props to match usage
  onPageSizeChange?: (size: number) => void; // Add optional props to match usage
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
  showFirstLast = true,
  showPrevNext = true,
  className = '',
  pageSize,
  totalItems,
  onPageSizeChange
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: number[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between ${className}`}>
      <div className="flex items-center space-x-2">
        {/* 首页按钮 */}
        {showFirstLast && currentPage > 1 && (
          <button
            onClick={() => handlePageClick(1)}
            className="px-2 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={currentPage === 1}
            title="首页"
          >
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          </button>
        )}

        {/* 上一页按钮 */}
        {showPrevNext && (
          <button
            onClick={() => handlePageClick(currentPage - 1)}
            className="px-2 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={currentPage === 1}
            title="上一页"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        )}

        {/* 页码按钮 */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => handlePageClick(page)}
            className={`
              px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
              }
            `}
          >
            {page}
          </button>
        ))}

        {/* 下一页按钮 */}
        {showPrevNext && (
          <button
            onClick={() => handlePageClick(currentPage + 1)}
            className="px-2 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={currentPage === totalPages}
            title="下一页"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}

        {/* 尾页按钮 */}
        {showFirstLast && currentPage < totalPages && (
          <button
            onClick={() => handlePageClick(totalPages)}
            className="px-2 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={currentPage === totalPages}
            title="尾页"
          >
            <ChevronDoubleRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* 附加信息和控制 */}
      {(totalItems !== undefined || pageSize !== undefined) && (
        <div className="mt-4 sm:mt-0 flex items-center text-sm text-gray-500 space-x-4">
          {totalItems !== undefined && (
            <span>共 {totalItems} 条记录</span>
          )}
          {pageSize !== undefined && onPageSizeChange && (
            <div className="flex items-center">
              <span className="mr-2">每页:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="block w-full pl-2 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Pagination;

import * as XLSX from 'xlsx';
import { Material, Supplier } from '../types/database';

// 导入验证错误类型
export interface ImportError {
  row: number;
  field: string;
  value: unknown;
  message: string;
}

// 导入结果类型
export interface ImportResult<T> {
  validData: T[];
  errors: ImportError[];
  totalRows: number;
}

// 物料导入数据类型
export interface MaterialImportRow {
  '物料编码': string;
  '物料名称': string;
  '规格型号': string;
  '单位': string;
  '分类': string;
  '当前库存': string | number;
  '最小库存': string | number;
  '最大库存': string | number;
  '状态': string;
}

// 供应商导入数据类型
export interface SupplierImportRow {
  '供应商编码': string;
  '供应商名称': string;
  '联系人': string;
  '联系电话': string;
  '邮箱': string;
  '地址': string;
  '状态': string;
}

/**
 * 解析 Excel 文件
 */
export const parseExcelFile = async (file: File): Promise<unknown[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 转换为 JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('解析 Excel 文件失败：' + (error instanceof Error ? error.message : '未知错误')));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * 验证物料数据
 */
export const validateMaterialData = (
  rows: unknown[],
  categories: { id: string; name: string }[],
  units: { id: string; name: string; symbol?: string }[]
): ImportResult<Partial<Material>> => {
  const validData: Partial<Material>[] = [];
  const errors: ImportError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel 行号（从第2行开始，因为第1行是表头）
    const data = row as MaterialImportRow;

    const rowErrors: ImportError[] = [];

    // 验证必填字段
    if (!data['物料编码']) {
      rowErrors.push({
        row: rowNum,
        field: '物料编码',
        value: data['物料编码'],
        message: '物料编码不能为空'
      });
    }

    if (!data['物料名称']) {
      rowErrors.push({
        row: rowNum,
        field: '物料名称',
        value: data['物料名称'],
        message: '物料名称不能为空'
      });
    }

    if (!data['单位']) {
      rowErrors.push({
        row: rowNum,
        field: '单位',
        value: data['单位'],
        message: '单位不能为空'
      });
    }

    if (!data['分类']) {
      rowErrors.push({
        row: rowNum,
        field: '分类',
        value: data['分类'],
        message: '分类不能为空'
      });
    }

    // 验证分类是否存在
    const category = categories.find(c => c.name === data['分类']);
    if (data['分类'] && !category) {
      rowErrors.push({
        row: rowNum,
        field: '分类',
        value: data['分类'],
        message: '分类不存在'
      });
    }

    // 验证单位是否存在
    const unit = units.find(u => u.name === data['单位'] || u.symbol === data['单位']);
    if (data['单位'] && !unit) {
      rowErrors.push({
        row: rowNum,
        field: '单位',
        value: data['单位'],
        message: '单位不存在'
      });
    }

    // 验证库存数字
    const currentStock = parseFloat(String(data['当前库存'] || 0));
    const minStock = parseFloat(String(data['最小库存'] || 0));
    const maxStock = parseFloat(String(data['最大库存'] || 0));

    if (isNaN(currentStock)) {
      rowErrors.push({
        row: rowNum,
        field: '当前库存',
        value: data['当前库存'],
        message: '当前库存必须是数字'
      });
    }

    if (isNaN(minStock)) {
      rowErrors.push({
        row: rowNum,
        field: '最小库存',
        value: data['最小库存'],
        message: '最小库存必须是数字'
      });
    }

    if (isNaN(maxStock)) {
      rowErrors.push({
        row: rowNum,
        field: '最大库存',
        value: data['最大库存'],
        message: '最大库存必须是数字'
      });
    }

    if (!isNaN(minStock) && !isNaN(maxStock) && minStock > maxStock) {
      rowErrors.push({
        row: rowNum,
        field: '库存',
        value: `${minStock}/${maxStock}`,
        message: '最小库存不能大于最大库存'
      });
    }

    // 验证状态
    const statusMap: { [key: string]: 'active' | 'inactive' | 'discontinued' } = {
      '可用': 'active',
      '启用': 'active',
      '正常': 'active',
      'active': 'active',
      '停用': 'inactive',
      'inactive': 'inactive',
      '报废': 'discontinued',
      'discontinued': 'discontinued'
    };

    const status = statusMap[data['状态'] || '可用'] || 'active';
    if (data['状态'] && !statusMap[data['状态']]) {
      rowErrors.push({
        row: rowNum,
        field: '状态',
        value: data['状态'],
        message: '状态值无效，应为：可用、停用或报废'
      });
    }

    // 如果有错误，记录错误
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      // 构造有效数据
      validData.push({
        code: data['物料编码'],
        name: data['物料名称'],
        specification: data['规格型号'] || '',
        unit: data['单位'],
        unit_id: unit?.id,
        category_id: category?.id || '',
        current_stock: currentStock,
        min_stock: minStock,
        max_stock: maxStock,
        status: status,
        created_by: '', // 将在保存时设置
        updated_by: ''  // 将在保存时设置
      });
    }
  });

  return {
    validData,
    errors,
    totalRows: rows.length
  };
};

/**
 * 验证供应商数据
 */
export const validateSupplierData = (rows: unknown[]): ImportResult<Partial<Supplier>> => {
  const validData: Partial<Supplier>[] = [];
  const errors: ImportError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel 行号（从第2行开始，因为第1行是表头）
    const data = row as SupplierImportRow;

    const rowErrors: ImportError[] = [];

    // 验证必填字段
    if (!data['供应商编码']) {
      rowErrors.push({
        row: rowNum,
        field: '供应商编码',
        value: data['供应商编码'],
        message: '供应商编码不能为空'
      });
    }

    if (!data['供应商名称']) {
      rowErrors.push({
        row: rowNum,
        field: '供应商名称',
        value: data['供应商名称'],
        message: '供应商名称不能为空'
      });
    }

    // 验证邮箱格式（如果提供）
    if (data['邮箱']) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data['邮箱'])) {
        rowErrors.push({
          row: rowNum,
          field: '邮箱',
          value: data['邮箱'],
          message: '邮箱格式不正确'
        });
      }
    }

    // 验证电话格式（如果提供）
    if (data['联系电话']) {
      const phoneRegex = /^[\d\s\-()]+$/;
      if (!phoneRegex.test(data['联系电话'])) {
        rowErrors.push({
          row: rowNum,
          field: '联系电话',
          value: data['联系电话'],
          message: '联系电话格式不正确'
        });
      }
    }

    // 验证状态
    const statusMap: { [key: string]: 'active' | 'inactive' } = {
      '正常': 'active',
      '启用': 'active',
      '可用': 'active',
      'active': 'active',
      '停用': 'inactive',
      'inactive': 'inactive'
    };

    const status = statusMap[data['状态'] || '正常'] || 'active';
    if (data['状态'] && !statusMap[data['状态']]) {
      rowErrors.push({
        row: rowNum,
        field: '状态',
        value: data['状态'],
        message: '状态值无效，应为：正常或停用'
      });
    }

    // 如果有错误，记录错误
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      // 构造有效数据
      validData.push({
        code: data['供应商编码'],
        name: data['供应商名称'],
        contact_person: data['联系人'] || '',
        phone: data['联系电话'] || '',
        email: data['邮箱'] || '',
        address: data['地址'] || '',
        status: status
      });
    }
  });

  return {
    validData,
    errors,
    totalRows: rows.length
  };
};

/**
 * 导出错误报告为 Excel 文件
 */
export const exportErrorReport = (errors: ImportError[], fileName: string = '导入错误报告.xlsx') => {
  const errorData = errors.map(error => ({
    '行号': error.row,
    '字段': error.field,
    '值': error.value,
    '错误信息': error.message
  }));

  const ws = XLSX.utils.json_to_sheet(errorData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '错误报告');
  XLSX.writeFile(wb, fileName);
};

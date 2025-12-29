import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
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

// 导入文件限制（防止超大文件/超大表格导致卡死）
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_COLUMNS = 50;
const MAX_ROWS = 5000; // 不含表头

/**
 * 将 Excel 单元格值规整为“可展示/可校验”的基础类型
 * 说明：这里不执行公式，只取文本/结果，避免出现奇怪对象导致校验异常。
 */
function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  // exceljs 的公式/富文本等会落到对象，这里尽量提取可读信息
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if ('text' in v && typeof v.text === 'string') return v.text;
    if ('result' in v) return normalizeCellValue(v.result);
    if ('formula' in v && typeof v.formula === 'string') return v.formula;
  }

  return String(value);
}

/**
 * 解析 Excel 文件（仅支持 .xlsx）
 */
export const parseExcelFile = async (file: File): Promise<unknown[]> => {
  if (!file) throw new Error('未选择文件');

  // 说明：exceljs 仅支持 xlsx，这里明确拦截 .xls 以免用户误以为“导入成功但数据异常”
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('文件格式不支持：仅支持 .xlsx（不支持 .xls）');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`文件过大：请上传不超过 ${Math.floor(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB 的 Excel 文件`);
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer);

    if (workbook.worksheets.length === 0) {
      throw new Error('Excel 文件中未找到工作表');
    }

    // 说明：按现有业务逻辑仅读取第一个工作表
    const worksheet = workbook.worksheets[0];

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    // 说明：exceljs 的 row.values 是从索引 1 开始，这里按 cellCount 遍历更直观
    const headerCellCount = Math.min(headerRow.cellCount, MAX_COLUMNS);
    for (let i = 1; i <= headerCellCount; i++) {
      const raw = headerRow.getCell(i).value;
      const text = String(normalizeCellValue(raw) ?? '').trim();
      headers.push(text);
    }

    // 去掉尾部空标题
    while (headers.length > 0 && !headers[headers.length - 1]) headers.pop();

    if (headers.length === 0) {
      throw new Error('未找到表头：请确保第 1 行是标题行');
    }
    if (headers.length > MAX_COLUMNS) {
      throw new Error(`列数过多：最多支持 ${MAX_COLUMNS} 列`);
    }

    const rows: Record<string, unknown>[] = [];
    const lastRow = Math.min(worksheet.rowCount, MAX_ROWS + 1); // +1 表头

    for (let rowIndex = 2; rowIndex <= lastRow; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const record: Record<string, unknown> = {};
      let hasAnyValue = false;

      for (let colIndex = 1; colIndex <= headers.length; colIndex++) {
        const header = headers[colIndex - 1];
        if (!header) continue;

        const cellValue = normalizeCellValue(row.getCell(colIndex).value);
        const normalized = typeof cellValue === 'string' ? cellValue.trim() : cellValue;

        if (normalized !== '' && normalized !== null && normalized !== undefined) {
          hasAnyValue = true;
        }

        record[header] = normalized;
      }

      // 说明：跳过全空行
      if (!hasAnyValue) continue;

      rows.push(record);
      if (rows.length >= MAX_ROWS) {
        throw new Error(`数据行过多：最多支持 ${MAX_ROWS} 行（不含表头）`);
      }
    }

    return rows;
  } catch (error) {
    throw new Error('解析 Excel 文件失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
};

/**
 * 验证物料数据
 */
export const validateMaterialData = (
  rows: unknown[],
  categories: { id: string; name: string }[],
  units: { id: string; name: string; symbol?: string }[],
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
        message: '物料编码不能为空',
      });
    }

    if (!data['物料名称']) {
      rowErrors.push({
        row: rowNum,
        field: '物料名称',
        value: data['物料名称'],
        message: '物料名称不能为空',
      });
    }

    if (!data['单位']) {
      rowErrors.push({
        row: rowNum,
        field: '单位',
        value: data['单位'],
        message: '单位不能为空',
      });
    }

    if (!data['分类']) {
      rowErrors.push({
        row: rowNum,
        field: '分类',
        value: data['分类'],
        message: '分类不能为空',
      });
    }

    // 验证分类是否存在
    const category = categories.find((c) => c.name === data['分类']);
    if (data['分类'] && !category) {
      rowErrors.push({
        row: rowNum,
        field: '分类',
        value: data['分类'],
        message: '分类不存在',
      });
    }

    // 验证单位是否存在
    const unit = units.find((u) => u.name === data['单位'] || u.symbol === data['单位']);
    if (data['单位'] && !unit) {
      rowErrors.push({
        row: rowNum,
        field: '单位',
        value: data['单位'],
        message: '单位不存在',
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
        message: '当前库存必须是数字',
      });
    }

    if (isNaN(minStock)) {
      rowErrors.push({
        row: rowNum,
        field: '最小库存',
        value: data['最小库存'],
        message: '最小库存必须是数字',
      });
    }

    if (isNaN(maxStock)) {
      rowErrors.push({
        row: rowNum,
        field: '最大库存',
        value: data['最大库存'],
        message: '最大库存必须是数字',
      });
    }

    if (!isNaN(minStock) && !isNaN(maxStock) && minStock > maxStock) {
      rowErrors.push({
        row: rowNum,
        field: '库存',
        value: `${minStock}/${maxStock}`,
        message: '最小库存不能大于最大库存',
      });
    }

    // 验证状态
    const statusMap: { [key: string]: 'active' | 'inactive' | 'discontinued' } = {
      可用: 'active',
      启用: 'active',
      正常: 'active',
      active: 'active',
      停用: 'inactive',
      inactive: 'inactive',
      报废: 'discontinued',
      discontinued: 'discontinued',
    };

    const status = statusMap[data['状态'] || '可用'] || 'active';
    if (data['状态'] && !statusMap[data['状态']]) {
      rowErrors.push({
        row: rowNum,
        field: '状态',
        value: data['状态'],
        message: '状态值无效，应为：可用、停用或报废',
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
        updated_by: '', // 将在保存时设置
      });
    }
  });

  return {
    validData,
    errors,
    totalRows: rows.length,
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
        message: '供应商编码不能为空',
      });
    }

    if (!data['供应商名称']) {
      rowErrors.push({
        row: rowNum,
        field: '供应商名称',
        value: data['供应商名称'],
        message: '供应商名称不能为空',
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
          message: '邮箱格式不正确',
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
          message: '联系电话格式不正确',
        });
      }
    }

    // 验证状态
    const statusMap: { [key: string]: 'active' | 'inactive' } = {
      正常: 'active',
      启用: 'active',
      可用: 'active',
      active: 'active',
      停用: 'inactive',
      inactive: 'inactive',
    };

    const status = statusMap[data['状态'] || '正常'] || 'active';
    if (data['状态'] && !statusMap[data['状态']]) {
      rowErrors.push({
        row: rowNum,
        field: '状态',
        value: data['状态'],
        message: '状态值无效，应为：正常或停用',
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
        status: status,
      });
    }
  });

  return {
    validData,
    errors,
    totalRows: rows.length,
  };
};

/**
 * 导出错误报告为 Excel 文件
 */
export const exportErrorReport = async (
  errors: ImportError[],
  fileName: string = '导入错误报告.xlsx',
): Promise<void> => {
  const errorData = errors.map((error) => ({
    行号: error.row,
    字段: error.field,
    值: error.value ?? '',
    错误信息: error.message,
  }));

  const wb = new Workbook();
  const ws = wb.addWorksheet('错误报告');

  const headers = ['行号', '字段', '值', '错误信息'];
  ws.addRow(headers);
  for (const row of errorData) {
    ws.addRow(headers.map((h) => (row as any)[h]));
  }
  ws.columns = [
    { header: '行号', key: '行号', width: 8 },
    { header: '字段', key: '字段', width: 16 },
    { header: '值', key: '值', width: 30 },
    { header: '错误信息', key: '错误信息', width: 40 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    fileName,
  );
};

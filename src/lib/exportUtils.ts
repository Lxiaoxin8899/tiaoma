import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * 防止 Excel/CSV 公式注入：
 * - 如果单元格内容是字符串，且（去掉前导空白后）以 =、+、-、@ 开头，Excel 可能会当成公式执行。
 * - 这里统一在前面加单引号，让 Excel 按“文本”处理。
 */
function sanitizeSpreadsheetCell(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.startsWith("'")) return value;

  const trimmedStart = value.replace(/^\s+/, '');
  return /^[=+\-@]/.test(trimmedStart) ? `'${value}` : value;
}

/**
 * 导出数据到 Excel 文件
 * @param data 要导出的数据数组
 * @param filename 文件名（不含扩展名）
 * @param sheetName 工作表名称
 * @param columnMap 列标题映射对象，键为字段路径，值为显示标题
 */
export function exportToExcel<T extends object>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1',
  columnMap?: Record<string, string>
): void {
  try {
    if (!data || data.length === 0) {
      throw new Error('没有数据可以导出');
    }

    // 转换数据
    const exportData = data.map((item) => {
      const row: Record<string, unknown> = {};

      if (columnMap) {
        // 使用自定义列映射
        Object.entries(columnMap).forEach(([path, label]) => {
          row[label] = sanitizeSpreadsheetCell(getNestedValue(item, path));
        });
      } else {
        // 使用原始数据
        Object.assign(row, item);
        Object.keys(row).forEach((key) => {
          row[key] = sanitizeSpreadsheetCell(row[key]);
        });
      }

      return row;
    });

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 生成 Excel 文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // 保存文件
    saveAs(blob, `${filename}.xlsx`);
  } catch (error) {
    console.error('导出 Excel 失败:', error);
    throw error;
  }
}

/**
 * 导出数据到 CSV 文件
 * @param data 要导出的数据数组
 * @param filename 文件名（不含扩展名）
 * @param columnMap 列标题映射对象，键为字段路径，值为显示标题
 */
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  columnMap?: Record<string, string>
): void {
  try {
    if (!data || data.length === 0) {
      throw new Error('没有数据可以导出');
    }

    // 转换数据
    const exportData = data.map((item) => {
      const row: Record<string, unknown> = {};

      if (columnMap) {
        // 使用自定义列映射
        Object.entries(columnMap).forEach(([path, label]) => {
          row[label] = sanitizeSpreadsheetCell(getNestedValue(item, path));
        });
      } else {
        // 使用原始数据
        Object.assign(row, item);
        Object.keys(row).forEach((key) => {
          row[key] = sanitizeSpreadsheetCell(row[key]);
        });
      }

      return row;
    });

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 生成 CSV 内容
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // 添加 BOM 以支持中文
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });

    // 保存文件
    saveAs(blob, `${filename}.csv`);
  } catch (error) {
    console.error('导出 CSV 失败:', error);
    throw error;
  }
}

/**
 * 获取嵌套对象的值
 * @param obj 对象
 * @param path 属性路径，如 'user.name'
 * @returns 属性值
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj;

  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined) {
      return '';
    }

    // 只允许从对象/数组上取值，避免运行时异常
    if (typeof value !== 'object') {
      return '';
    }

    value = (value as Record<string, unknown>)[key];
  }

  // 格式化日期
  if (value instanceof Date) {
    return formatDate(value);
  }

  // 格式化日期字符串
  if (typeof value === 'string' && isDateString(value)) {
    return formatDate(new Date(value));
  }

  // 处理 null 和 undefined
  if (value === null || value === undefined) {
    return '';
  }

  // 避免把对象直接塞进单元格导致 [object Object]
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  return value;
}

/**
 * 判断字符串是否为日期格式
 */
function isDateString(str: string): boolean {
  if (!str) return false;
  const date = new Date(str);
  return !isNaN(date.getTime()) && str.includes('-');
}

/**
 * 格式化日期
 * @param date 日期对象
 * @returns 格式化后的日期字符串 YYYY-MM-DD HH:mm:ss
 */
function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取当前日期的文件名后缀
 * @returns YYYYMMDD 格式的日期字符串
 */
export function getDateSuffix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * 下载物料导入模板
 */
export const downloadMaterialTemplate = () => {
  // 模板数据，包含示例和说明
  const templateData = [
    {
      '物料编码': 'MAT001',
      '物料名称': '螺丝钉',
      '规格型号': 'M3*10',
      '单位': '个',
      '分类': '标准件',
      '当前库存': 1000,
      '最小库存': 100,
      '最大库存': 5000,
      '状态': '可用'
    },
    {
      '物料编码': 'MAT002',
      '物料名称': '钢板',
      '规格型号': '10mm*1000mm*2000mm',
      '单位': '张',
      '分类': '原材料',
      '当前库存': 50,
      '最小库存': 10,
      '最大库存': 200,
      '状态': '可用'
    },
    {
      '物料编码': '',
      '物料名称': '',
      '规格型号': '',
      '单位': '',
      '分类': '',
      '当前库存': '',
      '最小库存': '',
      '最大库存': '',
      '状态': ''
    }
  ];

  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(templateData);

  // 设置列宽
  ws['!cols'] = [
    { wch: 15 }, // 物料编码
    { wch: 20 }, // 物料名称
    { wch: 25 }, // 规格型号
    { wch: 10 }, // 单位
    { wch: 15 }, // 分类
    { wch: 12 }, // 当前库存
    { wch: 12 }, // 最小库存
    { wch: 12 }, // 最大库存
    { wch: 10 }  // 状态
  ];

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '物料导入');

  // 添加说明工作表
  const instructionsData = [
    { '字段名': '物料编码', '是否必填': '是', '说明': '物料的唯一编码，不能重复' },
    { '字段名': '物料名称', '是否必填': '是', '说明': '物料的名称' },
    { '字段名': '规格型号', '是否必填': '否', '说明': '物料的规格型号描述' },
    { '字段名': '单位', '是否必填': '是', '说明': '物料的计量单位，必须在系统中已存在' },
    { '字段名': '分类', '是否必填': '是', '说明': '物料的分类，必须在系统中已存在' },
    { '字段名': '当前库存', '是否必填': '否', '说明': '当前库存数量，默认为0' },
    { '字段名': '最小库存', '是否必填': '否', '说明': '最小库存数量，默认为0' },
    { '字段名': '最大库存', '是否必填': '否', '说明': '最大库存数量，默认为0' },
    { '字段名': '状态', '是否必填': '否', '说明': '物料状态：可用、停用、报废，默认为可用' }
  ];

  const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
  instructionsWs['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, instructionsWs, '导入说明');

  // 下载文件
  XLSX.writeFile(wb, '物料导入模板.xlsx');
};

/**
 * 下载供应商导入模板
 */
export const downloadSupplierTemplate = () => {
  // 模板数据，包含示例和说明
  const templateData = [
    {
      '供应商编码': 'SUP001',
      '供应商名称': '北京科技有限公司',
      '联系人': '张三',
      '联系电话': '13800138000',
      '邮箱': 'zhangsan@example.com',
      '地址': '北京市朝阳区科技园',
      '状态': '正常'
    },
    {
      '供应商编码': 'SUP002',
      '供应商名称': '上海贸易公司',
      '联系人': '李四',
      '联系电话': '13900139000',
      '邮箱': 'lisi@example.com',
      '地址': '上海市浦东新区商业街',
      '状态': '正常'
    },
    {
      '供应商编码': '',
      '供应商名称': '',
      '联系人': '',
      '联系电话': '',
      '邮箱': '',
      '地址': '',
      '状态': ''
    }
  ];

  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(templateData);

  // 设置列宽
  ws['!cols'] = [
    { wch: 15 }, // 供应商编码
    { wch: 25 }, // 供应商名称
    { wch: 12 }, // 联系人
    { wch: 15 }, // 联系电话
    { wch: 25 }, // 邮箱
    { wch: 30 }, // 地址
    { wch: 10 }  // 状态
  ];

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '供应商导入');

  // 添加说明工作表
  const instructionsData = [
    { '字段名': '供应商编码', '是否必填': '是', '说明': '供应商的唯一编码，不能重复' },
    { '字段名': '供应商名称', '是否必填': '是', '说明': '供应商的名称' },
    { '字段名': '联系人', '是否必填': '否', '说明': '供应商的联系人姓名' },
    { '字段名': '联系电话', '是否必填': '否', '说明': '供应商的联系电话' },
    { '字段名': '邮箱', '是否必填': '否', '说明': '供应商的邮箱地址，需符合邮箱格式' },
    { '字段名': '地址', '是否必填': '否', '说明': '供应商的联系地址' },
    { '字段名': '状态', '是否必填': '否', '说明': '供应商状态：正常、停用，默认为正常' }
  ];

  const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
  instructionsWs['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, instructionsWs, '导入说明');

  // 下载文件
  XLSX.writeFile(wb, '供应商导入模板.xlsx');
};

// 数据库类型定义
export interface Material {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  unit_id?: string;
  category_id: string;
  status: 'active' | 'inactive' | 'discontinued';
  description?: string;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  price?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  // Joined fields
  category?: MaterialCategory;
  unit_obj?: Unit;
}

export interface MaterialCategory {
  id: string;
  code: string;
  name: string;
  parent_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialCode {
  id: string;
  material_id: string;
  code: string;
  code_type: 'internal' | 'supplier' | 'customer' | 'barcode';
  is_primary: boolean;
  description?: string;
  created_at: string;
  created_by: string;
}

export interface MaterialBatch {
  id: string;
  material_id: string;
  batch_number: string;
  production_date?: string;
  expiry_date?: string;
  supplier_id?: string;
  quantity: number;
  remaining_quantity: number;
  status: 'pending' | 'available' | 'locked' | 'expired' | 'disposed';
  location?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Joined fields
  material?: Material;
  supplier?: Supplier;
}

export interface Barcode {
  id: string;
  material_id: string;
  batch_id?: string;
  barcode: string;
  barcode_type: 'code128' | 'qr_code' | 'ean13' | 'upc';
  format: string;
  width: number;
  height: number;
  data: string;
  is_active: boolean;
  print_count: number;
  last_printed_at?: string;
  created_at: string;
  created_by: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive';
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: 'active' | 'inactive';
  remarks?: string;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol?: string;
}

// 物料表单数据类型
export interface MaterialFormData {
  code: string;
  name: string;
  specification: string;
  unit_id: string;
  category_id: string;
  min_stock: number;
  max_stock: number;
  description?: string;
  status?: 'active' | 'inactive' | 'discontinued';
}

// 查询参数类型
export interface MaterialQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface BatchFormData {
  material_id: string;
  batch_number: string;
  quantity: number;
  // 当前库存（数据库字段为 remaining_quantity）；创建时一般等于 quantity，出库后递减
  remaining_quantity?: number;
  production_date?: string;
  expiry_date?: string;
  supplier_id?: string | null;
  location?: string;
  remarks?: string;
  status?: 'pending' | 'available' | 'locked' | 'expired' | 'disposed';
}

export interface BatchQueryParams {
  page?: number;
  limit?: number;
  materialId?: string | null;
  search?: string;
  status?: string;
  supplier_id?: string;
  expiry_start?: string;
  expiry_end?: string;
}

// 通用查询参数
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// 用户类型
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  department?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// 用户表单数据类型
export interface UserFormData {
  email: string;
  username: string;
  full_name?: string;
  role: string;
  status?: 'active' | 'inactive' | 'suspended';
  department?: string;
}

// 用户查询参数
export interface UserQueryParams extends QueryParams {
  role?: string;
  status?: string;
  department?: string;
}

// 统计数据类型
export interface MaterialStats {
  total_materials: number;
  active_materials: number;
  low_stock_count: number;
  total_categories: number;
}

// 供应商统计类型
export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  total_materials: number;
}

// 用户统计类型
export interface UserStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  operator_users: number;
}

// 库存统计类型
export interface InventoryStats {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_value: number;
  recent_movements: number;
}

// 响应数据类型
export interface ApiResponse<T = unknown> {
  data: T;
  error?: string;
  message?: string;
  count?: number;
}

// 分页响应类型
export interface PaginatedResponse<T = unknown> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// 操作结果类型
export interface OperationResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

// 表单验证错误类型
export interface FormErrors {
  [key: string]: string | string[];
}

// 表单状态类型
export interface FormState<T = unknown> {
  data: T;
  errors: FormErrors;
  isSubmitting: boolean;
  isValid: boolean;
}

// 系统设置类型
export interface SystemSettings {
  id: string;
  // 常规设置
  site_name: string;
  company_name: string;
  timezone: string;
  language: string;
  date_format: string;
  // 安全设置
  password_min_length: number;
  session_timeout: number;
  max_login_attempts: number;
  two_factor_required: boolean;
  // 通知设置
  email_enabled: boolean;
  low_stock_alerts: boolean;
  system_maintenance: boolean;
  user_activities: boolean;
  // 系统设置
  auto_backup: boolean;
  backup_frequency: string;
  data_retention_days: number;
  maintenance_mode: boolean;
  // 元数据
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

// 系统设置表单数据
export interface SystemSettingsFormData {
  general?: {
    site_name?: string;
    company_name?: string;
    timezone?: string;
    language?: string;
    date_format?: string;
  };
  security?: {
    password_min_length?: number;
    session_timeout?: number;
    max_login_attempts?: number;
    two_factor_required?: boolean;
  };
  notifications?: {
    email_enabled?: boolean;
    low_stock_alerts?: boolean;
    system_maintenance?: boolean;
    user_activities?: boolean;
  };
  system?: {
    auto_backup?: boolean;
    backup_frequency?: string;
    data_retention_days?: number;
    maintenance_mode?: boolean;
  };
}

// 审计日志类型
export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  module: 'material' | 'supplier' | 'batch' | 'barcode' | 'user' | 'settings' | 'auth';
  target_id?: string;
  target_name?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// 审计日志查询参数
export interface AuditLogQueryParams extends QueryParams {
  user_id?: string;
  action?: string;
  module?: string;
  start_date?: string;
  end_date?: string;
}

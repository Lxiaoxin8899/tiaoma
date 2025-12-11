// 数据库类型定义
export interface Material {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  unit_id?: string; // Add optional unit_id
  category_id: string;
  status: 'active' | 'inactive' | 'discontinued';
  description?: string;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  price?: number; // Add optional price
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  // Joined fields
  category?: MaterialCategory;
  unit_obj?: Unit; // Rename to avoid conflict with 'unit' string field if needed, or check usage
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
  remarks?: string; // Add optional remarks
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
  remarks?: string; // Add optional remarks
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
  remarks?: string; // Add optional remarks
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol?: string; // Add optional symbol
}

// ... existing types ...

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
  materialId?: string | null; // Fix casing to match store usage
  search?: string;
  status?: string;
  supplier_id?: string;
  expiry_start?: string;
  expiry_end?: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

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

export interface MaterialStats {
  total_materials: number;
  active_materials: number;
  low_stock_count: number;
  total_categories: number;
}

// ============================================================
// DermoEczane TypeScript Type Definitions
// ============================================================

// --- Auth ---
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: number;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "editor";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user?: User;
  admin?: Admin;
}

// --- Product ---
export interface Product {
  id: number;
  brand_id: number | null;
  sku: string;
  barcode?: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  currency: string;
  stock: number;
  low_stock_threshold: number;
  weight?: number;
  is_active: boolean;
  is_featured: boolean;
  is_campaign: boolean;
  tax_rate: number;
  meta_title?: string;
  meta_description?: string;
  feed_source_id?: string;
  view_count: number;
  sold_count: number;
  created_at: string;
  updated_at: string;
  brand?: Brand;
  categories?: Category[];
  images?: ProductImage[];
  variants?: ProductVariant[];
  tags?: ProductTag[];
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  compare_price?: number;
  stock: number;
  is_active: boolean;
  sort_order: number;
}

export interface ProductTag {
  id: number;
  product_id: number;
  tag: string;
}

// --- Category ---
export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  icon_url?: string;
  sort_order: number;
  is_active: boolean;
  meta_title?: string;
  meta_description?: string;
  depth: number;
  path: string;
  children?: Category[];
}

// --- Brand ---
export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  meta_title?: string;
  meta_description?: string;
}

// --- Order ---
export type OrderStatus =
  | "pending"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderSource = "web" | "trendyol" | "hepsiburada";

export interface Order {
  id: number;
  order_number: string;
  user_id: number | null;
  source: OrderSource;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  coupon_code?: string;
  coupon_discount: number;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_district: string;
  shipping_address: string;
  billing_first_name: string;
  billing_last_name: string;
  invoice_type: "individual" | "corporate";
  cargo_company?: string;
  tracking_number?: string;
  shipped_at?: string;
  delivered_at?: string;
  payment_method: "credit_card" | "bank_transfer";
  customer_note?: string;
  bizimhesap_invoice_id?: string;
  invoice_number?: string;
  invoice_url?: string;
  invoice_retry_count?: number;
  last_invoice_error?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  product_sku?: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate?: number;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  old_status: string;
  new_status: string;
  note?: string;
  changed_by: string;
  created_at: string;
}

// --- Cart ---
export interface Cart {
  id: number;
  items: CartItem[];
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  variant_id?: number;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
}

// --- Address ---
export interface Address {
  id: number;
  user_id: number;
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood?: string;
  address_line: string;
  postal_code?: string;
  is_default: boolean;
}

// --- SavedCard ---
export interface SavedCard {
  id: number;
  card_label?: string;
  last_four: string;
  card_brand?: string;
  is_default: boolean;
}

// --- Favorite ---
export interface Favorite {
  id: number;
  user_id: number;
  product_id: number;
  product?: Product;
  created_at: string;
}

// --- Campaign ---
export interface Campaign {
  id: number;
  name: string;
  slug: string;
  description?: string;
  banner_image?: string;
  banner_image_mobile?: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
  meta_title?: string;
  meta_description?: string;
  products?: Product[];
}

// --- Coupon ---
export interface Coupon {
  id: number;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  per_user_limit: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
}

// --- CMS ---
export interface Page {
  id: number;
  slug: string;
  title: string;
  content?: string;
  is_active: boolean;
  meta_title?: string;
  meta_description?: string;
}

export interface Slider {
  id: number;
  title?: string;
  subtitle?: string;
  image_url: string;
  image_url_mobile?: string;
  link_url?: string;
  button_text?: string;
  sort_order: number;
  is_active: boolean;
  starts_at?: string;
  expires_at?: string;
}

export interface Banner {
  id: number;
  position: string;
  title?: string;
  image_url: string;
  image_url_mobile?: string;
  link_url?: string;
  sort_order: number;
  is_active: boolean;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  group: string;
}

// --- Sync ---
export interface SyncLog {
  id: number;
  marketplace: "trendyol" | "hepsiburada";
  sync_type:
    | "product_push"
    | "stock_update"
    | "price_update"
    | "order_fetch";
  status: "success" | "failed" | "partial";
  total_items: number;
  success_count: number;
  error_count: number;
  error_details?: string;
  started_at: string;
  completed_at?: string;
}

// --- API Response ---
export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T;
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

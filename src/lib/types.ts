export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type InvoiceStatus = 'issued' | 'paid' | 'voided';
export type PurchaseStatus = 'pending' | 'received' | 'cancelled';
export type LedgerEntryType = 'PURCHASE' | 'ORDER_ISSUE' | 'ORDER_RETURN' | 'ADJUSTMENT';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  is_available: boolean;
  image_url: string | null;
  prep_time_minutes: number | null;
  created_at: string;
  category?: Category | null;
}

export interface Member {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  employee_id: string | null;
  is_active: boolean;
  balance: number;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock_level: number;
  cost_per_unit: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  food_item_id: string | null;
  food_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  member_id: string | null;
  status: OrderStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member?: Member | null;
  order_items?: OrderItem[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  member_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  created_at: string;
  order?: Order | null;
  member?: Member | null;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  inventory_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_name: string;
  status: PurchaseStatus;
  total_cost: number;
  notes: string | null;
  created_at: string;
  purchase_items?: PurchaseItem[];
}

export interface StockLedgerEntry {
  id: string;
  inventory_item_id: string;
  entry_type: LedgerEntryType;
  reference_type: string | null;
  reference_id: string | null;
  quantity_change: number;
  balance_after: number;
  notes: string | null;
  created_at: string;
  inventory_item?: InventoryItem | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

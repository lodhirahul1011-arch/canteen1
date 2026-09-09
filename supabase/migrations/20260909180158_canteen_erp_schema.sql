/*
# Canteen ERP — Complete Schema

1. New Tables
- `categories` — food categories (e.g. Breakfast, Lunch, Beverages)
- `food_items` — menu items with name, price, category, and stock link
- `members` — canteen members who place orders
- `inventory_items` — raw material/ingredient stock with unit and quantity
- `orders` — order header with member, status, totals
- `order_items` — line items per order (food item, qty, price)
- `invoices` — billing documents linked to orders
- `purchases` — purchase header from suppliers
- `purchase_items` — line items per purchase (inventory item, qty, cost)
- `stock_ledger` — immutable ledger of all stock movements
- `notifications` — system notifications for events

2. Relationships
- food_items.category_id → categories
- orders.member_id → members
- order_items.order_id → orders, order_items.food_item_id → food_items
- invoices.order_id → orders
- purchase_items.purchase_id → purchases, purchase_items.inventory_item_id → inventory_items
- stock_ledger.inventory_item_id → inventory_items

3. Security
- All tables have RLS enabled
- All policies use TO anon, authenticated (single-tenant, no auth screen)
- Full CRUD allowed for all roles (shared canteen management app)
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

-- Food Items
CREATE TABLE IF NOT EXISTS food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_available boolean NOT NULL DEFAULT true,
  image_url text,
  prep_time_minutes int DEFAULT 15,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_food_items" ON food_items;
CREATE POLICY "anon_select_food_items" ON food_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_food_items" ON food_items;
CREATE POLICY "anon_insert_food_items" ON food_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_food_items" ON food_items;
CREATE POLICY "anon_update_food_items" ON food_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_food_items" ON food_items;
CREATE POLICY "anon_delete_food_items" ON food_items FOR DELETE TO anon, authenticated USING (true);

-- Members
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  employee_id text,
  is_active boolean NOT NULL DEFAULT true,
  balance numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_members" ON members;
CREATE POLICY "anon_select_members" ON members FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_members" ON members;
CREATE POLICY "anon_insert_members" ON members FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_members" ON members;
CREATE POLICY "anon_update_members" ON members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_members" ON members;
CREATE POLICY "anon_delete_members" ON members FOR DELETE TO anon, authenticated USING (true);

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  min_stock_level numeric(12,2) NOT NULL DEFAULT 0,
  cost_per_unit numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_inventory_items" ON inventory_items;
CREATE POLICY "anon_select_inventory_items" ON inventory_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inventory_items" ON inventory_items;
CREATE POLICY "anon_insert_inventory_items" ON inventory_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inventory_items" ON inventory_items;
CREATE POLICY "anon_update_inventory_items" ON inventory_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inventory_items" ON inventory_items;
CREATE POLICY "anon_delete_inventory_items" ON inventory_items FOR DELETE TO anon, authenticated USING (true);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','served','cancelled')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 5.00,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE TO anon, authenticated USING (true);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  food_item_id uuid REFERENCES food_items(id) ON DELETE SET NULL,
  food_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
CREATE POLICY "anon_select_order_items" ON order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
CREATE POLICY "anon_update_order_items" ON order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE TO anon, authenticated USING (true);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','paid','voided')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon, authenticated USING (true);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number text NOT NULL UNIQUE,
  supplier_name text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('pending','received','cancelled')),
  total_cost numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_purchases" ON purchases;
CREATE POLICY "anon_select_purchases" ON purchases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_purchases" ON purchases;
CREATE POLICY "anon_insert_purchases" ON purchases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_purchases" ON purchases;
CREATE POLICY "anon_update_purchases" ON purchases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_purchases" ON purchases;
CREATE POLICY "anon_delete_purchases" ON purchases FOR DELETE TO anon, authenticated USING (true);

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (quantity > 0),
  unit_cost numeric(10,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_purchase_items" ON purchase_items;
CREATE POLICY "anon_select_purchase_items" ON purchase_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_purchase_items" ON purchase_items;
CREATE POLICY "anon_insert_purchase_items" ON purchase_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_purchase_items" ON purchase_items;
CREATE POLICY "anon_update_purchase_items" ON purchase_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_purchase_items" ON purchase_items;
CREATE POLICY "anon_delete_purchase_items" ON purchase_items FOR DELETE TO anon, authenticated USING (true);

-- Stock Ledger
CREATE TABLE IF NOT EXISTS stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('PURCHASE','ORDER_ISSUE','ORDER_RETURN','ADJUSTMENT')),
  reference_type text,
  reference_id uuid,
  quantity_change numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_stock_ledger" ON stock_ledger;
CREATE POLICY "anon_select_stock_ledger" ON stock_ledger FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stock_ledger" ON stock_ledger;
CREATE POLICY "anon_insert_stock_ledger" ON stock_ledger FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stock_ledger" ON stock_ledger;
CREATE POLICY "anon_update_stock_ledger" ON stock_ledger FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stock_ledger" ON stock_ledger;
CREATE POLICY "anon_delete_stock_ledger" ON stock_ledger FOR DELETE TO anon, authenticated USING (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  reference_type text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_inventory ON stock_ledger(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_created ON stock_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- updated_at trigger for orders
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

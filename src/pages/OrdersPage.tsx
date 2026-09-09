import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  formatDateTime,
  generateOrderNumber,
  generateInvoiceNumber,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/lib/utils';
import type { Order, FoodItem, Member, OrderItem } from '@/lib/types';
import Modal from '@/components/Modal';
import Loading from '@/components/Loading';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  Plus,
  ShoppingCart,
  Search,
  Trash2,
  Minus,
  X,
  Eye,
  Ban,
  UtensilsCrossed,
} from 'lucide-react';

const STATUS_FLOW: { key: string; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'served', label: 'Served' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create order state
  const [cart, setCart] = useState<{ foodItem: FoodItem; quantity: number }[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [discount, setDiscount] = useState('0');
  const [taxRate] = useState('5');
  const [notes, setNotes] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  const TAX_RATE = 5;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('orders')
        .select('*, member:members(*), order_items(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (e) throw e;
      setOrders((data || []) as unknown as Order[]);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadData]);

  async function loadData() {
    const [foodRes, memberRes] = await Promise.all([
      supabase.from('food_items').select('*, category:categories(*)').eq('is_available', true).order('name'),
      supabase.from('members').select('*').eq('is_active', true).order('name'),
    ]);
    if (foodRes.data) setFoodItems((foodRes.data || []) as unknown as FoodItem[]);
    if (memberRes.data) setMembers((memberRes.data || []) as Member[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  const cartSubtotal = cart.reduce((sum, c) => sum + Number(c.foodItem.price) * c.quantity, 0);
  const cartDiscount = Math.min(parseFloat(discount) || 0, cartSubtotal);
  const cartTax = ((cartSubtotal - cartDiscount) * TAX_RATE) / 100;
  const cartTotal = cartSubtotal - cartDiscount + cartTax;

  function addToCart(item: FoodItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.foodItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.foodItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { foodItem: item, quantity: 1 }];
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.foodItem.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.foodItem.id !== itemId));
  }

  function resetForm() {
    setCart([]);
    setSelectedMember('');
    setDiscount('0');
    setNotes('');
    setItemSearch('');
    setFormError(null);
  }

  async function handleCreateOrder() {
    setFormError(null);
    if (cart.length === 0) {
      setFormError('Add at least one item to the order');
      return;
    }

    setSaving(true);
    try {
      const orderNumber = generateOrderNumber();
      const invoiceNumber = generateInvoiceNumber();

      const orderPayload = {
        order_number: orderNumber,
        member_id: selectedMember || null,
        status: 'pending',
        subtotal: cartSubtotal,
        tax_rate: TAX_RATE,
        tax_amount: cartTax,
        discount: cartDiscount,
        total: cartTotal,
        notes: notes.trim() || null,
      };

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();
      if (orderErr) throw orderErr;

      const orderItemsPayload = cart.map((c) => ({
        order_id: orderData.id,
        food_item_id: c.foodItem.id,
        food_name: c.foodItem.name,
        quantity: c.quantity,
        unit_price: Number(c.foodItem.price),
        line_total: Number(c.foodItem.price) * c.quantity,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload);
      if (itemsErr) throw itemsErr;

      // Create invoice
      const invoicePayload = {
        invoice_number: invoiceNumber,
        order_id: orderData.id,
        member_id: selectedMember || null,
        subtotal: cartSubtotal,
        tax_amount: cartTax,
        discount: cartDiscount,
        total: cartTotal,
        status: 'issued',
      };

      const { error: invErr } = await supabase.from('invoices').insert(invoicePayload);
      if (invErr) throw invErr;

      // Create notification
      await supabase.from('notifications').insert({
        type: 'new_order',
        title: 'New Order',
        message: `Order ${orderNumber} created with ${cart.length} items`,
        reference_type: 'order',
        reference_id: orderData.id,
      });

      setCreateOpen(false);
      resetForm();
      loadOrders();
    } catch {
      setFormError('Failed to create order. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function updateOrderStatus(order: Order, newStatus: string) {
    const { error: e } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (e) {
      setError('Failed to update order status.');
      return;
    }
    loadOrders();
    setViewOrder(null);
  }

  async function handleCancelOrder() {
    if (!cancelTarget) return;
    try {
      const { error: e } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', cancelTarget.id);
      if (e) throw e;

      // Void the linked invoice
      await supabase.from('invoices').update({ status: 'voided' }).eq('order_id', cancelTarget.id);

      await supabase.from('notifications').insert({
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Order ${cancelTarget.order_number} has been cancelled`,
        reference_type: 'order',
        reference_id: cancelTarget.id,
      });

      setCancelTarget(null);
      loadOrders();
    } catch {
      setError('Failed to cancel order.');
    }
  }

  const filtered = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (order.member?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <Loading label="Loading orders..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
          <p className="text-sm text-slate-400 mt-1">Create and manage customer orders</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order number or member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="served">Served</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders found"
          message="Create a new order to get started."
          action={
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={18} />
              New Order
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-slate-700">{order.order_number}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600">{order.member?.name || 'Walk-in'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600">{order.order_items?.length || 0} items</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-semibold text-slate-700">{formatCurrency(Number(order.total))}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-400">{formatDateTime(order.created_at)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewOrder(order)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {order.status !== 'cancelled' && order.status !== 'served' && (
                          <button
                            onClick={() => setCancelTarget(order)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Cancel"
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Order"
        size="xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Food selection */}
          <div className="space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search food items..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {foodItems
                .filter((item) => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                        <UtensilsCrossed size={18} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{item.name}</p>
                        {item.category && (
                          <p className="text-xs text-slate-400">{item.category.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">{formatCurrency(Number(item.price))}</span>
                      <Plus size={16} className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              {foodItems.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">No food items available. Add items in the Menu page first.</p>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">Order Summary</h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">
                  Clear all
                </button>
              )}
            </div>

            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            >
              <option value="">Walk-in Customer</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.employee_id ? ` (${m.employee_id})` : ''}
                </option>
              ))}
            </select>

            <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 max-h-[250px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingCart size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Cart is empty</p>
                </div>
              ) : (
                cart.map((c) => (
                  <div key={c.foodItem.id} className="flex items-center justify-between p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{c.foodItem.name}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(Number(c.foodItem.price))} each</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => updateQty(c.foodItem.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        <Minus size={14} className="text-slate-600" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700 w-6 text-center">{c.quantity}</span>
                      <button
                        onClick={() => updateQty(c.foodItem.id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                      >
                        <Plus size={14} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => removeFromCart(c.foodItem.id)}
                        className="ml-1 p-1.5 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Discount (₹)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                placeholder="Optional order notes"
              />
            </div>

            {/* Totals */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Discount</span>
                <span>-{formatCurrency(cartDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax ({TAX_RATE}%)</span>
                <span>{formatCurrency(cartTax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {formError && (
              <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={saving || cart.length === 0}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Order Modal */}
      <Modal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Order ${viewOrder?.order_number || ''}`}
        size="lg"
      >
        {viewOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Customer</p>
                <p className="text-sm font-medium text-slate-700">{viewOrder.member?.name || 'Walk-in'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Date</p>
                <p className="text-sm font-medium text-slate-700">{formatDateTime(viewOrder.created_at)}</p>
              </div>
            </div>

            <div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ORDER_STATUS_COLORS[viewOrder.status]}`}>
                {ORDER_STATUS_LABELS[viewOrder.status]}
              </span>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Item</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500">Qty</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Price</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(viewOrder.order_items || []).map((item: OrderItem) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{item.food_name}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600 text-center">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600 text-right">{formatCurrency(Number(item.unit_price))}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-700 text-right">{formatCurrency(Number(item.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(viewOrder.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Discount</span>
                <span>-{formatCurrency(Number(viewOrder.discount))}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax ({viewOrder.tax_rate}%)</span>
                <span>{formatCurrency(Number(viewOrder.tax_amount))}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{formatCurrency(Number(viewOrder.total))}</span>
              </div>
            </div>

            {viewOrder.notes && (
              <div>
                <p className="text-sm text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-600 bg-amber-50 rounded-lg p-3">{viewOrder.notes}</p>
              </div>
            )}

            {/* Status progression */}
            {viewOrder.status !== 'cancelled' && viewOrder.status !== 'served' && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <p className="w-full text-sm text-slate-400 mb-1">Update status:</p>
                {STATUS_FLOW.map((s) => {
                  const isCurrent = viewOrder.status === s.key;
                  const isPast = STATUS_FLOW.findIndex((x) => x.key === viewOrder.status) > STATUS_FLOW.findIndex((x) => x.key === s.key);
                  if (isCurrent || isPast) return null;
                  return (
                    <button
                      key={s.key}
                      onClick={() => updateOrderStatus(viewOrder, s.key)}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                    >
                      Mark as {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Order"
        message={`Are you sure you want to cancel order "${cancelTarget?.order_number}"? The linked invoice will be voided.`}
        confirmLabel="Cancel Order"
        variant="danger"
        onConfirm={handleCancelOrder}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

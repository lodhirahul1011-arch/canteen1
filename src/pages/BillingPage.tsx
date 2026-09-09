import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  formatDateTime,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
} from '@/lib/utils';
import type { Invoice, Order, OrderItem, Member } from '@/lib/types';
import Modal from '@/components/Modal';
import Loading from '@/components/Loading';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Receipt, Search, Eye, Printer, CheckCircle } from 'lucide-react';

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderData, setOrderData] = useState<Order | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('invoices')
        .select('*, order:orders(*), member:members(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (e) throw e;
      setInvoices((data || []) as unknown as Invoice[]);
    } catch {
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function openInvoice(invoice: Invoice) {
    setViewInvoice(invoice);
    setOrderItems([]);
    setOrderData(null);

    if (invoice.order_id) {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*, member:members(*)').eq('id', invoice.order_id).maybeSingle(),
        supabase.from('order_items').select('*').eq('order_id', invoice.order_id),
      ]);
      if (orderRes.data) setOrderData(orderRes.data as unknown as Order);
      if (itemsRes.data) setOrderItems((itemsRes.data || []) as OrderItem[]);
    }
  }

  async function markAsPaid(invoice: Invoice) {
    const { error: e } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoice.id);
    if (e) {
      setError('Failed to update invoice.');
      return;
    }
    setViewInvoice(null);
    loadData();
  }

  function handlePrint() {
    window.print();
  }

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.member?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <Loading label="Loading invoices..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Billing & Invoices</h1>
        <p className="text-sm text-slate-400 mt-1">View and manage customer invoices</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or member..."
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
          <option value="issued">Issued</option>
          <option value="paid">Paid</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices found" message="Invoices are generated automatically when orders are placed." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-slate-700">{inv.invoice_number}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{inv.member?.name || 'Walk-in'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${INVOICE_STATUS_COLORS[inv.status]}`}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-700">
                      {formatCurrency(Number(inv.total))}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{formatDateTime(inv.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openInvoice(inv)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal with Print */}
      <Modal
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={`Invoice ${viewInvoice?.invoice_number || ''}`}
        size="lg"
      >
        {viewInvoice && (
          <div className="space-y-5">
            {/* Print Area */}
            <div id="print-area" className="bg-white">
              {/* Invoice Header */}
              <div className="flex items-start justify-between pb-5 border-b-2 border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                      <Receipt size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Canteen ERP</h2>
                      <p className="text-xs text-slate-400">Canteen Management System</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">INVOICE</p>
                  <p className="text-sm text-slate-500 mt-1">{viewInvoice.invoice_number}</p>
                  <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full border ${INVOICE_STATUS_COLORS[viewInvoice.status]}`}>
                    {INVOICE_STATUS_LABELS[viewInvoice.status]}
                  </span>
                </div>
              </div>

              {/* Bill To & Date */}
              <div className="grid grid-cols-2 gap-6 py-5">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Bill To</p>
                  <p className="text-sm font-medium text-slate-700">{viewInvoice.member?.name || 'Walk-in Customer'}</p>
                  {viewInvoice.member?.email && (
                    <p className="text-xs text-slate-400">{viewInvoice.member.email}</p>
                  )}
                  {viewInvoice.member?.phone && (
                    <p className="text-xs text-slate-400">{viewInvoice.member.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm text-slate-700">{formatDateTime(viewInvoice.created_at)}</p>
                  {orderData && (
                    <>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 mt-2">Order</p>
                      <p className="text-sm text-slate-700">{orderData.order_number}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.food_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatCurrency(Number(item.unit_price))}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 text-right">{formatCurrency(Number(item.line_total))}</td>
                      </tr>
                    ))}
                    {orderItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">No items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mt-5">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(Number(viewInvoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(Number(viewInvoice.discount))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Tax</span>
                    <span>{formatCurrency(Number(viewInvoice.tax_amount))}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t-2 border-slate-200">
                    <span>Total</span>
                    <span>{formatCurrency(Number(viewInvoice.total))}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">Thank you for your business!</p>
                <p className="text-xs text-slate-300 mt-1">This is a computer-generated invoice and does not require a signature.</p>
              </div>
            </div>

            {/* Action Buttons (no print) */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 no-print">
              {viewInvoice.status === 'issued' && (
                <button
                  onClick={() => markAsPaid(viewInvoice)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle size={16} />
                  Mark as Paid
                </button>
              )}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                <Printer size={16} />
                Print Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

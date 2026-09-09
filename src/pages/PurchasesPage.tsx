import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  formatDateTime,
  generatePurchaseNumber,
} from '@/lib/utils';
import type { Purchase, PurchaseItem, InventoryItem } from '@/lib/types';
import Modal from '@/components/Modal';
import Loading from '@/components/Loading';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import {
  Plus,
  Truck,
  Eye,
  Search,
  Trash2,
  X,
} from 'lucide-react';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [supplierName, setSupplierName] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [lines, setLines] = useState<{ inventoryItemId: string; quantity: string; unitCost: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [purRes, invRes] = await Promise.all([
        supabase
          .from('purchases')
          .select('*, purchase_items(*)')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('inventory_items').select('*').order('name'),
      ]);
      if (purRes.error) throw purRes.error;
      if (invRes.error) throw invRes.error;
      setPurchases((purRes.data || []) as unknown as Purchase[]);
      setInventoryItems((invRes.data || []) as InventoryItem[]);
    } catch {
      setError('Failed to load purchases.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function addLine() {
    setLines([...lines, { inventoryItemId: '', quantity: '', unitCost: '' }]);
  }

  function updateLine(idx: number, field: 'inventoryItemId' | 'quantity' | 'unitCost', value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setSupplierName('');
    setPurchaseNotes('');
    setLines([]);
    setFormError(null);
  }

  const totalCost = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const cost = parseFloat(l.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  async function handleCreate() {
    setFormError(null);
    if (!supplierName.trim()) {
      setFormError('Supplier name is required');
      return;
    }
    if (lines.length === 0) {
      setFormError('Add at least one purchase line');
      return;
    }
    for (const l of lines) {
      if (!l.inventoryItemId || !l.quantity || parseFloat(l.quantity) <= 0) {
        setFormError('All lines need an item and valid quantity');
        return;
      }
    }

    setSaving(true);
    try {
      const purchaseNumber = generatePurchaseNumber();

      const { data: purData, error: purErr } = await supabase
        .from('purchases')
        .insert({
          purchase_number: purchaseNumber,
          supplier_name: supplierName.trim(),
          status: 'received',
          total_cost: totalCost,
          notes: purchaseNotes.trim() || null,
        })
        .select()
        .single();
      if (purErr) throw purErr;

      const lineItems: Omit<PurchaseItem, 'id' | 'created_at'>[] = lines.map((l) => {
        const invItem = inventoryItems.find((i) => i.id === l.inventoryItemId);
        const qty = parseFloat(l.quantity);
        const cost = parseFloat(l.unitCost) || 0;
        return {
          purchase_id: purData.id,
          inventory_item_id: l.inventoryItemId,
          item_name: invItem?.name || 'Unknown',
          quantity: qty,
          unit_cost: cost,
          line_total: qty * cost,
        };
      });

      const { error: lineErr } = await supabase.from('purchase_items').insert(lineItems);
      if (lineErr) throw lineErr;

      // Update inventory and write ledger entries
      for (const l of lines) {
        const invItem = inventoryItems.find((i) => i.id === l.inventoryItemId);
        if (!invItem) continue;
        const qty = parseFloat(l.quantity);
        const newBalance = Number(invItem.quantity) + qty;

        await supabase.from('inventory_items').update({ quantity: newBalance }).eq('id', invItem.id);

        await supabase.from('stock_ledger').insert({
          inventory_item_id: invItem.id,
          entry_type: 'PURCHASE',
          reference_type: 'purchase',
          reference_id: purData.id,
          quantity_change: qty,
          balance_after: newBalance,
          notes: `Purchase ${purchaseNumber} from ${supplierName}`,
        });
      }

      await supabase.from('notifications').insert({
        type: 'new_purchase',
        title: 'New Purchase',
        message: `Purchase ${purchaseNumber} from ${supplierName} — ${formatCurrency(totalCost)}`,
        reference_type: 'purchase',
        reference_id: purData.id,
      });

      setCreateOpen(false);
      resetForm();
      loadData();
    } catch {
      setFormError('Failed to create purchase.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(purchase: Purchase) {
    // Reverse inventory for received purchases
    if (purchase.status === 'received') {
      for (const item of purchase.purchase_items || []) {
        if (!item.inventory_item_id) continue;
        const invItem = inventoryItems.find((i) => i.id === item.inventory_item_id);
        if (!invItem) continue;
        const newBalance = Number(invItem.quantity) - Number(item.quantity);
        await supabase
          .from('inventory_items')
          .update({ quantity: Math.max(0, newBalance) })
          .eq('id', item.inventory_item_id);
      }
    }
    const { error: e } = await supabase.from('purchases').delete().eq('id', purchase.id);
    if (e) {
      setError('Failed to delete purchase.');
      return;
    }
    loadData();
  }

  const filtered = purchases.filter((p) =>
    p.purchase_number.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading label="Loading purchases..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
          <p className="text-sm text-slate-400 mt-1">Record stock purchases from suppliers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            addLine();
            setCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Purchase
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by purchase number or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No purchases found"
          message="Record your first stock purchase from a supplier."
          action={
            <button
              onClick={() => {
                resetForm();
                addLine();
                setCreateOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={18} />
              New Purchase
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cost</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-slate-700">{p.purchase_number}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{p.supplier_name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{p.purchase_items?.length || 0} items</td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-700">
                      {formatCurrency(Number(p.total_cost))}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{formatDateTime(p.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewPurchase(p)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
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

      {/* Create Purchase Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Purchase" size="lg">
        <div className="space-y-4">
          {formError && <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier Name</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              placeholder="e.g. ABC Suppliers"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Items</label>
              <button
                onClick={addLine}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <Plus size={14} />
                Add Line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={line.inventoryItemId}
                    onChange={(e) => updateLine(idx, 'inventoryItemId', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                  >
                    <option value="">Select item...</option>
                    {inventoryItems.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                    placeholder="Qty"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="number"
                    value={line.unitCost}
                    onChange={(e) => updateLine(idx, 'unitCost', e.target.value)}
                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                    placeholder="Cost"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => removeLine(idx)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {lines.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
                  No items added yet
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <input
              type="text"
              value={purchaseNotes}
              onChange={(e) => setPurchaseNotes(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              placeholder="Optional notes"
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Total Cost</span>
            <span className="text-lg font-bold text-slate-800">{formatCurrency(totalCost)}</span>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Record Purchase'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Purchase Modal */}
      <Modal open={!!viewPurchase} onClose={() => setViewPurchase(null)} title={`Purchase ${viewPurchase?.purchase_number || ''}`} size="lg">
        {viewPurchase && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Supplier</p>
                <p className="text-sm font-medium text-slate-700">{viewPurchase.supplier_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Date</p>
                <p className="text-sm font-medium text-slate-700">{formatDateTime(viewPurchase.created_at)}</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Item</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500">Qty</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Unit Cost</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(viewPurchase.purchase_items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{item.item_name}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600 text-center">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600 text-right">{formatCurrency(Number(item.unit_cost))}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-700 text-right">{formatCurrency(Number(item.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Total Cost</span>
              <span className="text-lg font-bold text-slate-800">{formatCurrency(Number(viewPurchase.total_cost))}</span>
            </div>

            {viewPurchase.notes && (
              <div>
                <p className="text-sm text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{viewPurchase.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

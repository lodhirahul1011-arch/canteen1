import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime, LEDGER_TYPE_LABELS, LEDGER_TYPE_COLORS } from '@/lib/utils';
import type { InventoryItem, StockLedgerEntry } from '@/lib/types';
import Modal from '@/components/Modal';
import Loading from '@/components/Loading';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Plus, Package, Pencil, Trash2, Search, BookOpen, AlertTriangle } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'items' | 'ledger'>('items');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    unit: 'pcs',
    quantity: '0',
    min_stock_level: '0',
    cost_per_unit: '0',
  });

  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, ledgerRes] = await Promise.all([
        supabase.from('inventory_items').select('*').order('name'),
        supabase
          .from('stock_ledger')
          .select('*, inventory_item:inventory_items(name)')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      if (invRes.error) throw invRes.error;
      if (ledgerRes.error) throw ledgerRes.error;
      setItems((invRes.data || []) as InventoryItem[]);
      setLedger((ledgerRes.data || []) as unknown as StockLedgerEntry[]);
    } catch {
      setError('Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', unit: 'pcs', quantity: '0', min_stock_level: '0', cost_per_unit: '0' });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      unit: item.unit,
      quantity: String(item.quantity),
      min_stock_level: String(item.min_stock_level),
      cost_per_unit: String(item.cost_per_unit),
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim() || 'pcs',
        quantity: parseFloat(form.quantity) || 0,
        min_stock_level: parseFloat(form.min_stock_level) || 0,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
      };

      if (editing) {
        const { error: e } = await supabase.from('inventory_items').update(payload).eq('id', editing.id);
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase.from('inventory_items').insert(payload).select().single();
        if (e) throw e;
        // Write initial ledger entry
        if (data && payload.quantity > 0) {
          await supabase.from('stock_ledger').insert({
            inventory_item_id: data.id,
            entry_type: 'ADJUSTMENT',
            quantity_change: payload.quantity,
            balance_after: payload.quantity,
            notes: 'Initial stock',
          });
        }
      }
      setModalOpen(false);
      loadData();
    } catch {
      setFormError('Failed to save item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const { error: e } = await supabase.from('inventory_items').delete().eq('id', deleteTarget.id);
      if (e) throw e;
      setDeleteTarget(null);
      loadData();
    } catch {
      setError('Failed to delete item.');
    }
  }

  async function handleAdjust() {
    if (!adjustTarget) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty)) {
      setFormError('Enter a valid quantity (use negative to reduce)');
      return;
    }
    const newBalance = Number(adjustTarget.quantity) + qty;
    if (newBalance < 0) {
      setFormError('Insufficient stock for this adjustment');
      return;
    }

    try {
      const { error: e1 } = await supabase
        .from('inventory_items')
        .update({ quantity: newBalance })
        .eq('id', adjustTarget.id);
      if (e1) throw e1;

      await supabase.from('stock_ledger').insert({
        inventory_item_id: adjustTarget.id,
        entry_type: 'ADJUSTMENT',
        quantity_change: qty,
        balance_after: newBalance,
        notes: adjustNote.trim() || 'Manual adjustment',
      });

      setAdjustTarget(null);
      setAdjustQty('');
      setAdjustNote('');
      setFormError(null);
      loadData();
    } catch {
      setFormError('Failed to adjust stock.');
    }
  }

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading label="Loading inventory..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-400 mt-1">Track stock levels and movements</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('items')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'items' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Stock Items
        </button>
        <button
          onClick={() => setTab('ledger')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            tab === 'ledger' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <BookOpen size={15} />
          Stock Ledger
        </button>
      </div>

      {tab === 'items' ? (
        <>
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Package} title="No inventory items" message="Add your first inventory item to track stock." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">In Stock</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Level</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost/Unit</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Value</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((item) => {
                      const isLow = Number(item.quantity) <= Number(item.min_stock_level);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700">{item.name}</span>
                              {isLow && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                  <AlertTriangle size={10} />
                                  Low
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">Unit: {item.unit}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`text-sm font-semibold ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                              {item.quantity} {item.unit}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm text-slate-600">
                            {item.min_stock_level} {item.unit}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm text-slate-600">
                            {formatCurrency(Number(item.cost_per_unit))}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm font-medium text-slate-700">
                            {formatCurrency(Number(item.quantity) * Number(item.cost_per_unit))}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setAdjustTarget(item)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={() => openEdit(item)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Stock Ledger */
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {ledger.length === 0 ? (
            <EmptyState icon={BookOpen} title="No ledger entries" message="Stock movements will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Change</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-slate-400">{formatDateTime(entry.created_at)}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-700">
                        {entry.inventory_item?.name || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium ${LEDGER_TYPE_COLORS[entry.entry_type]}`}>
                          {LEDGER_TYPE_LABELS[entry.entry_type]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-sm font-semibold ${entry.quantity_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {entry.quantity_change >= 0 ? '+' : ''}{entry.quantity_change}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-medium text-slate-700">
                        {entry.balance_after}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{entry.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Inventory Item' : 'Add Inventory Item'}>
        <div className="space-y-4">
          {formError && <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              placeholder="e.g. Rice"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                placeholder="kg, pcs, L..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost per Unit (₹)</label>
              <input
                type="number"
                value={form.cost_per_unit}
                onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity{!editing && ' (Initial)'}</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                min="0"
                step="0.01"
                disabled={!!editing}
              />
              {editing && (
                <p className="text-xs text-slate-400 mt-1">Use "Adjust" to change stock levels</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Min Stock Level</label>
              <input
                type="number"
                value={form.min_stock_level}
                onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Item'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={!!adjustTarget} onClose={() => { setAdjustTarget(null); setFormError(null); }} title={`Adjust Stock: ${adjustTarget?.name || ''}`}>
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm text-slate-500">Current Stock</span>
            <span className="text-sm font-semibold text-slate-700">{adjustTarget?.quantity} {adjustTarget?.unit}</span>
          </div>
          {formError && <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity Change</label>
            <input
              type="number"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              placeholder="e.g. 10 or -5"
              step="0.01"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">Positive to add stock, negative to remove</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
            <input
              type="text"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              placeholder="e.g. Stock count correction"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setAdjustTarget(null); setFormError(null); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdjust}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors"
            >
              Apply Adjustment
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Item"
        message={`Delete "${deleteTarget?.name}" and all its ledger entries?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

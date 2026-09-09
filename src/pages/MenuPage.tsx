import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import type { FoodItem, Category } from '@/lib/types';
import Modal from '@/components/Modal';
import Loading from '@/components/Loading';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  Plus,
  UtensilsCrossed,
  Pencil,
  Trash2,
  Search,
  Tag,
} from 'lucide-react';

export default function MenuPage() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_available: true,
    prep_time_minutes: '15',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        supabase.from('food_items').select('*, category:categories(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (catsRes.error) throw catsRes.error;
      setItems((itemsRes.data || []) as unknown as FoodItem[]);
      setCategories((catsRes.data || []) as Category[]);
    } catch {
      setError('Failed to load menu items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '', price: '', category_id: '', is_available: true, prep_time_minutes: '15' });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: FoodItem) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category_id: item.category_id || '',
      is_available: item.is_available,
      prep_time_minutes: String(item.prep_time_minutes || 15),
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
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setFormError('Valid price is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        category_id: form.category_id || null,
        is_available: form.is_available,
        prep_time_minutes: parseInt(form.prep_time_minutes) || 15,
      };

      if (editing) {
        const { error: e } = await supabase.from('food_items').update(payload).eq('id', editing.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('food_items').insert(payload);
        if (e) throw e;
      }

      setModalOpen(false);
      loadData();
    } catch {
      setFormError('Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const { error: e } = await supabase.from('food_items').delete().eq('id', deleteTarget.id);
      if (e) throw e;
      setDeleteTarget(null);
      loadData();
    } catch {
      setError('Failed to delete item.');
    }
  }

  async function toggleAvailability(item: FoodItem) {
    const { error: e } = await supabase
      .from('food_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);
    if (e) {
      setError('Failed to update availability.');
      return;
    }
    loadData();
  }

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCat === 'all' || item.category_id === filterCat;
    return matchesSearch && matchesCat;
  });

  if (loading) return <Loading label="Loading menu..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Menu Items</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your canteen's food menu</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No menu items found"
          message="Add your first food item to get started."
          action={
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={18} />
              Add Item
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all group"
            >
              <div className="relative h-32 bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <UtensilsCrossed size={36} className="text-primary-300" />
                )}
                <button
                  onClick={() => toggleAvailability(item)}
                  className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                    item.is_available
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {item.is_available ? 'Available' : 'Unavailable'}
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-slate-800 text-sm leading-tight">{item.name}</h3>
                  <span className="text-base font-bold text-primary-600 whitespace-nowrap">
                    {formatCurrency(Number(item.price))}
                  </span>
                </div>
                {item.category && (
                  <div className="flex items-center gap-1 mb-2">
                    <Tag size={11} className="text-slate-400" />
                    <span className="text-xs text-slate-400">{item.category.name}</span>
                  </div>
                )}
                {item.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{item.description}</p>
                )}
                <div className="flex gap-2 pt-2 border-t border-slate-50">
                  <button
                    onClick={() => openEdit(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Menu Item' : 'Add Menu Item'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              placeholder="e.g. Veg Sandwich"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all resize-none"
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (₹)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prep Time (min)</label>
              <input
                type="number"
                value={form.prep_time_minutes}
                onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                placeholder="15"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500/20"
            />
            <span className="text-sm text-slate-700">Available for ordering</span>
          </label>
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

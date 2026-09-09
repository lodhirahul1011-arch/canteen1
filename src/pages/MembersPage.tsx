import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Member } from '@/lib/types';
import Modal from '@/components/Modal';
import Loading from '@/components/Loading';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Plus, Users, Pencil, Trash2, Search, UserCheck, UserX } from 'lucide-react';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    is_active: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase.from('members').select('*').order('created_at', { ascending: false });
      if (e) throw e;
      setMembers((data || []) as Member[]);
    } catch {
      setError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', employee_id: '', is_active: true });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(member: Member) {
    setEditing(member);
    setForm({
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      employee_id: member.employee_id || '',
      is_active: member.is_active,
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
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        employee_id: form.employee_id.trim() || null,
        is_active: form.is_active,
      };

      if (editing) {
        const { error: e } = await supabase.from('members').update(payload).eq('id', editing.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('members').insert(payload);
        if (e) throw e;
      }

      setModalOpen(false);
      loadData();
    } catch {
      setFormError('Failed to save member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const { error: e } = await supabase.from('members').delete().eq('id', deleteTarget.id);
      if (e) throw e;
      setDeleteTarget(null);
      loadData();
    } catch {
      setError('Failed to delete member.');
    }
  }

  async function toggleActive(member: Member) {
    const { error: e } = await supabase
      .from('members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);
    if (e) {
      setError('Failed to update member.');
      return;
    }
    loadData();
  }

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.employee_id || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading label="Loading members..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Members</h1>
          <p className="text-sm text-slate-400 mt-1">Manage canteen members and customers</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Member
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, or employee ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members found"
          message="Add your first canteen member to get started."
          action={
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={18} />
              Add Member
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm ${
                    member.is_active ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{member.name}</h3>
                    {member.employee_id && (
                      <p className="text-xs text-slate-400">ID: {member.employee_id}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(member)}
                  className={`p-1.5 rounded-lg transition-colors ${member.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  title={member.is_active ? 'Deactivate' : 'Activate'}
                >
                  {member.is_active ? <UserCheck size={18} /> : <UserX size={18} />}
                </button>
              </div>

              <div className="space-y-1.5 mb-3">
                {member.email && (
                  <p className="text-xs text-slate-500">{member.email}</p>
                )}
                {member.phone && (
                  <p className="text-xs text-slate-500">{member.phone}</p>
                )}
                <p className="text-xs text-slate-400">Joined: {formatDate(member.created_at)}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div>
                  <p className="text-xs text-slate-400">Balance</p>
                  <p className="text-sm font-semibold text-slate-700">{formatCurrency(Number(member.balance))}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(member)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(member)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Member' : 'Add Member'}>
        <div className="space-y-4">
          {formError && <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                placeholder="Phone number"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee ID</label>
            <input
              type="text"
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              placeholder="e.g. EMP001"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500/20"
            />
            <span className="text-sm text-slate-700">Active member (can place orders)</span>
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
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Member'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Member"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Their past orders will remain.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

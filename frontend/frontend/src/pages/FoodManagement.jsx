import { useEffect, useState } from 'react';
import api from '../services/api';

const empty = { name: '', description: '', price: '', image: '', category: '', status: 'ACTIVE' };

export default function FoodManagement() {
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [f, c] = await Promise.all([
        api.get('/foods', { params: { q: search, status: status || undefined } }),
        api.get('/categories', { params: { status: 'ACTIVE' } })
      ]);
      setFoods(f.data.data.foods); setCategories(c.data.data.categories);
    } catch (e) { setError(e.response?.data?.message || 'Unable to load food data'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [search, status]);

  function startEdit(food) {
    setEditing(food._id);
    setForm({ name: food.name, description: food.description || '', price: food.price, image: food.image || '', category: food.category?._id || '', status: food.status });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() { setEditing(null); setForm(empty); }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editing) await api.put(`/foods/${editing}`, payload);
      else await api.post('/foods', payload);
      reset(); await load();
    } catch (e) { setError(e.response?.data?.message || 'Unable to save food'); }
    finally { setSaving(false); }
  }

  async function remove(id) {
    if (!confirm('Delete this food item?')) return;
    try { await api.delete(`/foods/${id}`); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Unable to delete food'); }
  }

  return <div>
    <div className="page-heading"><div><p className="eyebrow">Phase 2</p><h1>Food Management</h1><p className="muted">Manage menu items with real MongoDB CRUD.</p></div></div>
    <div className="management-grid">
      <section className="panel form-panel">
        <h2>{editing ? 'Edit food' : 'Add food'}</h2>
        <form onSubmit={submit}>
          <label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required minLength="2" /></label>
          <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required><option value="">Select category</option>{categories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
          <div className="two-col"><label>Price (₹)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required /></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>ACTIVE</option><option>INACTIVE</option></select></label></div>
          <label>Image URL<input value={form.image} onChange={e=>setForm({...form,image:e.target.value})} placeholder="https://..." /></label>
          <label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows="4" /></label>
          <div className="form-actions"><button className="primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update food' : 'Add food'}</button>{editing && <button type="button" className="secondary" onClick={reset}>Cancel</button>}</div>
        </form>
      </section>
      <section className="panel">
        <div className="toolbar"><input placeholder="Search food..." value={search} onChange={e=>setSearch(e.target.value)} /><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All status</option><option>ACTIVE</option><option>INACTIVE</option></select></div>
        {error && <div className="alert error">{error}</div>}
        {loading ? <p className="muted">Loading...</p> : foods.length === 0 ? <div className="empty">No food items found.</div> :
          <div className="table-wrap"><table><thead><tr><th>Food</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>{foods.map(f=><tr key={f._id}><td><strong>{f.name}</strong><small>{f.description}</small></td><td>{f.category?.name || '—'}</td><td>₹{Number(f.price).toFixed(2)}</td><td><span className={`pill ${f.status.toLowerCase()}`}>{f.status}</span></td><td><button className="link-btn" onClick={()=>startEdit(f)}>Edit</button><button className="danger-btn" onClick={()=>remove(f._id)}>Delete</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </div>;
}

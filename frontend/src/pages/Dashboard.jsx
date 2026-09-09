import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const roleText = {
  MASTER_ADMIN: 'Full system control',
  ADMIN: 'Operations management',
  STAFF: 'Assigned operational access',
  MEMBER: 'Customer access'
};

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [topFoods, setTopFoods] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canViewAnalytics = ['MASTER_ADMIN', 'ADMIN', 'STAFF'].includes(user?.role);

  const loadDashboard = useCallback(async () => {
    if (!canViewAnalytics) return;
    setLoading(true);
    setError('');
    try {
      const [dashboardRes, foodsRes, inventoryRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/top-foods'),
        api.get('/reports/inventory')
      ]);
      setSummary(dashboardRes.data.data.summary);
      setTopFoods(foodsRes.data.data.foods || []);
      setInventory(inventoryRes.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load live dashboard analytics');
    } finally {
      setLoading(false);
    }
  }, [canViewAnalytics]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Canteen Management System</p>
          <h1>Dashboard</h1>
          <p className="muted">Live operational KPIs, revenue, orders, stock health and top-selling foods.</p>
        </div>
        {canViewAnalytics && <button className="secondary" onClick={loadDashboard} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh data'}</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {canViewAnalytics && summary ? (
        <>
          <div className="stats">
            <article className="stat"><span>Total orders</span><strong>{summary.orders}</strong><small>{summary.completed} completed · {summary.cancelled} cancelled</small></article>
            <article className="stat"><span>Revenue</span><strong>{money(summary.revenue)}</strong><small>Non-cancelled orders</small></article>
            <article className="stat"><span>Purchases</span><strong>{money(summary.purchases)}</strong><small>Recorded purchase spend</small></article>
            <article className="stat"><span>Low stock</span><strong>{summary.lowStock}</strong><small>{summary.activeFoods} active foods</small></article>
          </div>

          <div className="panel-grid">
            <section className="panel">
              <h2>Top-selling foods</h2>
              {topFoods.length ? <div className="table-wrap"><table><thead><tr><th>Food</th><th>Qty</th><th>Sales</th></tr></thead><tbody>{topFoods.slice(0, 5).map((food) => <tr key={food._id}><td>{food.name}</td><td>{food.quantity}</td><td>{money(food.sales)}</td></tr>)}</tbody></table></div> : <p className="muted">No food sales in the current reporting window.</p>}
            </section>

            <section className="panel">
              <h2>Inventory health</h2>
              {inventory ? <div className="stats"><article className="stat"><span>Total units</span><strong>{inventory.totalUnits}</strong></article><article className="stat"><span>Stock value</span><strong>{money(inventory.stockValue)}</strong></article><article className="stat"><span>Low-stock items</span><strong>{inventory.lowStock?.length || 0}</strong></article></div> : <p className="muted">Inventory data unavailable.</p>}
            </section>
          </div>
        </>
      ) : (
        <div className="stats">
          <article className="stat"><span>Role</span><strong>{user?.role?.replace('_', ' ')}</strong><small>{roleText[user?.role]}</small></article>
          <article className="stat"><span>Account</span><strong>Active</strong><small>Authenticated session</small></article>
          <article className="stat"><span>Security</span><strong>JWT</strong><small>Access + rotating refresh token</small></article>
          <article className="stat"><span>API</span><strong>v1</strong><small>REST architecture</small></article>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import Loading from '@/components/Loading';
import { ErrorState } from '@/components/EmptyState';
import { TrendingUp, Receipt, Package, Users, BarChart3, Download } from 'lucide-react';

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalPurchases: number;
  totalPurchaseCost: number;
  activeMembers: number;
  totalInventoryValue: number;
  topItems: { food_name: string; total_qty: number; total_revenue: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  statusBreakdown: { status: string; count: number; total: number }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    loadReport();
  }, [dateRange]);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startIso = startDate.toISOString();

      const dateFilter = dateRange === 'all' ? {} : { gte: startIso };

      const [ordersRes, purchasesRes, membersRes, inventoryRes, orderItemsRes] = await Promise.all([
        supabase.from('orders').select('total, status, created_at, subtotal').neq('status', 'cancelled').order('created_at', { ascending: false }),
        supabase.from('purchases').select('total_cost, created_at').eq('status', 'received'),
        supabase.from('members').select('id, is_active'),
        supabase.from('inventory_items').select('quantity, cost_per_unit'),
        supabase.from('order_items').select('food_name, quantity, line_total'),
      ]);

      const orders = ordersRes.data || [];
      const purchases = purchasesRes.data || [];

      // Filter by date range
      const filteredOrders = dateRange === 'all' ? orders : orders.filter((o) => o.created_at >= startIso);
      const filteredPurchases = dateRange === 'all' ? purchases : purchases.filter((p) => p.created_at >= startIso);

      const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const totalOrders = filteredOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalPurchaseCost = filteredPurchases.reduce((sum, p) => sum + Number(p.total_cost), 0);
      const activeMembers = (membersRes.data || []).filter((m) => m.is_active).length;
      const totalInventoryValue = (inventoryRes.data || []).reduce(
        (sum, i) => sum + Number(i.quantity) * Number(i.cost_per_unit),
        0
      );

      // Top items
      const itemMap = new Map<string, { qty: number; revenue: number }>();
      (orderItemsRes.data || []).forEach((item) => {
        const existing = itemMap.get(item.food_name) || { qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += Number(item.line_total);
        itemMap.set(item.food_name, existing);
      });
      const topItems = Array.from(itemMap.entries())
        .map(([name, v]) => ({ food_name: name, total_qty: v.qty, total_revenue: v.revenue }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);

      // Daily revenue (last 7 days)
      const dailyMap = new Map<string, { revenue: number; orders: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyMap.set(key, { revenue: 0, orders: 0 });
      }
      filteredOrders.forEach((o) => {
        const key = o.created_at.split('T')[0];
        const existing = dailyMap.get(key);
        if (existing) {
          existing.revenue += Number(o.total);
          existing.orders += 1;
        }
      });
      const dailyRevenue = Array.from(dailyMap.entries()).map(([date, v]) => ({
        date,
        revenue: v.revenue,
        orders: v.orders,
      }));

      // Status breakdown
      const statusMap = new Map<string, { count: number; total: number }>();
      orders.forEach((o) => {
        const existing = statusMap.get(o.status) || { count: 0, total: 0 };
        existing.count += 1;
        existing.total += Number(o.total);
        statusMap.set(o.status, existing);
      });
      const statusBreakdown = Array.from(statusMap.entries()).map(([status, v]) => ({
        status,
        count: v.count,
        total: v.total,
      }));

      setData({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalPurchases: filteredPurchases.length,
        totalPurchaseCost,
        activeMembers,
        totalInventoryValue,
        topItems,
        dailyRevenue,
        statusBreakdown,
      });
    } catch {
      setError('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', String(data.totalRevenue)],
      ['Total Orders', String(data.totalOrders)],
      ['Avg Order Value', String(data.avgOrderValue.toFixed(2))],
      ['Total Purchases', String(data.totalPurchases)],
      ['Total Purchase Cost', String(data.totalPurchaseCost)],
      ['Active Members', String(data.activeMembers)],
      ['Inventory Value', String(data.totalInventoryValue)],
      [],
      ['Top Items', '', ''],
      ['Item', 'Quantity Sold', 'Revenue'],
      ...data.topItems.map((i) => [i.food_name, String(i.total_qty), String(i.total_revenue)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canteen-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <Loading label="Generating report..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const maxRevenue = Math.max(...data.dailyRevenue.map((d) => d.revenue), 1);

  const summaryCards = [
    { label: 'Total Revenue', value: formatCurrency(data.totalRevenue), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Orders', value: String(data.totalOrders), icon: Receipt, color: 'bg-blue-50 text-blue-600' },
    { label: 'Avg Order Value', value: formatCurrency(data.avgOrderValue), icon: BarChart3, color: 'bg-amber-50 text-amber-600' },
    { label: 'Purchase Cost', value: formatCurrency(data.totalPurchaseCost), icon: Package, color: 'bg-red-50 text-red-600' },
    { label: 'Active Members', value: String(data.activeMembers), icon: Users, color: 'bg-secondary-50 text-secondary-600' },
    { label: 'Inventory Value', value: formatCurrency(data.totalInventoryValue), icon: Package, color: 'bg-primary-50 text-primary-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">Operational and financial insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7' | '30' | '90' | 'all')}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Revenue (Last 7 Days)</h2>
          <div className="flex items-end justify-between gap-2 h-48">
            {data.dailyRevenue.map((d) => {
              const heightPct = (d.revenue / maxRevenue) * 100;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full flex items-end justify-center h-full relative">
                    <div
                      className="w-full max-w-[40px] bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all hover:from-primary-700 hover:to-primary-500 cursor-pointer relative"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {formatCurrency(d.revenue)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Order Status Breakdown</h2>
          <div className="space-y-3">
            {data.statusBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No orders yet</p>
            ) : (
              data.statusBreakdown.map((s) => {
                const totalOrders = data.statusBreakdown.reduce((sum, x) => sum + x.count, 0);
                const pct = totalOrders > 0 ? (s.count / totalOrders) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-600 capitalize">{s.status}</span>
                      <span className="text-sm text-slate-400">
                        {s.count} orders · {formatCurrency(s.total)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Top selling items */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Top Selling Items</h2>
        </div>
        {data.topItems.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No sales data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty Sold</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.topItems.map((item, idx) => (
                  <tr key={item.food_name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-700">{item.food_name}</td>
                    <td className="px-5 py-3.5 text-right text-sm text-slate-600">{item.total_qty}</td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-700">{formatCurrency(item.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

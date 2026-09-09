import { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Receipt,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils';
import type { Order } from '@/lib/types';
import Loading from '@/components/Loading';
import { ErrorState } from '@/components/EmptyState';

interface DashboardStats {
  todayRevenue: number;
  todayOrderCount: number;
  totalMembers: number;
  lowStockCount: number;
  pendingOrders: number;
  totalInventoryValue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<{ name: string; quantity: number; unit: string; min_stock_level: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [ordersToday, membersCount, inventoryData, pendingOrdersData, recentOrdersData] =
        await Promise.all([
          supabase
            .from('orders')
            .select('total, status')
            .gte('created_at', todayIso)
            .neq('status', 'cancelled'),
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('inventory_items').select('name, quantity, unit, min_stock_level, cost_per_unit'),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'preparing']),
          supabase
            .from('orders')
            .select('id, order_number, status, total, created_at, member:members(name)')
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

      const todayRevenue = (ordersToday.data || []).reduce((sum, o) => sum + Number(o.total), 0);
      const todayOrderCount = (ordersToday.data || []).length;
      const totalInventoryValue = (inventoryData.data || []).reduce(
        (sum, i) => sum + Number(i.quantity) * Number(i.cost_per_unit),
        0
      );
      const lowStock = (inventoryData.data || []).filter(
        (i) => Number(i.quantity) <= Number(i.min_stock_level)
      );

      setStats({
        todayRevenue,
        todayOrderCount,
        totalMembers: membersCount.count || 0,
        lowStockCount: lowStock.length,
        pendingOrders: pendingOrdersData.count || 0,
        totalInventoryValue,
      });
      setRecentOrders((recentOrdersData.data || []) as unknown as Order[]);
      setLowStockItems(lowStock as { name: string; quantity: number; unit: string; min_stock_level: number }[]);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!stats) return null;

  const cards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: "Today's Orders",
      value: String(stats.todayOrderCount),
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Pending Orders',
      value: String(stats.pendingOrders),
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Total Members',
      value: String(stats.totalMembers),
      icon: Users,
      color: 'bg-secondary-50 text-secondary-600',
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(stats.totalInventoryValue),
      icon: Package,
      color: 'bg-primary-50 text-primary-600',
    },
    {
      label: 'Low Stock Alerts',
      value: String(stats.lowStockCount),
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Overview of your canteen operations</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
            >
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Receipt size={18} className="text-slate-400" />
            <h2 className="font-semibold text-slate-700">Recent Orders</h2>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No orders yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <ShoppingCart size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{order.order_number}</p>
                      <p className="text-xs text-slate-400">
                        {order.member?.name || 'Walk-in'} · {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{formatCurrency(Number(order.total))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="font-semibold text-slate-700">Low Stock Alerts</h2>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">All items well stocked</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
              {lowStockItems.map((item) => (
                <div key={item.name} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      Min: {item.min_stock_level} {item.unit}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

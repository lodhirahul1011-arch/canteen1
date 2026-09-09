import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  BarChart3,
  Users,
  Bell,
  Menu as MenuIcon,
  X,
  ChefHat,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/lib/types';

export type PageKey =
  | 'dashboard'
  | 'menu'
  | 'orders'
  | 'inventory'
  | 'purchases'
  | 'billing'
  | 'reports'
  | 'members';

interface SidebarProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
}

const NAV_ITEMS: { key: PageKey; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'menu', label: 'Menu Items', icon: UtensilsCrossed },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'purchases', label: 'Purchases', icon: Truck },
  { key: 'billing', label: 'Billing', icon: Receipt },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'members', label: 'Members', icon: Users },
];

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  const [notifCount, setNotifCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    loadNotifCount();
  }, [current]);

  async function loadNotifCount() {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    setNotifCount(count || 0);
  }

  function handleNav(page: PageKey) {
    onNavigate(page);
    setMobileOpen(false);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <ChefHat size={22} className="text-primary-600" />
          <span className="font-bold text-slate-800">Canteen ERP</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <MenuIcon size={22} className="text-slate-600" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm leading-tight">Canteen ERP</h1>
              <p className="text-[10px] text-slate-400 leading-tight">Management System</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-slate-100"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={19} className={active ? 'text-primary-600' : 'text-slate-400'} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === 'orders' && notifCount > 0 && (
                  <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Bell size={14} />
            <span>{notifCount} unread notifications</span>
          </div>
        </div>
      </aside>
    </>
  );
}

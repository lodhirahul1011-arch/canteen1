import { useState } from 'react';
import Sidebar, { type PageKey } from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import MenuPage from '@/pages/MenuPage';
import OrdersPage from '@/pages/OrdersPage';
import InventoryPage from '@/pages/InventoryPage';
import PurchasesPage from '@/pages/PurchasesPage';
import BillingPage from '@/pages/BillingPage';
import ReportsPage from '@/pages/ReportsPage';
import MembersPage from '@/pages/MembersPage';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 lg:ml-0 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {page === 'dashboard' && <Dashboard />}
          {page === 'menu' && <MenuPage />}
          {page === 'orders' && <OrdersPage />}
          {page === 'inventory' && <InventoryPage />}
          {page === 'purchases' && <PurchasesPage />}
          {page === 'billing' && <BillingPage />}
          {page === 'reports' && <ReportsPage />}
          {page === 'members' && <MembersPage />}
        </div>
      </main>
    </div>
  );
}

export default App;

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menu = [
  ['/', 'Dashboard'],
  ['/foods', '🍽️ Food'],
  ['/categories', '🗂️ Categories'],
  ['/members', '👥 Members'],
  ['/staff', '🧑‍🍳 Staff'],
  ['/suppliers', '🚚 Suppliers'],
  ['/purchases', '🧾 Purchases'],
  ['/inventory', '📦 Inventory'],
  ['/orders', '🛒 Orders'],
  ['/billing', '🧾 Billing'],
  ['/payments', '💳 Payments'],
  ['/reports', '📊 Reports'],
  ['/notifications', '🔔 Notifications'],
  ['/phase-status', 'Phase Status']
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = user?.role;
  const hiddenByRole = {
    '/staff': !['MASTER_ADMIN','ADMIN'].includes(role),
    '/suppliers': !['MASTER_ADMIN','ADMIN','STAFF'].includes(role),
    '/purchases': !['MASTER_ADMIN','ADMIN'].includes(role),
    '/inventory': !['MASTER_ADMIN','ADMIN','STAFF'].includes(role),
    '/orders': !['MASTER_ADMIN','ADMIN','STAFF','MEMBER'].includes(role),
    '/billing': !['MASTER_ADMIN','ADMIN','STAFF','MEMBER'].includes(role),
    '/payments': !['MASTER_ADMIN','ADMIN','STAFF'].includes(role),
    '/reports': !['MASTER_ADMIN','ADMIN','STAFF'].includes(role),
    '/notifications': false,
    '/members': !['MASTER_ADMIN','ADMIN','STAFF'].includes(role),
  };
  const visibleMenu = menu.filter(([href]) => !hiddenByRole[href]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">🍴</span>
          <div>
            <strong>Canteen ERP</strong>
            <small>Phase 3</small>
          </div>
        </div>

        <nav>
          {visibleMenu.map(([href, label]) => (
            <Link className={location.pathname === href ? 'nav-link active' : 'nav-link'} to={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>

        <button className="logout" onClick={logout}>Logout</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <strong>{user?.role?.replace('_', ' ')}</strong>
            <span>{user?.email}</span>
          </div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}

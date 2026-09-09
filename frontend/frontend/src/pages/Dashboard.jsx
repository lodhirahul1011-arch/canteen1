import { useAuth } from '../context/AuthContext';

const roleText = {
  MASTER_ADMIN: 'Full system control',
  ADMIN: 'Operations management',
  STAFF: 'Assigned operational access',
  MEMBER: 'Customer access'
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Canteen Management System</p>
          <h1>Dashboard</h1>
          <p className="muted">Phase 3 operations, billing, reporting and notifications are active.</p>
        </div>
      </div>

      <div className="stats">
        <article className="stat"><span>Role</span><strong>{user.role.replace('_', ' ')}</strong><small>{roleText[user.role]}</small></article>
        <article className="stat"><span>Account</span><strong>Active</strong><small>Authenticated session</small></article>
        <article className="stat"><span>Security</span><strong>JWT</strong><small>Access + rotating refresh token</small></article>
        <article className="stat"><span>API</span><strong>v1</strong><small>REST architecture</small></article>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Phase 3 complete</h2>
          <ul className="check-list">
            <li>React + Vite frontend</li>
            <li>Node + Express backend</li>
            <li>MongoDB + Mongoose</li>
            <li>JWT authentication</li>
            <li>Role-based authorization foundation</li>
            <li>Validation + centralized errors</li>
            <li>Security middleware + rate limits</li>
            <li>Health/readiness endpoints</li>
            <li>Orders + inventory stock deduction</li>
            <li>Payments + billing records</li>
            <li>Reports + sales analytics</li>
            <li>In-app notifications</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Phase 3 modules</h2>
          <ul className="check-list">
            <li>Orders & lifecycle management</li>
            <li>Billing & payment records</li>
            <li>Reports & sales analytics</li>
            <li>In-app notifications</li>
            <li>Inventory issue ledger integration</li>
          </ul>
        </section>
      </div>
    </>
  );
}

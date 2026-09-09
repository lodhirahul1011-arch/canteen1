import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PhaseStatus from './pages/PhaseStatus';
import FoodManagement from './pages/FoodManagement';
import CategoryManagement from './pages/CategoryManagement';
import MemberManagement from './pages/MemberManagement';
import StaffManagement from './pages/StaffManagement';
import SupplierManagement from './pages/SupplierManagement';
import PurchaseManagement from './pages/PurchaseManagement';
import InventoryManagement from './pages/InventoryManagement';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Billing from './pages/Billing';
import './styles.css';

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/phase-status" element={<ProtectedLayout><PhaseStatus /></ProtectedLayout>} />
          <Route path="/foods" element={<ProtectedLayout><FoodManagement /></ProtectedLayout>} />
          <Route path="/categories" element={<ProtectedLayout><CategoryManagement /></ProtectedLayout>} />
          <Route path="/members" element={<ProtectedLayout><MemberManagement /></ProtectedLayout>} />
          <Route path="/staff" element={<ProtectedLayout><StaffManagement /></ProtectedLayout>} />
          <Route path="/suppliers" element={<ProtectedLayout><SupplierManagement /></ProtectedLayout>} />
          <Route path="/purchases" element={<ProtectedLayout><PurchaseManagement /></ProtectedLayout>} />
          <Route path="/inventory" element={<ProtectedLayout><InventoryManagement /></ProtectedLayout>} />
          <Route path="/orders" element={<ProtectedLayout><Orders /></ProtectedLayout>} />
          <Route path="/billing" element={<ProtectedLayout><Billing /></ProtectedLayout>} />
          <Route path="/payments" element={<ProtectedLayout><Payments /></ProtectedLayout>} />
          <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
          <Route path="/notifications" element={<ProtectedLayout><Notifications /></ProtectedLayout>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import MainDashboard from './pages/dashboard/MainDashboard';
import SalesDashboard from './pages/dashboard/SalesDashboard'; 
import CustomersPage from './pages/customers/CustomersPage';
import InventoryPage from './pages/inventory/InventoryPage';
import AddGRNPage from './pages/inventory/AddGRNPage';
import RawMaterialsPage from './pages/inventory/RawMaterialsPage';
import AddRawMaterialGRNPage from './pages/inventory/AddRawMaterialGRNPage';
import RawMaterialIssuePage from './pages/inventory/RawMaterialIssuePage';
import ReturnsAndDamagesPage from './pages/inventory/ReturnsAndDamagesPage'; 

// --- අලුත් Reports Path එක මෙතනට Update කළා ---
import ReportsPage from './pages/reports/ReportsPage'; 

import OrdersPage from './pages/orders/OrdersPage';
import PurchaseOrder from './pages/orders/PurchaseOrder'; 
import AgencyOrdersPage from './pages/orders/AgencyOrdersPage'; 
import AdminPermissions from './pages/admin/Permissions'; 
import CompanySetup from './pages/admin/CompanySetup';
import SuppliersPage from './pages/inventory/SuppliersPage'; 
import SalesInvoice from './pages/sales/SalesInvoice'; 
import CustomerLedger from './pages/finance/CustomerLedger'; 
import PaymentManager from './pages/finance/PaymentManager'; 
import PaymentRouterPage from './pages/finance/PaymentRouterPage'; 
import TransportDashboard from './pages/transport/TransportDashboard'; 
import TransportSetup from './pages/transport/TransportSetup'; 
import TransportLog from './pages/transport/TransportLog'; 
import ActivityLogPage from './pages/admin/ActivityLogPage';
import UserManagement from './pages/Settings/UserManagement'; 
import Regions from './pages/admin/Regions'; 

// HRM & Maintenance
import EmployeeManagement from './pages/HRM/EmployeeManagement';
import PayrollPage from './pages/HRM/PayrollPage';
import VehicleMaintenance from './pages/transport/VehicleMaintenance';

import { supabase } from './supabaseClient';

// ─── Permission-based Route Guard ─────────────────────────────────────────────
const ProtectedRoute = ({ children, permId }: { children: React.ReactNode; permId: string }) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAllowed(false); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', user.id)
        .single();
      const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
      setAllowed(isSuperAdmin || !!profile?.permissions?.[permId]);
    };
    check();
  }, [permId]);

  if (allowed === null) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!allowed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-black text-gray-700 uppercase">Access Denied</h2>
        <p className="text-gray-400 font-bold mt-2">You don't have permission to view this page.</p>
        <a href="/" className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase hover:bg-blue-700">
          Go to Dashboard
        </a>
      </div>
    </div>
  );

  return <>{children}</>;
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<any>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, 10 * 60 * 1000); 
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) resetTimer();
    });

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    if (session) {
      events.forEach(event => window.addEventListener(event, resetTimer));
      resetTimer();
    }

    return () => {
      subscription.unsubscribe();
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [session]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-white font-black uppercase italic text-slate-400 tracking-widest">Verifying Session...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />
        
        <Route element={session ? <MainLayout /> : <Navigate to="/login" />}>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/dashboard/sales" element={<SalesDashboard />} />
          
          <Route path="/hrm/employees" element={<ProtectedRoute permId="hrm_access"><EmployeeManagement /></ProtectedRoute>} />
          <Route path="/hrm/payroll" element={<ProtectedRoute permId="hrm_access"><PayrollPage /></ProtectedRoute>} />

          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/raw-materials" element={<RawMaterialsPage />} />
          <Route path="/inventory/raw-materials/grn/new" element={<ProtectedRoute permId="inv_raw_material_grn"><AddRawMaterialGRNPage /></ProtectedRoute>} />
          <Route path="/inventory/raw-materials/issue/new" element={<RawMaterialIssuePage />} />
          <Route path="/inventory/returns" element={<ProtectedRoute permId="inv_returns_damages"><ReturnsAndDamagesPage /></ProtectedRoute>} />
          <Route path="/inventory/grn/new" element={<ProtectedRoute permId="inv_add_grn"><AddGRNPage /></ProtectedRoute>} />
          <Route path="/inventory/reports" element={<ProtectedRoute permId="inv_stock_movement"><ReportsPage /></ProtectedRoute>} />
          <Route path="/inventory/suppliers" element={<SuppliersPage />} />

          <Route path="/customers" element={<ProtectedRoute permId="customer_view"><CustomersPage /></ProtectedRoute>} />

          <Route path="/orders" element={<ProtectedRoute permId="sales_all_invoices_view"><OrdersPage /></ProtectedRoute>} />
          <Route path="/orders/new" element={<ProtectedRoute permId="sales_purchase_order"><PurchaseOrder /></ProtectedRoute>} />
          
          <Route path="/sales/new-invoice" element={<ProtectedRoute permId="sales_new_invoice"><SalesInvoice /></ProtectedRoute>} />
          <Route path="/sales/agencies" element={<ProtectedRoute permId="sales_agency_orders"><AgencyOrdersPage /></ProtectedRoute>} />

          <Route path="/finance/ledger" element={<ProtectedRoute permId="customer_ledger_view"><CustomerLedger /></ProtectedRoute>} />
          <Route path="/finance/payments" element={<ProtectedRoute permId="finance_payment_view"><PaymentManager /></ProtectedRoute>} />
          <Route path="/finance/payment-router" element={<ProtectedRoute permId="finance_payment_router"><PaymentRouterPage /></ProtectedRoute>} />

          <Route path="/transport" element={<TransportDashboard />} />
          <Route path="/transport/setup" element={<ProtectedRoute permId="transport_vehicle_view"><TransportSetup /></ProtectedRoute>} />
          <Route path="/transport/log" element={<ProtectedRoute permId="transport_triplog"><TransportLog /></ProtectedRoute>} />
          <Route path="/transport/maintenance" element={<VehicleMaintenance />} />

          <Route path="/admin/permissions" element={<AdminPermissions />} />
          <Route path="/admin/company-setup" element={<CompanySetup />} />
          <Route path="/admin/activity-log" element={<ActivityLogPage />} /> 
          <Route path="/settings/users" element={<UserManagement />} />
          <Route path="/admin/regions" element={<Regions />} /> 

          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
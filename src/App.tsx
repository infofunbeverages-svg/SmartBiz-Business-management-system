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
import UserManagement from './pages/settings/UserManagement'; 
import Regions from './pages/admin/Regions'; 

// HRM & Maintenance
import EmployeeManagement from './pages/HRM/EmployeeManagement';
import PayrollPage from './pages/HRM/PayrollPage';
import VehicleMaintenance from './pages/transport/VehicleMaintenance';

import { supabase } from './supabaseClient';

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
          
          <Route path="/hrm/employees" element={<EmployeeManagement />} />
          <Route path="/hrm/payroll" element={<PayrollPage />} />

          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/raw-materials" element={<RawMaterialsPage />} />
          <Route path="/inventory/raw-materials/grn/new" element={<AddRawMaterialGRNPage />} />
          <Route path="/inventory/returns" element={<ReturnsAndDamagesPage />} />
          <Route path="/inventory/grn/new" element={<AddGRNPage />} />
          
          {/* --- Route එක පරණ විදිහටම තියෙනවා, හැබැයි Import එක උඩින් වෙනස් කරලා තියෙන්නේ --- */}
          <Route path="/inventory/reports" element={<ReportsPage />} /> 
          
          <Route path="/inventory/suppliers" element={<SuppliersPage />} />

          <Route path="/customers" element={<CustomersPage />} />

          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/new" element={<PurchaseOrder />} />
          
          <Route path="/sales/new-invoice" element={<SalesInvoice />} />
          <Route path="/sales/agencies" element={<AgencyOrdersPage />} />

          <Route path="/finance/ledger" element={<CustomerLedger />} />
          <Route path="/finance/payments" element={<PaymentManager />} />
          <Route path="/finance/payment-router" element={<PaymentRouterPage />} />

          <Route path="/transport" element={<TransportDashboard />} />
          <Route path="/transport/setup" element={<TransportSetup />} />
          <Route path="/transport/log" element={<TransportLog />} />
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
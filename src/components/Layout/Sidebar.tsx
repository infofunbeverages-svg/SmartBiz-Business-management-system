import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, ShoppingCart, 
  DollarSign, ChevronDown, LogOut, Settings, 
  X, Truck, UserCircle, FileBarChart // FileBarChart icon එක අලුතින් ගත්තා
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { supabase } from '../../supabaseClient';

type SidebarProps = {
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const Sidebar: React.FC<SidebarProps> = ({ isMobileSidebarOpen, setIsMobileSidebarOpen }) => {
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const handleLinkClick = () => { if (window.innerWidth < 1024) setIsMobileSidebarOpen(false); };
  
  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { title: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, show: true },
    {
      title: 'Inventory',
      icon: <Package size={20} />,
      show: true,
      submenu: [
        { title: 'Products List', path: '/inventory', show: true },
        { title: 'Raw Materials', path: '/inventory/raw-materials', show: true },
        { title: 'Suppliers List', path: '/inventory/suppliers', show: true },
        { title: 'Add GRN (Stock In)', path: '/inventory/grn/new', show: true },
        { title: 'Add Raw Material GRN', path: '/inventory/raw-materials/grn/new', show: true },
        { title: 'Returns & Damages', path: '/inventory/returns', show: true },
        { title: 'Stock Movement', path: '/inventory/reports', show: true },
      ]
    },
    {
      title: 'Sales & Orders',
      icon: <ShoppingCart size={20} />,
      show: true,
      submenu: [
        { title: 'Sales Dashboard', path: '/dashboard/sales', show: true },
        { title: 'New Invoice', path: '/sales/new-invoice', show: true },
        { title: 'Purchase Order', path: '/orders/new', show: true },
        { title: 'All Invoices / Orders', path: '/orders', show: true },
        { title: 'Agency Orders', path: '/sales/agencies', show: true },
      ]
    },
    { title: 'Customers', path: '/customers', icon: <Users size={20} />, show: true },
    { 
      title: 'Finance', 
      icon: <DollarSign size={20} />, 
      show: true,
      submenu: [
        { title: 'Customer Ledger', path: '/finance/ledger', show: true },
        { title: 'Payments & Returns', path: '/finance/payments', show: true },
        { title: 'Payment Router', path: '/finance/payment-router', show: true },
      ]
    },
    // --- මෙතනට තමයි අලුත් Reports Module එක දැම්මේ ---
    { 
      title: 'Analytical Reports', 
      icon: <FileBarChart size={20} />, 
      show: true,
      submenu: [
        { title: 'System Wide Reports', path: '/inventory/reports', show: true },
      ]
    },
    { 
      title: 'Human Resources', 
      icon: <UserCircle size={20} />, 
      show: true,
      submenu: [
        { title: 'Staff Directory', path: '/hrm/employees', show: true },
        { title: 'Payroll System', path: '/hrm/payroll', show: true },
      ]
    },
    { 
      title: 'Transport', 
      icon: <Truck size={20} />, 
      show: true,
      submenu: [
        { title: 'Fleet Overview', path: '/transport', show: true },
        { title: 'Daily Trip Log', path: '/transport/log', show: true },
        { title: 'Maintenance Logs', path: '/transport/maintenance', show: true },
        { title: 'Vehicle Setup', path: '/transport/setup', show: true },
      ]
    },
    { 
      title: 'Admin & Settings', 
      icon: <Settings size={20} />, 
      show: true,
      submenu: [
        { title: 'Activity Logs', path: '/admin/activity-log', show: true },
        { title: 'User Management', path: '/settings/users', show: true },
        { title: 'Permissions', path: '/admin/permissions', show: true },
        { title: 'Company Setup', path: '/admin/company-setup', show: true },
        { title: 'Region Management', path: '/admin/regions', show: true },
      ]
    },
  ];

  return (
    <>
      {/* Mobile: overlay when sidebar open — popup feel */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-[70] h-full bg-white border-r border-gray-200 pt-5 flex flex-col transition-transform duration-300 ease-out",
          "w-[min(280px,85vw)] lg:w-64",
          "shadow-xl lg:shadow-none",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="px-4 sm:px-6 flex items-center justify-between mb-4 sm:mb-6">
          <Link to="/" className="flex items-center space-x-2 min-h-[44px]" onClick={handleLinkClick}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg flex-shrink-0">S</div>
            <span className="font-black text-lg sm:text-xl text-gray-800 tracking-tighter italic truncate">SmartBiz<span className="text-blue-600">ERP</span></span>
          </Link>
          <button type="button" className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Close menu"><X size={22} /></button>
        </div>

        <nav className="flex-1 px-3 sm:px-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.filter(item => item.show).map((item) => (
            <div key={item.title}>
              {item.submenu ? (
                <div>
                  <button 
                    type="button"
                    onClick={() => toggleSubmenu(item.title)}
                    className={cn("w-full flex items-center px-4 py-3.5 min-h-[44px] text-sm font-black rounded-xl transition-all touch-manipulation", 
                      item.submenu.some(s => isActive(s.path)) ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50")
                    }
                  >
                    <span className="mr-3 opacity-70 flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left uppercase text-[10px] tracking-widest">{item.title}</span>
                    <ChevronDown size={14} className={cn("flex-shrink-0 transition-transform", openSubmenu === item.title ? "rotate-180" : "")} />
                  </button>
                  {openSubmenu === item.title && (
                    <div className="ml-6 border-l-2 border-blue-100 pl-4 mt-1 space-y-1">
                      {item.submenu.map((sub) => (
                        <Link key={sub.title} to={sub.path} onClick={handleLinkClick} className={cn("block py-2.5 min-h-[40px] flex items-center text-[10px] font-black uppercase text-left transition-colors", isActive(sub.path) ? "text-blue-600" : "text-gray-400 hover:text-blue-600")}>
                          {sub.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link to={item.path!} onClick={handleLinkClick} className={cn("flex items-center px-4 py-3.5 min-h-[44px] text-sm rounded-xl transition-all touch-manipulation", isActive(item.path!) ? "bg-blue-600 text-white font-black shadow-lg" : "text-gray-500 hover:bg-gray-50 font-bold")}>
                  <span className="mr-3 flex-shrink-0">{item.icon}</span>
                  <span className="uppercase text-[10px] tracking-widest font-black">{item.title}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 italic">
          <button type="button" onClick={() => supabase.auth.signOut()} className="flex items-center w-full px-4 py-3.5 min-h-[44px] text-[10px] font-black text-red-500 rounded-xl hover:bg-red-50 uppercase tracking-widest transition-all touch-manipulation">
            <LogOut size={18} className="mr-3 flex-shrink-0" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
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
      {isMobileSidebarOpen && <div className="fixed inset-0 z-[60] bg-black/50 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />}
      <aside className={cn("fixed top-0 left-0 z-[70] h-full w-64 bg-white border-r border-gray-200 pt-5 flex flex-col transition-all duration-300", isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="px-6 flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center space-x-2" onClick={handleLinkClick}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg">S</div>
            <span className="font-black text-xl text-gray-800 tracking-tighter italic">SmartBiz<span className="text-blue-600">ERP</span></span>
          </Link>
          <button className="lg:hidden p-2 text-gray-500" onClick={() => setIsMobileSidebarOpen(false)}><X size={20} /></button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.filter(item => item.show).map((item) => (
            <div key={item.title}>
              {item.submenu ? (
                <div>
                  <button 
                    onClick={() => toggleSubmenu(item.title)}
                    className={cn("w-full flex items-center px-4 py-3 text-sm font-black rounded-xl transition-all", 
                      item.submenu.some(s => isActive(s.path)) ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50")
                    }
                  >
                    <span className="mr-3 opacity-70">{item.icon}</span>
                    <span className="flex-1 text-left uppercase text-[10px] tracking-widest">{item.title}</span>
                    <ChevronDown size={14} className={cn("transition-transform", openSubmenu === item.title ? "rotate-180" : "")} />
                  </button>
                  {openSubmenu === item.title && (
                    <div className="ml-6 border-l-2 border-blue-100 pl-4 mt-1 space-y-1">
                      {item.submenu.map((sub) => (
                        <Link key={sub.title} to={sub.path} onClick={handleLinkClick} className={cn("block py-2 text-[10px] font-black uppercase text-left transition-colors", isActive(sub.path) ? "text-blue-600" : "text-gray-400 hover:text-blue-600")}>
                          {sub.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link to={item.path!} onClick={handleLinkClick} className={cn("flex items-center px-4 py-3 text-sm rounded-xl transition-all", isActive(item.path!) ? "bg-blue-600 text-white font-black shadow-lg" : "text-gray-500 hover:bg-gray-50 font-bold")}>
                  <span className="mr-3">{item.icon}</span>
                  <span className="uppercase text-[10px] tracking-widest font-black">{item.title}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 italic">
          <button onClick={() => supabase.auth.signOut()} className="flex items-center w-full px-4 py-3 text-[10px] font-black text-red-500 rounded-xl hover:bg-red-50 uppercase tracking-widest transition-all">
            <LogOut size={18} className="mr-3" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
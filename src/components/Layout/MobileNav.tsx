import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

const MobileNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
      <Link to="/" className={cn("flex flex-col items-center gap-1", isActive('/') ? "text-blue-600" : "text-gray-400")}>
        <LayoutDashboard size={20} />
        <span className="text-[9px] font-black uppercase tracking-tighter italic">Home</span>
      </Link>
      
      <Link to="/sales/new-invoice" className={cn("flex flex-col items-center gap-1", isActive('/sales/new-invoice') ? "text-blue-600" : "text-gray-400")}>
        <ShoppingCart size={20} />
        <span className="text-[9px] font-black uppercase tracking-tighter italic">Sales</span>
      </Link>

      {/* මැද තියෙන Main Action Button එක */}
      <div className="relative -mt-12">
        <Link to="/inventory" className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 border-4 border-white">
          <Package size={24} />
        </Link>
      </div>

      <Link to="/customers" className={cn("flex flex-col items-center gap-1", isActive('/customers') ? "text-blue-600" : "text-gray-400")}>
        <Users size={20} />
        <span className="text-[9px] font-black uppercase tracking-tighter italic">Cust</span>
      </Link>

      <Link to="/settings/users" className={cn("flex flex-col items-center gap-1", isActive('/settings/users') ? "text-blue-600" : "text-gray-400")}>
        <Settings size={20} />
        <span className="text-[9px] font-black uppercase tracking-tighter italic">Setup</span>
      </Link>
    </div>
  );
};

export default MobileNav;
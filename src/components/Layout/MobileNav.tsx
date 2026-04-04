import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

const MobileNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const linkClass = "flex flex-col items-center justify-center gap-1 min-h-[56px] min-w-[56px] py-2 rounded-xl active:scale-95 transition-transform";
  return (
    <div className="lg:hidden print:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-2 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-[2rem] safe-area-pb">
      <Link to="/" className={cn(linkClass, isActive('/') ? "text-blue-600" : "text-gray-400")}>
        <LayoutDashboard size={24} />
        <span className="text-[9px] font-black uppercase tracking-tighter italic">Home</span>
      </Link>
      
      <Link to="/sales/new-invoice" className={cn(linkClass, isActive('/sales/new-invoice') ? "text-blue-600" : "text-gray-400")}>
        <ShoppingCart size={24} />
        <span className="text-[9px] font-black uppercase tracking-tighter italic">Sales</span>
      </Link>

      {/* මැද තියෙන Main Action Button එක - touch friendly */}
      <div className="relative -mt-14">
        <Link to="/inventory" className="w-16 h-16 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 border-4 border-white active:scale-95 transition-transform">
          <Package size={28} />
        </Link>
      </div>

      <Link to="/customers" className={cn(linkClass, isActive('/customers') ? "text-blue-600" : "text-gray-400")}>
        <Users size={24} />
        <span className="text-[9px] font-black uppercase tracking-tighter italic">Cust</span>
      </Link>

      <Link to="/settings/users" className={cn(linkClass, isActive('/settings/users') ? "text-blue-600" : "text-gray-400")}>
        <Settings size={24} />
        <span className="text-[9px] font-black uppercase tracking-tighter italic">Setup</span>
      </Link>
    </div>
  );
};

export default MobileNav;
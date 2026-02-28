import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

const PageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customer Management',
  '/inventory': 'Inventory Management',
  '/inventory/categories': 'Product Categories',
  '/orders': 'Orders Management',
  '/suppliers': 'Supplier Management',
  '/finance': 'Financial Transactions',
  '/finance/reports': 'Financial Reports',
  '/reports': 'Reports & Analytics',
};

const Header: React.FC = () => {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pageTitle = PageTitles[location.pathname] || 'SmartBiz';
  
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:pl-64">
        <div className="flex items-center justify-between h-16">
          {/* Page title */}
          <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
          
          {/* Right side elements */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className={cn(
              "transition-all duration-300",
              isSearchOpen ? "w-64" : "w-9"
            )}>
              <div className="relative w-full">
                <button 
                  className={cn(
                    "absolute inset-y-0 left-0 flex items-center pl-2",
                    isSearchOpen ? "text-gray-500" : "text-gray-700"
                  )}
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                >
                  <Search size={18} />
                </button>
                <input
                  type="text"
                  placeholder="Search..."
                  className={cn(
                    "w-full h-9 pl-9 pr-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300",
                    isSearchOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                  onBlur={() => setIsSearchOpen(false)}
                />
              </div>
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <button className="p-1 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-error-500"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
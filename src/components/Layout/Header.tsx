import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, Menu } from 'lucide-react';
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

type HeaderProps = { onMenuClick?: () => void };

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pageTitle = PageTitles[location.pathname] || 'SmartBiz';
  
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-3 sm:px-6 lg:pl-[16rem]">
        <div className="flex items-center justify-between h-14 sm:h-16 min-h-[44px]">
          {/* Mobile: Menu (sidebar popup) + Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {onMenuClick && (
              <button
                type="button"
                onClick={onMenuClick}
                className="lg:hidden flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Open menu"
              >
                <Menu size={24} />
              </button>
            )}
            <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{pageTitle}</h1>
          </div>
          
          {/* Right side elements */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Search */}
            <div className={cn(
              "transition-all duration-300 hidden sm:block",
              isSearchOpen ? "w-48 sm:w-64" : "w-9"
            )}>
              <div className="relative w-full">
                <button 
                  type="button"
                  className={cn(
                    "absolute inset-y-0 left-0 flex items-center pl-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
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
              <button type="button" className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2 sm:p-1 rounded-xl sm:rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 flex items-center justify-center">
                <Bell size={20} />
                <span className="absolute top-1 right-1 sm:top-0 sm:right-0 w-2 h-2 rounded-full bg-red-500"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
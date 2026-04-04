import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

const MainLayout: React.FC = () => {
  // Sidebar එක mobile වලදී open/close කරන්න මේ state එක පාවිච්චි කරනවා
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 1. Sidebar - මේක හැමවෙලේම තියෙනවා, හැබැයි mobile වලදී hide වෙනවා */}
      <Sidebar 
        isMobileSidebarOpen={isMobileSidebarOpen} 
        setIsMobileSidebarOpen={setIsMobileSidebarOpen} 
      />
      
      {/* 2. Main Content Area 
          lg:ml-64 කියන එකෙන් Desktop එකේදී (Large screens) වම් පැත්තෙන් ඉඩක් තියනවා Sidebar එකට.
          එතකොට content එක වැහෙන්නේ නැහැ.
      */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64 transition-all duration-300 ease-in-out max-w-[1920px] w-full">
        
        {/* Header: mobile එකේ Menu button එකෙන් Sidebar popup open */}
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        
        {/* Main content: resolution අනුව padding, mobile එකේ bottom nav space */}
        <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 animate-fade-in pb-24 lg:pb-8 min-w-0">
          <Outlet />
        </main>
        
        {/* Mobile එකේදී විතරක් පේන Bottom Navigation එක */}
        <MobileNav />
        
        {/* Desktop එකේදී පේන Footer එක */}
        <footer className="hidden lg:block py-4 px-6 border-t border-gray-200 text-center text-sm text-gray-500 bg-white">
          &copy; {new Date().getFullYear()} SmartBizERP. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
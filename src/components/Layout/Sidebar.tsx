import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, ShoppingCart, 
  DollarSign, ChevronDown, LogOut, Settings, 
  X, Truck, UserCircle, FileBarChart, Camera, Pencil, Check
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { supabase } from '../../supabaseClient';

type SidebarProps = {
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const Sidebar: React.FC<SidebarProps> = ({ isMobileSidebarOpen, setIsMobileSidebarOpen }) => {
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu]       = useState<string | null>(null);
  const [userRole, setUserRole]             = useState<string | null>(null);
  const [perms, setPerms]                   = useState<any>({});
  const [userProfile, setUserProfile]       = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingName, setEditingName]       = useState(false);
  const [newName, setNewName]               = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserRole(data?.role || null);
        setPerms(data?.permissions || {});
        setUserProfile({ ...data, email: user.email });
        setNewName(data?.full_name || '');
      }
    };
    fetchProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.id) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${userProfile.id}.${ext}`;
      await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
      const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path);
      await supabase.from('profiles').update({ photo_url: urlData.publicUrl }).eq('id', userProfile.id);
      setUserProfile((p: any) => ({ ...p, photo_url: urlData.publicUrl }));
    } catch (err: any) { alert('Upload error: ' + err.message); }
    setUploadingPhoto(false);
  };

  const handleSaveName = async () => {
    if (!newName.trim() || !userProfile?.id) return;
    await supabase.from('profiles').update({ full_name: newName.trim() }).eq('id', userProfile.id);
    setUserProfile((p: any) => ({ ...p, full_name: newName.trim() }));
    setEditingName(false);
  };

  // Super admin / admin ta okkoma permissions thiyenawa
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const can = (permId: string) => isSuperAdmin || !!perms[permId];

  const handleLinkClick = () => { if (window.innerWidth < 1024) setIsMobileSidebarOpen(false); };
  const toggleSubmenu = (menu: string) => { setOpenSubmenu(openSubmenu === menu ? null : menu); };
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { title: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, show: true },
    {
      title: 'Inventory',
      icon: <Package size={20} />,
      show: isSuperAdmin || can('inv_add_grn') || can('inv_raw_material_grn') || can('inv_returns_damages') || can('inv_stock_movement'),
      submenu: [
        { title: 'Products List',        path: '/inventory',                        show: true },
        { title: 'Raw Materials',        path: '/inventory/raw-materials',          show: true },
        { title: 'Suppliers List',       path: '/inventory/suppliers',              show: true },
        { title: 'Add GRN (Stock In)',   path: '/inventory/grn/new',               show: isSuperAdmin || can('inv_add_grn') },
        { title: 'Add Raw Material GRN', path: '/inventory/raw-materials/grn/new', show: isSuperAdmin || can('inv_raw_material_grn') },
        { title: 'Issue to Production',    path: '/inventory/raw-materials/issue',   show: isSuperAdmin || can('inv_raw_material_issue') },
        { title: 'Stock Count',             path: '/inventory/stock-count',           show: isSuperAdmin || can('inv_stock_count') },
        { title: 'Returns & Damages',    path: '/inventory/returns',               show: isSuperAdmin || can('inv_returns_damages') },
        { title: 'Stock Movement',       path: '/inventory/reports',               show: isSuperAdmin || can('inv_stock_movement') },
      ]
    },
    {
      title: 'Sales & Orders',
      icon: <ShoppingCart size={20} />,
      show: isSuperAdmin || can('sales_new_invoice') || can('sales_purchase_order') || can('sales_all_invoices_view') || can('sales_agency_orders'),
      submenu: [
        { title: 'Sales Dashboard',        path: '/dashboard/sales',   show: true },
        { title: 'New Invoice',            path: '/sales/new-invoice', show: isSuperAdmin || can('sales_new_invoice') },
        { title: 'Purchase Order',         path: '/orders/new',        show: isSuperAdmin || can('sales_purchase_order') },
        { title: 'All Invoices / Orders',  path: '/orders',            show: isSuperAdmin || can('sales_all_invoices_view') },
        { title: 'Agency Orders',          path: '/sales/agencies',    show: isSuperAdmin || can('sales_agency_orders') },
        { title: 'New Agency Order',        path: '/sales/agencies/new', show: true },
      ]
    },
    {
      title: 'Customers',
      path: '/customers',
      icon: <Users size={20} />,
      show: isSuperAdmin || can('customer_view') || can('customer_edit')
    },
    { 
      title: 'Finance', 
      icon: <DollarSign size={20} />, 
      show: isSuperAdmin || can('finance_payment_view') || can('customer_ledger_view') || can('finance_payment_router'),
      submenu: [
        { title: 'Customer Ledger',   path: '/finance/ledger',         show: isSuperAdmin || can('customer_ledger_view') },
        { title: 'Payments & Returns',path: '/finance/payments',       show: isSuperAdmin || can('finance_payment_view') },
        { title: 'Payment Router',    path: '/finance/payment-router', show: isSuperAdmin || can('finance_payment_router') },
      ]
    },
    { 
      title: 'Analytical Reports', 
      icon: <FileBarChart size={20} />, 
      show: isSuperAdmin || can('reports_view'),
      submenu: [
        { title: 'System Wide Reports', path: '/inventory/reports', show: isSuperAdmin || can('reports_view') },
      ]
    },
    { 
      title: 'Human Resources', 
      icon: <UserCircle size={20} />, 
      show: isSuperAdmin || can('hrm_access'),
      submenu: [
        { title: 'Staff Directory', path: '/hrm/employees', show: isSuperAdmin || can('hrm_access') },
        { title: 'Payroll System',  path: '/hrm/payroll',   show: isSuperAdmin || can('hrm_access') },
      ]
    },
    { 
      title: 'Transport', 
      icon: <Truck size={20} />, 
      show: isSuperAdmin || can('transport_triplog') || can('transport_vehicle_view'),
      submenu: [
        { title: 'Fleet Overview',    path: '/transport',             show: true },
        { title: 'Daily Trip Log',    path: '/transport/log',         show: isSuperAdmin || can('transport_triplog') },
        { title: 'Maintenance Logs',  path: '/transport/maintenance', show: true },
        { title: 'Vehicle Setup',     path: '/transport/setup',       show: isSuperAdmin || can('transport_vehicle_view') },
      ]
    },
    { 
      title: 'Admin & Settings', 
      icon: <Settings size={20} />, 
      show: isSuperAdmin,
      submenu: [
        { title: 'Activity Logs',      path: '/admin/activity-log',    show: true },
        { title: 'User Management',    path: '/settings/users',        show: true },
        { title: 'Permissions',        path: '/admin/permissions',     show: true },
        { title: 'Company Setup',      path: '/admin/company-setup',   show: true },
        { title: 'Region Management',  path: '/admin/regions',         show: true },
      ]
    },
  ];

  return (
    <>
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
                      {item.submenu.filter(s => s.show).map((sub) => (
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

        {/* ── USER PROFILE SECTION ── */}
        <div className="border-t border-gray-100">
          {/* Profile Card */}
          <div className="p-3">
            <button type="button"
              onClick={() => setShowProfileMenu(v => !v)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {userProfile?.photo_url ? (
                  <img src={userProfile.photo_url} alt="avatar"
                    className="w-9 h-9 rounded-xl object-cover border-2 border-blue-100" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                    {(userProfile?.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Name + Role */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-[11px] font-black text-gray-800 truncate">
                  {userProfile?.full_name || 'User'}
                </p>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest truncate">
                  {userProfile?.role || 'staff'}
                </p>
              </div>
              <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Menu */}
            {showProfileMenu && (
              <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-3">
                {/* Photo Upload */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    {userProfile?.photo_url ? (
                      <img src={userProfile.photo_url} alt="avatar"
                        className="w-12 h-12 rounded-xl object-cover border-2 border-blue-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">
                        {(userProfile?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
                      {uploadingPhoto
                        ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                        : <Camera size={10} className="text-white"/>}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Display Name</p>
                    {editingName ? (
                      <div className="flex gap-1">
                        <input type="text" value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                          className="flex-1 text-xs font-bold p-1.5 rounded-lg border border-blue-300 outline-none bg-white"
                          autoFocus />
                        <button onClick={handleSaveName}
                          className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          <Check size={11}/>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingName(true)}
                        className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-blue-600">
                        {userProfile?.full_name || 'Set name'}
                        <Pencil size={10} className="text-gray-400"/>
                      </button>
                    )}
                  </div>
                </div>

                {/* Email */}
                <p className="text-[9px] text-gray-400 font-bold truncate px-1">
                  📧 {userProfile?.email || ''}
                </p>

                {/* Sign Out */}
                <button type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black text-red-500 rounded-xl hover:bg-red-50 uppercase tracking-widest transition-all">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
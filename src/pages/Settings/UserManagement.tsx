import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { UserPlus, Shield, Trash2, Loader2, Users, Lock, Save, RefreshCw, UserCheck, CheckSquare, Square, Activity } from 'lucide-react';
import { useCompany } from '../../utils/useCompany';

const UserManagement = () => {
  const { company } = useCompany();
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null); // ලොග් වෙලා ඉන්න එකාගේ ප්‍රොෆයිල් එක
  const [users, setUsers] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [userPermissions, setUserPermissions] = useState<any>({});
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sales_rep');

  const permissionKeys = [
    { key: 'add_grn', label: 'Add GRN', cat: 'Inventory' },
    { key: 'add_raw_materials_grn', label: 'Add Raw Materials GRN', cat: 'Inventory' },
    { key: 'returns_damages', label: 'Returns & Damages', cat: 'Inventory' },
    { key: 'stock_movement', label: 'Stock Movement', cat: 'Inventory' },
    { key: 'new_invoice', label: 'New Invoice', cat: 'Sales' },
    { key: 'purchase_order', label: 'Purchase Orders', cat: 'Sales' },
    { key: 'all_invoices_view', label: 'View All Invoices', cat: 'Sales' },
    { key: 'all_invoices_edit', label: 'Edit All Invoices', cat: 'Sales' },
    { key: 'agency_orders', label: 'Agency Orders', cat: 'Sales' },
    { key: 'customer_view', label: 'View Customers', cat: 'Customers' },
    { key: 'customer_edit', label: 'Edit Customers', cat: 'Customers' },
    { key: 'customer_ledger_view', label: 'View Ledger', cat: 'Customers' },
    { key: 'customer_ledger_edit', label: 'Edit Ledger', cat: 'Customers' },
    { key: 'customer_ledger_print', label: 'Print Ledger', cat: 'Customers' },
    { key: 'payment_view', label: 'View Payments', cat: 'Finance' },
    { key: 'payment_edit', label: 'Edit Payments', cat: 'Finance' },
    { key: 'payment_print', label: 'Print Vouchers', cat: 'Finance' },
    { key: 'payment_router', label: 'Payment Router', cat: 'Finance' },
    { key: 'trip_log', label: 'Trip Log Access', cat: 'Logistics' },
    { key: 'vehicle_setup', label: 'Vehicle Setup', cat: 'Logistics' },
    { key: 'driver_setup', label: 'Driver Setup', cat: 'Logistics' },
    { key: 'system_reports_view', label: 'Reports (View)', cat: 'Admin' },
    { key: 'system_reports_edit', label: 'Reports (Edit)', cat: 'Admin' },
    { key: 'hrm_access', label: 'HRM Module', cat: 'Admin' },
    { key: 'admin_access', label: 'Admin Settings', cat: 'Admin' }
  ];

  // 5 min eke athule last_active update una nam online
  const isOnline = (lastActive: string | null) => {
    if (!lastActive) return false;
    return (Date.now() - new Date(lastActive).getTime()) < 5 * 60 * 1000;
  };

  useEffect(() => {
    if (company) {
      fetchCurrentUser();
      fetchUsers();
    }
  }, [company]);

  // දැනට ලොග් වෙලා ඉන්න යූසර් කවුද කියලා හොයාගන්නවා
  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUserProfile(data);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('company_id', company?.id);
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleSelectUser = (user: any) => {
    setSelectedUserId(user.id);
    setFullName(user.full_name || '');
    setEmail(user.email || '');
    setRole(user.role || 'sales_rep');
    setUserPermissions(user.permissions || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePermission = (key: string) => {
    // "admin_access" වෙනස් කරන්න පුළුවන් වෙන්නේ දැනට ඉන්න එකා Super Admin නම් විතරයි
    if (key === 'admin_access' && currentUserProfile?.role !== 'super_admin') {
      alert("Only a Super Admin can grant Admin Access!");
      return;
    }
    setUserPermissions((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      if (selectedUserId) {
        const { error } = await supabase.from('profiles').update({
          full_name: fullName,
          role: role,
          permissions: userPermissions
        }).eq('id', selectedUserId);
        if (error) throw error;
        alert("Permissions Updated!");
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email, password, options: { data: { full_name: fullName, company_id: company?.id } }
        });
        if (authError) throw authError;
        const { error: profileError } = await supabase.from('profiles').insert([{
            id: authData.user?.id, full_name: fullName, email, role, company_id: company?.id, permissions: userPermissions
        }]);
        if (profileError) throw profileError;
        alert("User Created!");
      }
      fetchUsers();
      resetForm();
    } catch (err: any) { alert(err.message); }
    setIsProcessing(false);
  };

  const resetForm = () => {
    setSelectedUserId(null);
    setFullName(''); setEmail(''); setPassword(''); setRole('sales_rep'); setUserPermissions({});
  };

  const renderSection = (category: string) => {
    // Admin category එක පෙන්වන්නේ Super Admin ට විතරයි කියලා Logic එකක් දාන්නත් පුළුවන්
    // හැබැයි දැනට අපි හැමෝටම පෙන්වලා Toggle එක Lock කරමු.
    return (
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black uppercase text-blue-600 mb-3 tracking-widest">{category}</h3>
        <div className="space-y-3">
          {permissionKeys.filter(p => p.cat === category).map(p => (
            <div 
              key={p.key} 
              className={`flex items-center justify-between cursor-pointer group ${p.key === 'admin_access' && currentUserProfile?.role !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => togglePermission(p.key)}
            >
              <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">{p.label}</span>
              {userPermissions[p.key] ? 
                <CheckSquare className="text-blue-600" size={20} /> : 
                <Square className="text-slate-300" size={20} />
              }
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 lg:p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen text-left pb-24 lg:pb-6">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-slate-900 leading-none">Access <span className="text-blue-600">Control</span></h1>
          <p className="text-slate-400 font-bold text-[9px] mt-2 uppercase tracking-widest">Logged in as: <span className="text-slate-900">{currentUserProfile?.full_name} ({currentUserProfile?.role})</span></p>
          <p className="text-[9px] font-bold mt-1">
            <span className="text-green-500">🟢 {users.filter(u => isOnline(u.last_active)).length} Online</span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-slate-400">{users.length} Total Users</span>
          </p>
        </div>
        <button onClick={resetForm} className="bg-slate-100 px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
            <h2 className="text-xs font-black uppercase text-slate-900 mb-6 flex items-center gap-2">
              {selectedUserId ? <UserCheck className="text-green-600" /> : <UserPlus className="text-blue-600" />} {selectedUserId ? 'Edit User' : 'New User'}
            </h2>
            <div className="space-y-4">
              <input placeholder="Full Name" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <input placeholder="Email" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!selectedUserId} />
              {!selectedUserId && <input type="password" placeholder="Password" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border" value={password} onChange={(e) => setPassword(e.target.value)} />}
              <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="super_admin">Super Admin</option>
                <option value="md">MD / Investor</option>
                <option value="supervisor">Supervisor</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="asm">ASM</option>
                <option value="sales_rep">Sales Rep</option>
                <option value="accountant">Accountant</option>
                <option value="stores">Stores Keeper</option>
                <option value="distributor">Distributor</option>
              </select>
              <button onClick={handleSave} disabled={isProcessing} className={`w-full p-4 rounded-2xl font-black text-[10px] uppercase text-white shadow-xl flex items-center justify-center gap-2 ${selectedUserId ? 'bg-green-600' : 'bg-blue-600'}`}>
                {isProcessing ? <Loader2 className="animate-spin" /> : <Save size={16} />} {selectedUserId ? 'Update Permissions' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 p-4 rounded-2xl">
          {renderSection('Inventory')}
          {renderSection('Sales')}
          {renderSection('Customers')}
          {renderSection('Finance')}
          {renderSection('Logistics')}
          {renderSection('Admin')}
        </div>
      </div>

      <div className="mt-4 bg-white border rounded-2xl overflow-hidden shadow-sm">
        {/* Mobile Cards */}
        <div className="lg:hidden divide-y">
          {users.map((u) => (
            <div key={u.id} className={`p-3 flex items-center justify-between gap-2 cursor-pointer ${selectedUserId===u.id?'bg-blue-50':''}`} onClick={() => handleSelectUser(u)}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline(u.last_active) ? 'bg-green-500' : 'bg-gray-200'}`}/>
                  <p className="font-black text-slate-900 text-sm uppercase truncate">{u.full_name}</p>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{u.email}</p>
                <p className="text-[9px] text-blue-500 font-black uppercase mt-0.5">{u.role} {isOnline(u.last_active) ? '• 🟢 Online' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.permissions?.admin_access||u.role==='super_admin' ? <Shield className="text-blue-500" size={16}/> : <Lock className="text-slate-200" size={16}/>}
                <Trash2 className="text-slate-200 hover:text-red-500 cursor-pointer" size={16}/>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop Table */}
        <table className="hidden lg:table w-full border-collapse">
          <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
            <tr><th className="p-6 text-left">Member</th><th className="p-6 text-left">Role</th><th className="p-6 text-center">Admin</th><th className="p-6 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs text-left">
            {users.map((u) => (
              <tr key={u.id} className={`hover:bg-blue-50 cursor-pointer ${selectedUserId===u.id?'bg-blue-50':''}`} onClick={() => handleSelectUser(u)}>
                <td className="p-6 font-black text-slate-900">
                  <div className="flex items-center gap-2">
                    {/* Online indicator */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline(u.last_active) ? 'bg-green-500 shadow-sm shadow-green-300' : 'bg-gray-200'}`}/>
                    <div>
                      {u.full_name}
                      <br/>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{u.email}</span>
                      {u.last_active && (
                        <div className="text-[9px] text-slate-300 font-bold mt-0.5">
                          {isOnline(u.last_active) ? '🟢 Online now' : `Last seen: ${new Date(u.last_active).toLocaleString('en-GB', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-6 uppercase font-black text-slate-600">{u.role}</td>
                <td className="p-6 text-center">{u.permissions?.admin_access||u.role==='super_admin'?<Shield className="text-blue-500 mx-auto"/>:<Lock className="text-slate-200 mx-auto"/>}</td>
                <td className="p-6 text-right"><Trash2 className="text-slate-200 hover:text-red-500 inline cursor-pointer" size={18}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
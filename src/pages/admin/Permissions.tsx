import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Shield, CheckCircle2, XCircle, Loader2, Users } from 'lucide-react';

const PERMISSION_GROUPS = [
  { group: 'INVENTORY', color: 'blue', perms: [
    { id: 'inv_add_grn',          label: 'Add GRN' },
    { id: 'inv_raw_material_grn', label: 'Add Raw Materials GRN' },
    { id: 'inv_returns_damages',  label: 'Returns & Damages' },
    { id: 'inv_stock_movement',   label: 'Stock Movement' },
  ]},
  { group: 'SALES & ORDERS', color: 'green', perms: [
    { id: 'sales_new_invoice',       label: 'New Invoice' },
    { id: 'sales_purchase_order',    label: 'Purchase Order' },
    { id: 'sales_all_invoices_view', label: 'All Invoices - View' },
    { id: 'sales_all_invoices_edit', label: 'All Invoices - Edit' },
    { id: 'sales_agency_orders',     label: 'Agency Orders (View/Manage)' },
    { id: 'sales_agency_order_new',  label: 'New Agency Order (Field)' },
  ]},
  { group: 'CUSTOMERS', color: 'purple', perms: [
    { id: 'customer_view',         label: 'Customer - View' },
    { id: 'customer_edit',         label: 'Customer - Edit' },
    { id: 'customer_ledger_view',  label: 'Ledger - View' },
    { id: 'customer_ledger_edit',  label: 'Ledger - Edit' },
    { id: 'customer_ledger_print', label: 'Ledger - Print' },
  ]},
  { group: 'FINANCE', color: 'yellow', perms: [
    { id: 'finance_payment_view',   label: 'Payments - View' },
    { id: 'finance_payment_edit',   label: 'Payments - Edit' },
    { id: 'finance_payment_print',  label: 'Payments - Print' },
    { id: 'finance_payment_router', label: 'Payment Router' },
  ]},
  { group: 'REPORTS', color: 'orange', perms: [
    { id: 'reports_view',  label: 'Reports - View' },
    { id: 'reports_edit',  label: 'Reports - Edit' },
    { id: 'reports_print', label: 'Reports - Print' },
  ]},
  { group: 'TRANSPORT', color: 'teal', perms: [
    { id: 'transport_triplog',      label: 'Daily Trip Log' },
    { id: 'transport_vehicle_view', label: 'Vehicle & Driver - View' },
    { id: 'transport_vehicle_edit', label: 'Vehicle & Driver - Edit' },
  ]},
  { group: 'HRM', color: 'red', perms: [
    { id: 'hrm_access', label: 'HRM - Full Access' },
  ]},
];

const colorMap: any = {
  blue:   { bg: 'bg-blue-600',   text: 'text-blue-700',   border: 'border-blue-200',   head: 'bg-blue-50'   },
  green:  { bg: 'bg-green-600',  text: 'text-green-700',  border: 'border-green-200',  head: 'bg-green-50'  },
  purple: { bg: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-200', head: 'bg-purple-50' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-700', border: 'border-yellow-200', head: 'bg-yellow-50' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200', head: 'bg-orange-50' },
  teal:   { bg: 'bg-teal-600',   text: 'text-teal-700',   border: 'border-teal-200',   head: 'bg-teal-50'   },
  red:    { bg: 'bg-red-600',    text: 'text-red-700',    border: 'border-red-200',    head: 'bg-red-50'    },
};

const AdminPermissions = () => {
  const [users, setUsers]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState<string | null>(null);
  const [currentRole, setCurrentRole]   = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setCurrentRole(profile?.role || null);
    }
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setUsers(data || []);
    setLoading(false);
  };

  const togglePermission = async (userId: string, permId: string, current: boolean) => {
    setSaving(userId + permId);
    const user = users.find(u => u.id === userId);
    const updated = { ...(user.permissions || {}), [permId]: !current };
    const { error } = await supabase.from('profiles').update({ permissions: updated }).eq('id', userId);
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: updated } : u));
    else alert('Error: ' + error.message);
    setSaving(null);
  };

  const setAllPermissions = async (userId: string, value: boolean) => {
    setSaving(userId + '_all');
    const allPerms: any = {};
    PERMISSION_GROUPS.forEach(g => g.perms.forEach(p => { allPerms[p.id] = value; }));
    const { error } = await supabase.from('profiles').update({ permissions: allPerms }).eq('id', userId);
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: allPerms } : u));
    setSaving(null);
  };

  const setGroupPermissions = async (userId: string, groupPerms: any[], value: boolean) => {
    setSaving(userId + groupPerms[0].id);
    const user = users.find(u => u.id === userId);
    const updated = { ...(user.permissions || {}) };
    groupPerms.forEach(p => { updated[p.id] = value; });
    const { error } = await supabase.from('profiles').update({ permissions: updated }).eq('id', userId);
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: updated } : u));
    setSaving(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  if (currentRole !== 'super_admin' && currentRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield size={60} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-red-500 uppercase">Access Denied</h2>
          <p className="text-gray-400 mt-2 font-bold">Super Admin access required</p>
        </div>
      </div>
    );
  }

  const displayUsers = selectedUser ? users.filter(u => u.id === selectedUser) : users;
  const totalPerms = PERMISSION_GROUPS.reduce((acc, g) => acc + g.perms.length, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
          <Shield className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Security & Permissions</h1>
          <p className="text-xs text-gray-400 font-bold uppercase">Super Admin Panel - User Access Control</p>
        </div>
      </div>

      {/* User Filter */}
      <div className="bg-white rounded-2xl p-4 mb-6 border shadow-sm flex gap-2 flex-wrap items-center">
        <Users size={16} className="text-gray-400 mr-1" />
        <span className="text-xs font-black text-gray-400 uppercase mr-2">Filter User:</span>
        <button onClick={() => setSelectedUser(null)}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${!selectedUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          All Users
        </button>
        {users.map(u => (
          <button key={u.id} onClick={() => setSelectedUser(u.id === selectedUser ? null : u.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${selectedUser === u.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {u.full_name}
          </button>
        ))}
      </div>

      {/* Users */}
      <div className="space-y-6">
        {displayUsers.map(user => {
          const perms = user.permissions || {};
          const activePerms = PERMISSION_GROUPS.reduce((acc, g) => acc + g.perms.filter(p => perms[p.id]).length, 0);
          const pct = Math.round((activePerms / totalPerms) * 100);
          return (
            <div key={user.id} className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
              {/* User Header */}
              <div className="p-5 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-black text-white text-xl uppercase shadow">
                    {user.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-black text-lg uppercase">{user.full_name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        user.role === 'super_admin' ? 'bg-red-100 text-red-600' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>{user.role || 'user'}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{activePerms}/{totalPerms} permissions</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-blue-500">{pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAllPermissions(user.id, true)} disabled={!!saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black uppercase hover:bg-green-700">
                    Grant All
                  </button>
                  <button onClick={() => setAllPermissions(user.id, false)} disabled={!!saving}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase hover:bg-red-600">
                    Revoke All
                  </button>
                </div>
              </div>
              {/* Permission Groups Grid */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {PERMISSION_GROUPS.map(group => {
                  const c = colorMap[group.color];
                  return (
                    <div key={group.group} className={`rounded-2xl border overflow-hidden ${c.border}`}>
                      <div className={`px-4 py-2.5 flex items-center justify-between ${c.head}`}>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${c.text}`}>{group.group}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setGroupPermissions(user.id, group.perms, true)}
                            className={`text-[9px] font-black px-2 py-1 rounded-lg text-white ${c.bg}`}>ON</button>
                          <button onClick={() => setGroupPermissions(user.id, group.perms, false)}
                            className="text-[9px] font-black px-2 py-1 rounded-lg bg-gray-400 text-white">OFF</button>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {group.perms.map(p => {
                          const isOn = !!perms[p.id];
                          const isSaving = saving === user.id + p.id;
                          return (
                            <button key={p.id} onClick={() => togglePermission(user.id, p.id, isOn)} disabled={!!saving}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left ${
                                isOn ? `${c.bg} text-white shadow-sm` : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-100'
                              }`}>
                              <span className="text-[10px] font-black uppercase leading-tight">{p.label}</span>
                              {isSaving ? <Loader2 size={12} className="animate-spin flex-shrink-0" />
                                : isOn ? <CheckCircle2 size={13} className="flex-shrink-0" />
                                : <XCircle size={13} className="opacity-25 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPermissions;
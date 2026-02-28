import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Shield, Lock, Unlock, CheckCircle2, XCircle } from 'lucide-react';

const AdminPermissions = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // අපේ පර්මිෂන් කැටගරි ටික මෙතන ලස්සනට හදමු
  const permissionStructure = [
    {
      group: "Inventory (තොග පාලනය)",
      perms: [
        { id: 'inv_view', label: 'බැලීම (View)' },
        { id: 'inv_add', label: 'ඇතුළත් කිරීම (Add GRN)' },
        { id: 'inv_adjust', label: 'ස්ටොක් වෙනස් කිරීම (Adjust)' }
      ]
    },
    {
      group: "Sales & Invoices (විකුණුම්)",
      perms: [
        { id: 'sales_view', label: 'බැලීම (View)' },
        { id: 'sales_create', label: 'ඉන්වොයිස් දැමීම (Create)' },
        { id: 'sales_edit', label: 'සංස්කරණය (Edit)' },
        { id: 'sales_delete', label: 'මැකීම (Delete)' },
        { id: 'sales_discount', label: 'වට්ටම් දීම (Discounts)' }
      ]
    },
    {
      group: "Admin & Finance (මූල්‍ය)",
      perms: [
        { id: 'finance_view', label: 'ගිණුම් බැලීම' },
        { id: 'reports_view', label: 'Reports බැලීම' },
        { id: 'admin_access', label: 'Full Admin Access' }
      ]
    }
  ];

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const togglePermission = async (userId: string, permId: string, currentVal: boolean) => {
    const user = users.find(u => u.id === userId);
    const updatedPermissions = { ...(user.permissions || {}), [permId]: !currentVal };

    const { error } = await supabase.from('profiles').update({ permissions: updatedPermissions }).eq('id', userId);

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, permissions: updatedPermissions } : u));
    }
  };

  if (loading) return <div className="p-10 text-center uppercase font-black">Loading Control Panel...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex items-center space-x-3 mb-10">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
          <Shield className="text-white" size={30} />
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-gray-800">Advanced Access Control</h1>
      </div>

      <div className="space-y-8">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center font-black text-blue-600">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-black text-lg uppercase">{user.full_name}</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {permissionStructure.map((group, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">{group.group}</h3>
                  <div className="flex flex-col gap-2">
                    {group.perms.map((p) => {
                      const hasPerm = user.permissions?.[p.id];
                      return (
                        <button
                          key={p.id}
                          onClick={() => togglePermission(user.id, p.id, hasPerm)}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all border ${
                            hasPerm 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                            : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase">{p.label}</span>
                          {hasPerm ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPermissions;
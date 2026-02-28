import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { UserPlus, Shield, Trash2, CheckCircle, XCircle, Loader2, Users, Star, UserCheck, ShieldAlert } from 'lucide-react';
import { useCompany } from '../../utils/useCompany';

const UserManagement = () => {
  const { company } = useCompany();
  const [users, setUsers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  // නව යූසර් කෙනෙක් ඇඩ් කරන ෆෝම් එකේ ඩේටා (Password එකතු කළා)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '', // Login සඳහා අලුතින් එක් කළා
    role: 'sales_rep', 
    sales_discount: false, 
    admin_access: false
  });

  useEffect(() => {
    if (company) fetchUsers();
  }, [company]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', company?.id);
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      // 1. Supabase Auth එකේ යූසර්ව Register කරනවා (මෙතනින් තමයි Login Access ලැබෙන්නේ)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            company_id: company?.id,
          }
        }
      });

      if (authError) throw authError;

      // 2. Auth එකෙන් ලැබුණු User ID එකත් එක්ක Profiles table එකට දත්ත දානවා
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user?.id, // Auth ID එකම මෙතනට දෙනවා
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        company_id: company?.id,
        permissions: {
          sales_discount: formData.sales_discount,
          admin_access: formData.admin_access || formData.role === 'super_admin' || formData.role === 'md'
        }
      }]);

      if (profileError) throw profileError;

      alert("Account created successfully with Login Access!");
      setFormData({ full_name: '', email: '', password: '', role: 'sales_rep', sales_discount: false, admin_access: false });
      fetchUsers();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  // Role එක පෙන්වන ලස්සන නම (Display Name)
  const getRoleBadge = (role: string) => {
    const roles: any = {
      super_admin: { name: 'Super Admin', color: 'bg-red-100 text-red-700' },
      md: { name: 'MD / Investor', color: 'bg-purple-100 text-purple-700' },
      supervisor: { name: 'Supervisor', color: 'bg-cyan-100 text-cyan-700' },
      sales_manager: { name: 'Sales Manager', color: 'bg-indigo-100 text-indigo-700' },
      asm: { name: 'ASM', color: 'bg-blue-100 text-blue-700' },
      sales_rep: { name: 'Sales Rep', color: 'bg-emerald-100 text-emerald-700' },
      accountant: { name: 'Accountant', color: 'bg-amber-100 text-amber-700' },
      stores: { name: 'Stores Keeper', color: 'bg-orange-100 text-orange-700' },
      distributor: { name: 'Distributor', color: 'bg-slate-100 text-slate-700' }
    };
    return roles[role] || { name: role, color: 'bg-gray-100 text-gray-700' };
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white min-h-screen border rounded-xl shadow-sm mt-4 text-left">
      <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black italic uppercase text-slate-900">User <span className="text-blue-600">Management</span></h1>
          <p className="text-slate-400 font-bold text-xs uppercase mt-1 tracking-widest">Setup Team Roles & Permissions</p>
        </div>
        <div className="bg-slate-100 p-3 rounded-2xl flex items-center gap-2">
          <Users className="text-slate-400" size={20} />
          <span className="font-black text-slate-900 text-xl">{users.length}</span>
        </div>
      </div>

      <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-8 shadow-sm text-left">
        <h2 className="text-sm font-black uppercase text-blue-600 mb-6 flex items-center gap-2">
          <UserPlus size={18} /> Add New Team Member
        </h2>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <input 
            type="text" placeholder="Full Name" 
            className="p-4 rounded-2xl font-bold border-none shadow-inner outline-none focus:ring-4 focus:ring-blue-100"
            value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required
          />
          <input 
            type="email" placeholder="Email Address" 
            className="p-4 rounded-2xl font-bold border-none shadow-inner outline-none focus:ring-4 focus:ring-blue-100"
            value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required
          />

          {/* අලුතින් එක් කළ Password Field එක */}
          <input 
            type="password" placeholder="Login Password" 
            className="p-4 rounded-2xl font-bold border-none shadow-inner outline-none focus:ring-4 focus:ring-blue-100"
            value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required
          />
          
          <select 
            className="p-4 rounded-2xl font-bold border-none shadow-inner outline-none focus:ring-4 focus:ring-blue-100"
            value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="super_admin">Super Admin</option>
            <option value="md">MD / Investor</option>
            <option value="supervisor">Supervisor</option>
            <option value="sales_manager">Sales Manager</option>
            <option value="asm">Area Sales Manager (ASM)</option>
            <option value="sales_rep">Sales Representative</option>
            <option value="accountant">Accountant</option>
            <option value="stores">Stores Keeper</option>
            <option value="distributor">Distributor</option>
          </select>

          <div className="flex items-center gap-6 p-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" className="w-5 h-5 accent-blue-600"
                checked={formData.sales_discount} onChange={(e) => setFormData({...formData, sales_discount: e.target.checked})}
              />
              <span className="text-[10px] font-black uppercase text-slate-600">Free Issues</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" className="w-5 h-5 accent-blue-600"
                checked={formData.admin_access} onChange={(e) => setFormData({...formData, admin_access: e.target.checked})}
              />
              <span className="text-[10px] font-black uppercase text-slate-600">Admin Access</span>
            </label>
          </div>

          <button 
            disabled={isAdding}
            className="lg:col-span-1 p-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {isAdding ? <Loader2 className="animate-spin" /> : <UserPlus size={16} />} Create Account
          </button>
        </form>
      </div>

      <div className="border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.15em]">
            <tr>
              <th className="p-6 text-left">Team Member</th>
              <th className="p-6 text-left">Role</th>
              <th className="p-6 text-center">Permissions</th>
              <th className="p-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs font-bold text-left">
            {users.map((u) => {
              const roleInfo = getRoleBadge(u.role);
              return (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6">
                    <div className="font-black text-slate-900">{u.full_name}</div>
                    <div className="text-[10px] text-slate-400 lowercase">{u.email}</div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black ${roleInfo.color}`}>
                      {roleInfo.name}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center gap-4">
                      <div className="flex flex-col items-center gap-1">
                        {u.permissions?.sales_discount ? <CheckCircle className="text-green-500" size={16} /> : <XCircle className="text-slate-200" size={16} />}
                        <span className="text-[8px] uppercase text-slate-400">Free Issue</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        {u.permissions?.admin_access || u.role === 'super_admin' || u.role === 'md' ? <Shield className="text-blue-500" size={16} /> : <XCircle className="text-slate-200" size={16} />}
                        <span className="text-[8px] uppercase text-slate-400">Admin</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
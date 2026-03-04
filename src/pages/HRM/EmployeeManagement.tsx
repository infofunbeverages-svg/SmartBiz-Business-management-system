import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import {
  Users, UserPlus, Search, Phone, Mail, BadgeCheck,
  X, Save, Edit, Trash2, Loader2, MapPin, Calendar,
  CreditCard, ChevronDown
} from 'lucide-react';

const DESIGNATIONS = [
  'Manager','Sales Rep','Driver','Lorry Driver','Helper',
  'Label Applicator','Warehouse Staff','Accountant','Admin','Other'
];

const BLANK = {
  name:'', designation:'', phone:'', email:'', address:'', nic:'',
  joined_date: new Date().toISOString().split('T')[0],
  basic_salary:0, piece_rate:0.40, status:'Active', notes:''
};

export default function EmployeeManagement() {
  const { company } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(false);
  const [editId,    setEditId]    = useState<string|null>(null);
  const [form,      setForm]      = useState<any>(BLANK);
  const [selected,  setSelected]  = useState<any>(null);

  useEffect(() => { if (company) load(); }, [company]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*')
      .eq('company_id', company?.id).order('name');
    setEmployees(data || []);
    setLoading(false);
  };

  const openAdd = () => { setEditId(null); setForm(BLANK); setModal(true); };
  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({ name:e.name||'', designation:e.designation||'', phone:e.phone||'',
      email:e.email||'', address:e.address||'', nic:e.nic||'',
      joined_date:e.joined_date||BLANK.joined_date,
      basic_salary:e.basic_salary||0, piece_rate:e.piece_rate??0.40,
      status:e.status||'Active', notes:e.notes||'' });
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('නම ඇතුළත් කරන්න!');
    setSaving(true);
    try {
      const p = { ...form, company_id: company?.id };
      if (editId) { const {error} = await supabase.from('employees').update(p).eq('id',editId); if(error) throw error; }
      else        { const {error} = await supabase.from('employees').insert([p]);                if(error) throw error; }
      setModal(false); load();
    } catch(e:any) { alert('Error: '+e.message); }
    finally { setSaving(false); }
  };

  const del = async (e: any) => {
    if (!confirm(`"${e.name}" delete කරන්නද?`)) return;
    await supabase.from('employees').delete().eq('id', e.id);
    if (selected?.id === e.id) setSelected(null);
    load();
  };

  const f = (k:string, v:any) => setForm((p:any)=>({...p,[k]:v}));

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.designation?.toLowerCase().includes(search.toLowerCase()) ||
    e.phone?.includes(search)
  );

  const active = employees.filter(e => e.status === 'Active').length;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800 flex items-center gap-3">
              <Users className="text-blue-600" size={32}/>
              Staff <span className="text-blue-600">Hub</span>
            </h1>
            <div className="flex gap-3 mt-2">
              <span className="text-[10px] font-black text-green-600 bg-green-100 px-3 py-1 rounded-full">{active} ACTIVE</span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{employees.length} TOTAL</span>
            </div>
          </div>
          <button onClick={openAdd}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-700 transition shadow-lg">
            <UserPlus size={16}/> Add Employee
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border p-3 mb-6 flex items-center gap-3 shadow-sm">
          <Search size={16} className="text-slate-300 ml-1"/>
          <input className="flex-1 font-bold text-sm outline-none bg-transparent"
            placeholder="Search name, role, phone..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
          <span className="text-xs font-black text-gray-300 pr-2">{filtered.length}</span>
        </div>

        <div className="flex gap-6">
          {/* Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-48"><Loader2 size={32} className="animate-spin text-gray-200"/></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-300">
                <Users size={48} className="mx-auto mb-3 opacity-30"/>
                <p className="font-black uppercase text-sm">No employees found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(emp => (
                  <div key={emp.id} onClick={()=>setSelected(selected?.id===emp.id?null:emp)}
                    className={`bg-white rounded-3xl p-5 border-2 cursor-pointer transition-all hover:shadow-lg
                      ${selected?.id===emp.id?'border-blue-400 shadow-lg':'border-white hover:border-slate-100'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white
                          ${emp.status==='Active'?'bg-blue-600':'bg-slate-300'}`}>
                          {emp.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-800 uppercase leading-tight">{emp.name}</h3>
                          <span className="text-[10px] font-black text-blue-500 uppercase">{emp.designation||'Staff'}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full
                        ${emp.status==='Active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>
                        {emp.status}
                      </span>
                    </div>
                    <div className="space-y-1 mb-4">
                      {emp.phone && <div className="flex gap-2 text-xs font-bold text-slate-400"><Phone size={11}/>{emp.phone}</div>}
                      <div className="flex gap-2 text-xs font-bold text-green-600"><BadgeCheck size={11}/>LKR {(emp.basic_salary||0).toLocaleString()}/mo</div>
                      {emp.piece_rate>0 && <div className="flex gap-2 text-xs font-bold text-orange-500 italic">⚡ LKR {emp.piece_rate}/unit piece rate</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={e=>{e.stopPropagation();openEdit(emp);}}
                        className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-700 transition flex items-center justify-center gap-1">
                        <Edit size={11}/> Edit
                      </button>
                      <button onClick={e=>{e.stopPropagation();del(emp);}}
                        className="py-2 px-3 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition">
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-68 flex-shrink-0" style={{width:'270px'}}>
              <div className="bg-white rounded-3xl border-2 border-blue-100 p-5 sticky top-4">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white ${selected.status==='Active'?'bg-blue-600':'bg-slate-300'}`}>
                    {selected.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <button onClick={()=>setSelected(null)} className="p-1.5 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition"><X size={13}/></button>
                </div>
                <h3 className="font-black text-base text-slate-800 uppercase leading-tight">{selected.name}</h3>
                <p className="text-[10px] font-black text-blue-500 uppercase mb-4">{selected.designation}</p>
                <div className="space-y-2 text-xs mb-4">
                  {selected.phone    && <div className="flex gap-2 text-slate-500 font-bold"><Phone size={11}/>{selected.phone}</div>}
                  {selected.email    && <div className="flex gap-2 text-slate-500 font-bold"><Mail size={11}/>{selected.email}</div>}
                  {selected.address  && <div className="flex gap-2 text-slate-500 font-bold"><MapPin size={11}/>{selected.address}</div>}
                  {selected.nic      && <div className="flex gap-2 text-slate-500 font-bold"><CreditCard size={11}/>{selected.nic}</div>}
                  {selected.joined_date && <div className="flex gap-2 text-slate-500 font-bold"><Calendar size={11}/>Joined: {selected.joined_date}</div>}
                </div>
                <div className="p-3 bg-green-50 rounded-2xl mb-2">
                  <p className="text-[9px] font-black text-green-600 uppercase">Basic Salary</p>
                  <p className="text-xl font-black text-green-700">LKR {(selected.basic_salary||0).toLocaleString()}</p>
                </div>
                {selected.piece_rate>0 && (
                  <div className="p-3 bg-orange-50 rounded-2xl mb-2">
                    <p className="text-[9px] font-black text-orange-500 uppercase">Piece Rate</p>
                    <p className="text-lg font-black text-orange-600">LKR {selected.piece_rate}/unit</p>
                  </div>
                )}
                {selected.notes && (
                  <div className="p-3 bg-slate-50 rounded-2xl text-xs font-bold text-slate-500">{selected.notes}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black uppercase italic text-slate-800">
                {editId?'Edit':'Add'} <span className="text-blue-600">Employee</span>
              </h2>
              <button onClick={()=>setModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition"><X size={16}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Full Name *</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Sunil Perera"/>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Designation</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.designation} onChange={e=>f('designation',e.target.value)}>
                  <option value="">Select...</option>
                  {DESIGNATIONS.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Status</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.status} onChange={e=>f('status',e.target.value)}>
                  <option>Active</option><option>Inactive</option><option>On Leave</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Phone</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.phone} onChange={e=>f('phone',e.target.value)} placeholder="071 xxx xxxx"/>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Email</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.email} onChange={e=>f('email',e.target.value)} placeholder="email@example.com"/>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">NIC</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.nic} onChange={e=>f('nic',e.target.value)} placeholder="NIC number"/>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Joined Date</label>
                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.joined_date} onChange={e=>f('joined_date',e.target.value)}/>
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Address</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.address} onChange={e=>f('address',e.target.value)} placeholder="Address..."/>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-green-500 mb-1 block">Basic Salary (LKR)</label>
                <input type="number" className="w-full p-3 bg-green-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-green-400"
                  value={form.basic_salary} onChange={e=>f('basic_salary',parseFloat(e.target.value)||0)} placeholder="50000"/>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-orange-500 mb-1 block">Piece Rate (LKR/unit)</label>
                <input type="number" step="0.01" className="w-full p-3 bg-orange-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  value={form.piece_rate} onChange={e=>f('piece_rate',parseFloat(e.target.value)||0)} placeholder="0.40"/>
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Notes</label>
                <textarea className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={2} value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Any notes..."/>
              </div>
            </div>
            <button onClick={save} disabled={saving}
              className="w-full mt-5 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 transition disabled:opacity-50">
              {saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}
              {saving?'Saving...':(editId?'Update Employee':'Save Employee')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

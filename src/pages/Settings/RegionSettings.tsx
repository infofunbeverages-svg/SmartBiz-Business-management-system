import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { MapPin, UserCheck, Plus, Loader2, Trash2 } from 'lucide-react';
import { useCompany } from '../../utils/useCompany';

const RegionSettings = () => {
  const { company } = useCompany();
  const [regions, setRegions] = useState<any[]>([]);
  const [asms, setAsms] = useState<any[]>([]);
  const [newRegion, setNewRegion] = useState('');
  const [selectedAsm, setSelectedAsm] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Regions සහ ASM ලාගේ ලිස්ට් එක Fetch කිරීම
  const fetchData = async () => {
    if (!company) return;
    
    // මේ කම්පැනි එකට අදාළ Regions සහ ඒකෙ ASM ගේ නම ගමු
    const { data: regionData } = await supabase
      .from('sales_regions')
      .select('*, profiles:asm_id(full_name)')
      .eq('company_id', company.id);

    // ASM ලාගේ ලිස්ට් එක ගමු (Role එක 'asm' හෝ 'sales_manager' වෙන්න පුළුවන්)
    const { data: asmData } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', company.id)
      .in('role', ['asm', 'sales_manager', 'supervisor']); 
    
    if (regionData) setRegions(regionData);
    if (asmData) setAsms(asmData);
  };

  useEffect(() => { 
    fetchData(); 
  }, [company]);

  // 2. අලුත් Region එකක් සේව් කිරීම
  const handleAddRegion = async () => {
    if (!newRegion || !selectedAsm) return alert("Region name and ASM are required!");
    if (!company) return;

    setLoading(true);
    const { error } = await supabase.from('sales_regions').insert([
      { 
        region_name: newRegion, 
        asm_id: selectedAsm,
        company_id: company.id // මේක අනිවාර්යයි!
      }
    ]);

    if (!error) {
      setNewRegion('');
      setSelectedAsm('');
      fetchData();
    } else {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  // 3. Region එකක් අයින් කිරීම
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this region?")) {
      const { error } = await supabase.from('sales_regions').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10">
        <h2 className="text-4xl font-black uppercase mb-2 italic text-slate-900">
          Region <span className="text-blue-600">Settings</span>
        </h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Assign Areas to Sales Managers</p>
      </div>
      
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <label className="text-[10px] font-black ml-2 uppercase text-slate-400">Region Name</label>
          <input 
            className="w-full p-4 rounded-2xl border-none bg-slate-50 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
            placeholder="e.g. Matara, Colombo South" 
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black ml-2 uppercase text-slate-400">Assign ASM / Supervisor</label>
          <select 
            className="w-full p-4 rounded-2xl border-none bg-slate-50 font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer"
            value={selectedAsm}
            onChange={(e) => setSelectedAsm(e.target.value)}
          >
            <option value="">Select Manager</option>
            {asms.map(asm => (
              <option key={asm.id} value={asm.id}>{asm.full_name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button 
            onClick={handleAddRegion} 
            disabled={loading}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg h-[56px]"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Add Region</>}
          </button>
        </div>
      </div>

      {/* Regions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regions.map(r => (
          <div key={r.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm tracking-tight">
                <MapPin size={16} /> {r.region_name}
              </div>
              <div className="flex items-center gap-2 text-slate-400 font-bold mt-1 text-xs">
                <UserCheck size={14} /> {r.profiles?.full_name || 'No ASM Assigned'}
              </div>
            </div>
            <button 
              onClick={() => handleDelete(r.id)}
              className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {regions.length === 0 && (
          <div className="col-span-full p-12 text-center border-4 border-dashed rounded-[3rem] text-slate-300 font-black uppercase text-xs tracking-[0.2em]">
            No regions created yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionSettings;
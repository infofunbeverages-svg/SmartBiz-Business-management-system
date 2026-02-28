import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { MapPin, User, Plus, Loader2 } from 'lucide-react';
import { useCompany } from '../../utils/useCompany';

const RegionManagement = () => {
  const { company } = useCompany();
  const [regions, setRegions] = useState<any[]>([]);
  const [asms, setAsms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [regionName, setRegionName] = useState('');
  const [selectedAsm, setSelectedAsm] = useState('');

  const fetchData = async () => {
    if (!company) return;
    
    // Regions සහ ඒකට අදාළ ASM ගේ නම Fetch කිරීම
    const { data: regionData } = await supabase
      .from('sales_regions')
      .select('*, profiles:asm_id(full_name)')
      .eq('company_id', company.id);
    
    // ASM ලා විදිහට ඉන්නේ 'manager' හෝ 'admin' role තියෙන අය කියලා ගමු
    const { data: asmData } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', company.id)
      .in('role', ['manager', 'admin']);

    if (regionData) setRegions(regionData);
    if (asmData) setAsms(asmData);
  };

  useEffect(() => { fetchData(); }, [company]);

  const handleAddRegion = async () => {
    if (!regionName || !selectedAsm) return alert("Region name and ASM are required!");
    setLoading(true);

    const { error } = await supabase.from('sales_regions').insert([
      { 
        region_name: regionName, 
        asm_id: selectedAsm, 
        company_id: company?.id 
      }
    ]);

    if (error) {
      alert(error.message);
    } else {
      setRegionName('');
      setSelectedAsm('');
      fetchData();
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black italic uppercase mb-8 border-b-4 border-slate-900 pb-2">
        Sales <span className="text-blue-600">Regions</span>
      </h1>

      {/* Add Region Form */}
      <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-[10px] font-black uppercase text-blue-600 ml-2 mb-2 block">Region Name</label>
          <input 
            className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. Matara, Galle"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-blue-600 ml-2 mb-2 block">Assign ASM</label>
          <select 
            className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-blue-400"
            value={selectedAsm}
            onChange={(e) => setSelectedAsm(e.target.value)}
          >
            <option value="">Select ASM...</option>
            {asms.map(asm => (
              <option key={asm.id} value={asm.id}>{asm.full_name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={handleAddRegion}
          disabled={loading}
          className="bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />} Add Region
        </button>
      </div>

      {/* Regions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regions.map(r => (
          <div key={r.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-black uppercase text-slate-800 tracking-tight">{r.region_name}</h3>
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <User size={12} /> ASM: {r.profiles?.full_name || 'Not Assigned'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RegionManagement;
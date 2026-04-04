import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { MapPin, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';

const Regions = () => {
  const [regions, setRegions] = useState<any[]>([]);
  const [asms, setAsms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // ඔයාගේ Company ID එක
  const MY_COMPANY_ID = '0d67e5c5-19d2-4967-a6ed-a57fb4e3a389';

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Regions ගෙන්නා ගැනීම
      const { data: regionData, error: regionError } = await supabase
        .from('regions')
        .select('*')
        .eq('company_id', MY_COMPANY_ID)
        .order('region_name');

      if (regionError) throw regionError;

      // 2. ASM ලා ගෙන්නා ගැනීම 
      // role එක 'asm' හෝ 'ASM' වගේ මොන විදිහට තිබ්බත් ilike එකෙන් අහු වෙනවා
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('company_id', MY_COMPANY_ID)
        .filter('role', 'ilike', 'asm');

      if (userError) throw userError;

      setRegions(regionData || []);
      setAsms(userData || []);
      
      console.log("Found ASMs:", userData); // Console එකේ චෙක් කරන්න පුළුවන්
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async (id: string, updatedFields: any) => {
    setUpdating(id);
    const { error } = await supabase
      .from('regions')
      .update(updatedFields)
      .eq('id', id);

    if (error) {
      alert("Update Failed: " + error.message);
    } else {
      // Local state එක update කරන්න (Refresh නොවී පේන්න)
      setRegions(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));
    }
    setUpdating(null);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <RefreshCw className="animate-spin text-blue-600" size={32} />
      <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Loading Regions & Staff...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Region Management</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Assign Area Sales Managers to Zones</p>
        </div>
        <button onClick={fetchData} className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regions.map((region) => (
          <div key={region.id} className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-2xl text-white shadow-lg shadow-blue-100">
                <MapPin size={24} />
              </div>
              {updating === region.id ? (
                <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full animate-pulse uppercase">Saving...</span>
              ) : (
                <span className="text-[10px] font-black text-gray-300 uppercase">Zone Active</span>
              )}
            </div>

            {/* Region Name Edit */}
            <div className="mb-5">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block ml-1">Zone Name</label>
              <input 
                type="text"
                defaultValue={region.region_name}
                onBlur={(e) => {
                  if(e.target.value !== region.region_name) {
                    handleUpdate(region.id, { region_name: e.target.value });
                  }
                }}
                className="w-full font-black text-gray-800 border-none p-1 focus:ring-0 text-lg bg-transparent hover:bg-gray-50 rounded-lg transition-colors"
              />
            </div>

            {/* Provinces Badge View */}
            <div className="mb-6">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block ml-1 text-left">Covered Provinces</label>
              <div className="flex flex-wrap gap-1.5">
                {region.provinces?.map((p: string) => (
                  <span key={p} className="px-3 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded-full text-[9px] font-black uppercase tracking-tighter">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* ASM Selection Dropdown */}
            <div className="pt-5 border-t border-gray-100">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-3 block flex items-center gap-1.5 ml-1">
                <UserCheck size={12} className="text-blue-500" /> Assigned ASM
              </label>
              <select
                value={region.asm_id || ''}
                onChange={(e) => handleUpdate(region.id, { asm_id: e.target.value || null })}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-3 text-xs font-black text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner"
              >
                <option value="">-- SELECT MANAGER --</option>
                {asms.map((asm) => (
                  <option key={asm.id} value={asm.id}>
                    {asm.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {regions.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 p-12 rounded-[2rem] text-center">
          <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-black uppercase text-sm tracking-widest">No Regions Found</p>
          <p className="text-xs text-gray-400 mt-1">Please check your database or company ID.</p>
        </div>
      )}
    </div>
  );
};

export default Regions;
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Phone, MapPin, Loader2, Navigation, Edit3, Ruler, CreditCard, Tent, AlertTriangle, ExternalLink } from 'lucide-react'; 
import { useCompany } from '../../utils/useCompany';

const WAREHOUSE_COORDS = { lat: 6.78795, lng: 80.05799 }; 

const calculateKM = (lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - WAREHOUSE_COORDS.lat) * Math.PI / 180;
  const dLon = (lon2 - WAREHOUSE_COORDS.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(WAREHOUSE_COORDS.lat * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c * 1.2).toFixed(1)); 
};

const extractCoords = (val: string): { lat: number; lng: number } | null => {
  const s = val.replace(/\s/g, '');
  const pair = s.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (pair) {
    const lat = parseFloat(pair[1]);
    const lng = parseFloat(pair[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  const mapsUrl = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/) || s.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (mapsUrl) {
    const lat = parseFloat(mapsUrl[1]);
    const lng = parseFloat(mapsUrl[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return null;
};

const CustomersPage = () => {
  const { company } = useCompany();
  const [customers, setCustomers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newCustomer, setNewCustomer] = useState({ 
    full_name: '', phone: '', email: '', address: '', br_number: '', id_number: '', 
    region_id: '', sales_area: '', payment_type: 'Cash',
    gps_location: `${WAREHOUSE_COORDS.lat},${WAREHOUSE_COORDS.lng}`, 
    distance_km: 0, bank_guarantee_value: 0, bg_start_date: '', bg_expiry_date: '', 
    default_discount: 0
  });

  useEffect(() => { if (company) fetchData(); }, [company]);

  const fetchData = async () => {
    if (!company) return;
    setLoading(true);
    const { data: custData } = await supabase.from('customers').select('*, regions:region_id(*, profiles:asm_id(*))').eq('company_id', company.id).order('created_at', { ascending: false });
    const { data: regionData } = await supabase.from('regions').select('*').eq('company_id', company.id);
    setCustomers(custData || []); setRegions(regionData || []); setLoading(false);
  };

  // ✅ ඩේට් එක චෙක් කරන ෆන්ක්ෂන් එක (මාස 3ක Warning එකට)
  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90; // දවස් 0-90 අතර නම් true
  };

  const handleManualGPSChange = (val: string) => {
    setNewCustomer(prev => {
      const updated = { ...prev, gps_location: val };
      const coords = extractCoords(val);
      if (coords) {
        updated.gps_location = `${coords.lat},${coords.lng}`;
        updated.distance_km = calculateKM(coords.lat, coords.lng);
      }
      return updated;
    });
  };

  const openGoogleMapsForAddress = () => {
    const q = newCustomer.address || newCustomer.gps_location || '';
    const url = q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : 'https://www.google.com/maps';
    window.open(url, '_blank');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return alert("Company Error!");
    setLoading(true);

    const finalPayload: any = {
      name: newCustomer.full_name,
      full_name: newCustomer.full_name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      address: newCustomer.address,
      br_number: newCustomer.br_number,
      id_number: newCustomer.id_number,
      region_id: newCustomer.region_id,
      sales_area: newCustomer.sales_area,
      payment_type: newCustomer.payment_type,
      gps_location: newCustomer.gps_location,
      distance_km: newCustomer.distance_km,
      bank_guarantee_value: newCustomer.payment_type === 'Cash' ? 0 : newCustomer.bank_guarantee_value,
      bg_start_date: newCustomer.payment_type === 'Cash' ? null : (newCustomer.bg_start_date || null),
      bg_expiry_date: newCustomer.payment_type === 'Cash' ? null : (newCustomer.bg_expiry_date || null),
      default_discount: Number(newCustomer.default_discount) || 0,
      company_id: company.id
    };

    const { error } = editingId 
        ? await supabase.from('customers').update(finalPayload).eq('id', editingId) 
        : await supabase.from('customers').insert([finalPayload]);

    if (!error) { 
        setShowAddForm(false); setEditingId(null); fetchData(); 
        setNewCustomer({ 
            full_name: '', phone: '', email: '', address: '', br_number: '', id_number: '', 
            region_id: '', sales_area: '', payment_type: 'Cash',
            gps_location: `${WAREHOUSE_COORDS.lat},${WAREHOUSE_COORDS.lng}`, 
            distance_km: 0, bank_guarantee_value: 0, bg_start_date: '', bg_expiry_date: '', 
            default_discount: 0
        });
    } else { alert("Error: " + error.message); }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen text-left font-sans text-slate-900">
      <div className="flex justify-between items-center mb-10 border-b-4 border-slate-900 pb-6">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Customer Database</h1>
        <button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-600 transition-all"> 
          {showAddForm ? 'Close Form' : 'Add New Customer'} 
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSave} className="bg-white p-10 rounded-[3rem] shadow-2xl mb-12 border-4 border-blue-50 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 italic">
            <h2 className="text-[10px] font-black text-blue-600 border-b pb-1 uppercase tracking-widest">Identity</h2>
            <input type="text" placeholder="Full Name" required className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" value={newCustomer.full_name} onChange={e => setNewCustomer({...newCustomer, full_name: e.target.value})} />
            <input type="text" placeholder="ID / Passport Number" className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" value={newCustomer.id_number} onChange={e => setNewCustomer({...newCustomer, id_number: e.target.value})} />
            <input type="text" placeholder="Sales Area" className="w-full bg-blue-50 p-4 rounded-2xl font-bold outline-none border-2 border-blue-200" value={newCustomer.sales_area} onChange={e => setNewCustomer({...newCustomer, sales_area: e.target.value})} />
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Default Discount % (Invoice)</label>
              <input type="number" step="0.01" min="0" max="100" placeholder="0" className="w-full bg-amber-50 p-4 rounded-2xl font-bold outline-none border-2 border-amber-200" value={newCustomer.default_discount === 0 ? '' : newCustomer.default_discount} onChange={e => setNewCustomer({...newCustomer, default_discount: parseFloat(e.target.value) || 0})} />
            </div>
            <input type="text" placeholder="Phone" required className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
          </div>

          <div className="space-y-4 italic">
            <h2 className="text-[10px] font-black text-blue-600 border-b pb-1 uppercase tracking-widest">Region & Address</h2>
            <select required className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black outline-none" value={newCustomer.region_id} onChange={e => setNewCustomer({...newCustomer, region_id: e.target.value})}>
              <option value="">-- SELECT REGION --</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.region_name}</option>)}
            </select>
            <textarea placeholder="Address" className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none h-20" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> Location (Warehouse → KM)</label>
              <div className="flex gap-2">
                <button type="button" onClick={openGoogleMapsForAddress} className="flex items-center gap-1.5 shrink-0 bg-green-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-green-700 transition-all whitespace-nowrap">
                  <ExternalLink size={14}/> Open Google Maps
                </button>
                <input type="text" placeholder="Paste lat,lng (e.g. 6.78795,80.05799) or Maps URL" className="flex-1 bg-slate-50 p-3 rounded-xl font-bold text-xs outline-none font-mono" value={newCustomer.gps_location} onChange={e => handleManualGPSChange(e.target.value)} />
              </div>
              {newCustomer.distance_km > 0 && (
                <p className="text-[10px] font-black text-blue-600 flex items-center gap-1"><Ruler size={12}/> From main warehouse: <span className="bg-blue-100 px-2 py-0.5 rounded">{newCustomer.distance_km} KM</span></p>
              )}
            </div>
          </div>

          <div className="space-y-4 italic">
            <h2 className="text-[10px] font-black text-blue-600 border-b pb-1 uppercase tracking-widest">Terms</h2>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setNewCustomer({...newCustomer, payment_type: 'Cash'})} className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase transition-all ${newCustomer.payment_type === 'Cash' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>Cash</button>
                <button type="button" onClick={() => setNewCustomer({...newCustomer, payment_type: 'Credit'})} className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase transition-all ${newCustomer.payment_type === 'Credit' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>Credit/BG</button>
            </div>
            {newCustomer.payment_type === 'Credit' && (
              <div className="space-y-2">
                <input type="number" placeholder="BG Value" className="w-full bg-slate-50 p-4 rounded-2xl font-bold" value={newCustomer.bank_guarantee_value} onChange={e => setNewCustomer({...newCustomer, bank_guarantee_value: parseFloat(e.target.value) || 0})} />
                <input type="date" className="w-full bg-red-50 p-4 rounded-2xl font-bold text-red-600" value={newCustomer.bg_expiry_date} onChange={e => setNewCustomer({...newCustomer, bg_expiry_date: e.target.value})} />
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="bg-blue-600 text-white p-6 rounded-[2rem] font-black uppercase shadow-xl mt-auto"> 
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Save Record"} 
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {customers.map((c) => {
          const expiring = isExpiringSoon(c.bg_expiry_date);
          return (
            <div key={c.id} className={`bg-white p-8 rounded-[3rem] shadow-xl border-4 transition-all relative overflow-hidden ${expiring ? 'border-yellow-400' : 'border-white'}`}>
              
              {/* Expiring Soon Tag */}
              {expiring && c.payment_type !== 'Cash' && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-slate-900 text-[10px] font-black py-2 flex items-center justify-center gap-2 uppercase italic shadow-sm animate-pulse">
                  <AlertTriangle size={14}/> Expiring Soon (Within 3 Months)
                </div>
              )}

              <div className="absolute top-10 right-0">
                <span className={`px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase text-white ${c.payment_type === 'Cash' ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                    {c.payment_type || 'Cash'}
                </span>
              </div>

              <button onClick={() => { 
                const { regions, ...rest } = c;
                setNewCustomer({...newCustomer, ...rest, full_name: c.full_name || c.name || '', default_discount: c.default_discount ?? 0}); 
                setEditingId(c.id); setShowAddForm(true); 
              }} className="absolute top-20 right-6 p-2 bg-slate-50 rounded-full text-slate-300 hover:text-blue-600"> <Edit3 size={18} /> </button>
              
              <h3 className={`text-2xl font-black text-slate-800 uppercase italic truncate mb-1 pr-12 tracking-tight ${expiring ? 'mt-6' : ''}`}>{c.full_name || c.name}</h3>
              
              <div className="flex items-center gap-1 mb-4 text-blue-600 font-black italic text-[11px] uppercase">
                <Tent size={12}/> {c.sales_area || 'No Area Specified'}
                {(c.default_discount != null && Number(c.default_discount) > 0) && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px]">Disc: {Number(c.default_discount)}%</span>
                )}
              </div>

              <div className="space-y-2 mb-6 text-xs font-bold text-slate-400 italic border-t pt-4"> 
                  <p className="flex items-center gap-2 truncate"><Phone size={14} className="text-blue-600"/> {c.phone}</p> 
                  {c.id_number && <p className="flex items-center gap-2 truncate"><CreditCard size={14} className="text-blue-600"/> ID: {c.id_number}</p>}
                  <p className="flex items-center gap-2 truncate"><MapPin size={14} className="text-blue-600"/> {c.address || 'No Address'}</p> 
                  {c.distance_km > 0 && <p className="flex items-center gap-2 text-blue-600 font-black"><Ruler size={14}/> {c.distance_km} KM from warehouse</p>}
                  {c.payment_type !== 'Cash' && (
                     <div className="mt-2 p-3 bg-slate-50 rounded-2xl">
                        <p className={`font-black uppercase text-[10px] ${expiring ? 'text-red-600' : 'text-slate-900'}`}>
                           BG: LKR {c.bank_guarantee_value?.toLocaleString()}
                        </p>
                        <p className={`text-[9px] font-bold ${expiring ? 'text-red-500 underline' : 'text-slate-400'}`}>
                           Expires: {c.bg_expiry_date || 'N/A'}
                        </p>
                     </div>
                  )}
              </div>

              <div className="flex justify-between items-center bg-slate-900 p-5 rounded-[2rem] text-white text-[10px] font-black mb-4 uppercase italic"> 
                  <div><p className="text-blue-400 text-[8px] uppercase not-italic tracking-widest">ASM</p>{c.regions?.profiles?.full_name || 'N/A'}</div> 
                  <div className="text-right"><p className="text-blue-400 text-[8px] uppercase not-italic tracking-widest">Region</p>{c.regions?.region_name || 'N/A'}</div> 
              </div>

              <a href={`https://www.google.com/maps/search/?api=1&query=${c.gps_location}`} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 text-white p-3 rounded-xl text-[10px] font-black text-center flex items-center justify-center gap-1 shadow-lg hover:bg-blue-700 transition-all uppercase italic"> 
                 <Navigation size={12}/> View on Google Maps 
              </a> 
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomersPage;
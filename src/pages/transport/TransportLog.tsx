import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ClipboardList, Plus, Truck, User, MapPin, Banknote, Save, Calculator, CheckCircle2 } from 'lucide-react';

const TransportLog = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    trip_date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    driver_id: '',
    total_distance: 0,
    rate_per_km: 0,
    fuel_cost: 0,
    hire_cost: 0,
    advance_paid: 0,
    description: '',
    drop_locations: [] as string[] // Selected Customer IDs
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: v } = await supabase.from('transport_vehicles').select('*');
    const { data: d } = await supabase.from('transport_drivers').select('*');
    const { data: c } = await supabase.from('customers').select('id, name, distance_km');
    const { data: l } = await supabase
      .from('transport_log')
      .select('*, transport_vehicles(vehicle_no), transport_drivers(driver_name)')
      .order('trip_date', { ascending: false });

    if (v) setVehicles(v);
    if (d) setDrivers(d);
    if (c) setCustomers(c);
    if (l) setLogs(l);
  };

  // Logic: Calculate KM when a customer (drop) is selected/deselected
  const handleDropChange = (customerId: string) => {
    let newDrops = [...formData.drop_locations];
    if (newDrops.includes(customerId)) {
      newDrops = newDrops.filter(id => id !== customerId);
    } else {
      newDrops.push(customerId);
    }

    // KM එකතු කිරීම
    const totalKM = customers
      .filter(c => newDrops.includes(c.id))
      .reduce((sum, c) => sum + (Number(c.distance_km) || 0), 0);

    const newHire = totalKM * formData.rate_per_km;

    setFormData({ 
      ...formData, 
      drop_locations: newDrops, 
      total_distance: totalKM,
      hire_cost: newHire 
    });
  };

  // Logic: Recalculate Hire when Rate changes
  const handleRateChange = (rate: number) => {
    setFormData({ 
      ...formData, 
      rate_per_km: rate, 
      hire_cost: formData.total_distance * rate 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_id || !formData.driver_id) return alert("කරුණාකර වාහනය සහ රියදුරු තෝරන්න!");

    setLoading(true);
    const { error } = await supabase.from('transport_log').insert([formData]);
    
    if (!error) {
      alert("ගමන් වාරය සාර්ථකව ඇතුළත් කළා!");
      setFormData({
        trip_date: new Date().toISOString().split('T')[0],
        vehicle_id: '', driver_id: '', total_distance: 0, rate_per_km: 0,
        fuel_cost: 0, hire_cost: 0, advance_paid: 0, description: '', drop_locations: []
      });
      fetchInitialData();
    } else {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans italic">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={36} />
            Transport <span className="text-blue-600">Log</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Advanced Hire & Distance Manager</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 not-italic">
          {/* Entry Form */}
          <div className="lg:col-span-4">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white space-y-4 sticky top-8">
              <h3 className="text-[11px] font-black uppercase text-slate-800 flex items-center gap-2 mb-2 italic">
                <Plus size={16} className="text-blue-600" /> New Trip Entry
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Date</label>
                  <input type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none" 
                    value={formData.trip_date} onChange={e => setFormData({...formData, trip_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Vehicle</label>
                  <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none"
                    value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                    <option value="">Select</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_no}</option>)}
                  </select>
                </div>
              </div>

              {/* Multi-Drop Checkbox List */}
              <div>
                <label className="text-[9px] font-black text-blue-600 uppercase ml-2 mb-1 block italic flex items-center gap-1">
                  <MapPin size={10}/> Select Drops (Auto KM Sum)
                </label>
                <div className="max-h-40 overflow-y-auto bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1">
                  {customers.length === 0 ? <p className="text-[10px] font-bold text-slate-300 p-2">No customers found</p> : 
                    customers.map(c => (
                    <label key={c.id} className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${formData.drop_locations.includes(c.id) ? 'bg-blue-100/50 border border-blue-200' : 'hover:bg-white'}`}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={formData.drop_locations.includes(c.id)} onChange={() => handleDropChange(c.id)} className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase">{c.name}</span>
                      </div>
                      <span className="text-[9px] font-black text-blue-500 bg-white px-2 py-0.5 rounded-lg">{c.distance_km || 0} KM</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Total KM</label>
                  <div className="relative">
                    <input type="number" className="w-full p-3 bg-blue-50 text-blue-700 rounded-xl font-black text-xs outline-none" 
                      value={formData.total_distance} onChange={e => setFormData({...formData, total_distance: Number(e.target.value)})} />
                    <Calculator size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Rate (LKR/KM)</label>
                  <input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-black text-xs outline-none" 
                    placeholder="0" value={formData.rate_per_km} onChange={e => handleRateChange(Number(e.target.value))} />
                </div>
              </div>

              {/* Hire Output */}
              <div className="bg-emerald-600 p-4 rounded-3xl shadow-lg shadow-emerald-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-emerald-100 uppercase italic">Calculated Hire Cost</span>
                  <Banknote size={16} className="text-emerald-200" />
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-white text-[10px] font-black uppercase">LKR</span>
                   <input type="number" className="w-full bg-transparent text-2xl font-black text-white outline-none" 
                    value={formData.hire_cost} onChange={e => setFormData({...formData, hire_cost: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Fuel (Optional)</label>
                  <input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none" 
                    value={formData.fuel_cost} onChange={e => setFormData({...formData, fuel_cost: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-orange-500 uppercase ml-2 mb-1 block italic">Advance Paid</label>
                  <input type="number" className="w-full p-3 bg-orange-50 rounded-xl font-black text-xs outline-none text-orange-600" 
                    value={formData.advance_paid} onChange={e => setFormData({...formData, advance_paid: Number(e.target.value)})} />
                </div>
              </div>

              <button disabled={loading} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2">
                {loading ? 'Saving...' : <><Save size={18}/> Save Trip Log</>}
              </button>
            </form>
          </div>

          {/* Table Side */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase italic tracking-widest">
                    <tr>
                      <th className="p-6 text-left">Trip / Vehicle</th>
                      <th className="p-6 text-center">Distance Logic</th>
                      <th className="p-6 text-right">Payment Info</th>
                      <th className="p-6 text-right font-sans">Final Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-all group">
                        <td className="p-6">
                          <p className="font-black text-slate-800 text-xs uppercase italic">{log.trip_date}</p>
                          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mt-1 uppercase">
                            <Truck size={12} className="text-blue-500"/> {log.transport_vehicles?.vehicle_no}
                            <User size={12} className="text-slate-300"/> {log.transport_drivers?.driver_name}
                          </div>
                        </td>
                        <td className="p-6 text-center font-black text-slate-600">
                          <div className="flex flex-col items-center">
                            <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{log.total_distance} KM Total</span>
                            <span className="text-[9px] text-slate-400 mt-1 uppercase">@ LKR {log.rate_per_km}/km</span>
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <p className="text-[10px] font-black text-slate-500 uppercase">Hire: {log.hire_cost?.toLocaleString()}</p>
                          <p className="text-[10px] font-black text-orange-400 italic">Adv: {log.advance_paid?.toLocaleString()}</p>
                        </td>
                        <td className="p-6 text-right font-black text-emerald-600 italic bg-emerald-50/20 text-sm">
                          LKR {(log.hire_cost - log.advance_paid).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportLog;
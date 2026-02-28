import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Truck, Wrench, Plus, History, DollarSign } from 'lucide-react';

const VehicleMaintenance = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    service_type: 'Full Service',
    description: '',
    cost: 0,
    odometer_reading: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: v } = await supabase.from('transport_vehicles').select('*');
    if (v) setVehicles(v);
    
    const { data: l } = await supabase
      .from('vehicle_maintenance')
      .select('*, transport_vehicles(vehicle_number)')
      .order('date', { ascending: false });
    if (l) setLogs(l);
  };

  const handleSave = async () => {
    if (!formData.vehicle_id || formData.cost <= 0) return alert("Fill all details!");
    setLoading(true);
    const { error } = await supabase.from('vehicle_maintenance').insert([formData]);
    if (!error) {
      alert("Maintenance Log Saved!");
      setFormData({ vehicle_id: '', service_type: 'Full Service', description: '', cost: 0, odometer_reading: 0 });
      fetchData();
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-left italic">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3 mb-8">
          <Wrench className="text-blue-600" size={32} />
          Vehicle <span className="text-blue-600">Maintenance</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white h-fit">
            <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6">Log New Maintenance</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 block">Select Vehicle</label>
                <select 
                  className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none mt-1"
                  value={formData.vehicle_id}
                  onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
                >
                  <option value="">-- Choose --</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number} ({v.model})</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 block">Service Type</label>
                <select 
                  className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none mt-1"
                  value={formData.service_type}
                  onChange={e => setFormData({...formData, service_type: e.target.value})}
                >
                  <option>Full Service</option>
                  <option>Repair</option>
                  <option>Tyre Change</option>
                  <option>Battery</option>
                  <option>Fuel</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 block">Cost (LKR)</label>
                <input 
                  type="number"
                  className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none mt-1"
                  value={formData.cost || ''}
                  onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 block">Description</label>
                <textarea 
                  className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none mt-1"
                  placeholder="What was fixed?"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-lg mt-4"
              >
                {loading ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </div>

          {/* History Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Date</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Vehicle</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Type</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="p-5 text-xs font-bold text-slate-500">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="p-5 font-black text-slate-700 text-sm">{log.transport_vehicles?.vehicle_number}</td>
                      <td className="p-5">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{log.service_type}</span>
                      </td>
                      <td className="p-5 text-right font-mono font-black text-red-600 italic">LKR {log.cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleMaintenance;
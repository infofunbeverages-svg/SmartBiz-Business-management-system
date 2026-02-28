import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Truck, UserPlus, Save, Trash2, Plus, Settings2, Weight, Box } from 'lucide-react';

const TransportSetup = () => {
  const [activeTab, setActiveTab] = useState<'VEHICLES' | 'DRIVERS'>('VEHICLES');
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Form States
  const [vehicleForm, setVehicleForm] = useState({ 
    vehicle_no: '', 
    vehicle_type: 'Lorry', 
    vehicle_size: 'Batta', // Matches new SQL column
    case_capacity: '',     // Matches crate_capacity in DB
    weight_capacity: '',   // Matches capacity_tons in DB
    owner_name: '',
    owner_phone: ''
  });
  
  const [driverForm, setDriverForm] = useState({ driver_name: '', phone_number: '', license_no: '' });

  const truckSizes = ['Batta', '10.5', '14.5', '16.5', '18', '18.5', '20 Tank', '24 Tank'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: v } = await supabase.from('transport_vehicles').select('*').order('created_at');
    const { data: d } = await supabase.from('transport_drivers').select('*').order('created_at');
    if (v) setVehicles(v);
    if (d) setDrivers(d);
  };

  const handleAddVehicle = async () => {
    if (!vehicleForm.vehicle_no) return alert("Vehicle No is required!");
    setLoading(true);

    // Convert strings to numbers for DB compatibility
    const payload = {
      ...vehicleForm,
      case_capacity: vehicleForm.case_capacity ? parseInt(vehicleForm.case_capacity) : 0,
      weight_capacity: vehicleForm.weight_capacity ? parseFloat(vehicleForm.weight_capacity) : 0
    };

    const { error } = await supabase.from('transport_vehicles').insert([payload]);
    
    if (!error) {
      setVehicleForm({ 
        vehicle_no: '', vehicle_type: 'Lorry', vehicle_size: 'Batta', 
        case_capacity: '', weight_capacity: '', owner_name: '', owner_phone: '' 
      });
      fetchData();
    } else {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const handleAddDriver = async () => {
    if (!driverForm.driver_name) return alert("Driver Name is required!");
    setLoading(true);
    const { error } = await supabase.from('transport_drivers').insert([driverForm]);
    if (!error) {
      setDriverForm({ driver_name: '', phone_number: '', license_no: '' });
      fetchData();
    }
    setLoading(false);
  };

  const deleteVehicle = async (id: string) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      const { error } = await supabase.from('transport_vehicles').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen italic">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
              <Settings2 className="text-blue-600" size={36} />
              Transport <span className="text-blue-600">Setup</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Register your fleet and team members</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 font-sans">
            <button onClick={() => setActiveTab('VEHICLES')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'VEHICLES' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>VEHICLES</button>
            <button onClick={() => setActiveTab('DRIVERS')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'DRIVERS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>DRIVERS</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
          {/* Form Side */}
          <div className="lg:col-span-4">
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white sticky top-8">
              <h3 className="text-sm font-black uppercase text-slate-800 mb-6 flex items-center gap-2 italic">
                <Plus className="text-blue-600" size={18} />
                {activeTab === 'VEHICLES' ? 'Add New Vehicle' : 'Add New Driver'}
              </h3>

              {activeTab === 'VEHICLES' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Vehicle Number</label>
                    <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="WP LH-XXXX" value={vehicleForm.vehicle_no} onChange={e => setVehicleForm({...vehicleForm, vehicle_no: e.target.value.toUpperCase()})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Lorry Size</label>
                      <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" value={vehicleForm.vehicle_size} onChange={e => setVehicleForm({...vehicleForm, vehicle_size: e.target.value})}>
                        {truckSizes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Owner Name</label>
                      <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="Owner" value={vehicleForm.owner_name} onChange={e => setVehicleForm({...vehicleForm, owner_name: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Case Cap (Crates)</label>
                      <div className="relative">
                        <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" value={vehicleForm.case_capacity} onChange={e => setVehicleForm({...vehicleForm, case_capacity: e.target.value})} />
                        <Box size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Tonnage (Tons)</label>
                      <div className="relative">
                        <input type="number" step="0.1" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.0" value={vehicleForm.weight_capacity} onChange={e => setVehicleForm({...vehicleForm, weight_capacity: e.target.value})} />
                        <Weight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      </div>
                    </div>
                  </div>

                  <button onClick={handleAddVehicle} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black uppercase italic tracking-widest transition-all mt-4 shadow-lg shadow-blue-200">
                    {loading ? 'Processing...' : 'Save Vehicle'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Driver Name</label>
                    <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="Full Name" value={driverForm.driver_name} onChange={e => setDriverForm({...driverForm, driver_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Phone Number</label>
                    <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500" placeholder="07X XXXXXXX" value={driverForm.phone_number} onChange={e => setDriverForm({...driverForm, phone_number: e.target.value})} />
                  </div>
                  <button onClick={handleAddDriver} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-5 rounded-2xl font-black uppercase italic tracking-widest transition-all mt-4 shadow-lg shadow-emerald-200">
                    Save Driver
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* List Side */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-white">
              <table className="w-full">
                <thead className="bg-slate-900 text-white">
                  {activeTab === 'VEHICLES' ? (
                    <tr className="text-[10px] font-black uppercase tracking-widest italic">
                      <th className="p-6 text-left">Vehicle & Size</th>
                      <th className="p-6 text-center">Case Cap</th>
                      <th className="p-6 text-center">Tonnage</th>
                      <th className="p-6 text-left">Owner</th>
                      <th className="p-6 text-right">Action</th>
                    </tr>
                  ) : (
                    <tr className="text-[10px] font-black uppercase tracking-widest italic">
                      <th className="p-6 text-left">Driver Name</th>
                      <th className="p-6 text-left">Phone</th>
                      <th className="p-6 text-right">Action</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans">
                  {activeTab === 'VEHICLES' ? (
                    vehicles.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-700 uppercase italic flex items-center gap-2 text-sm">
                              <Truck size={16} className="text-blue-500"/>{v.vehicle_no}
                            </span>
                            <span className="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-wider">Size: {v.vehicle_size || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span className="font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg text-xs">{v.case_capacity || '0'}</span>
                        </td>
                        <td className="p-6 text-center">
                          <span className="font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg text-xs">{v.weight_capacity || '0'} T</span>
                        </td>
                        <td className="p-6">
                            <p className="font-bold text-slate-700 text-xs uppercase">{v.owner_name || '-'}</p>
                            <p className="text-[9px] text-slate-400 font-bold">{v.owner_phone || ''}</p>
                        </td>
                        <td className="p-6 text-right">
                          <button onClick={() => deleteVehicle(v.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                            <Trash2 size={18}/>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    drivers.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-6 font-black text-slate-700 uppercase italic"><div className="flex items-center gap-3"><UserPlus size={16} className="text-emerald-500"/>{d.driver_name}</div></td>
                        <td className="p-6 font-bold text-slate-500 font-mono text-sm">{d.phone_number}</td>
                        <td className="p-6 text-right"><button className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportSetup;
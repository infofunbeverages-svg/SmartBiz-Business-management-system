import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Truck, Plus, Save, Phone, MapPin, Building, CreditCard, X } from 'lucide-react';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '', supplier_type: 'Local', payment_mode: 'Credit',
    address: '', phone: '', company_reg_no: ''
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data || []);
    setLoading(false);
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('suppliers').insert([newSupplier]);
    if (!error) {
      setShowAddForm(false);
      fetchSuppliers();
    } else { alert(error.message); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black uppercase italic text-gray-800 flex items-center">
          <Truck className="mr-3 text-blue-600" /> Supplier Management
        </h1>
        <button onClick={() => setShowAddForm(!showAddForm)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase shadow-lg">
          {showAddForm ? 'Close' : 'Add Supplier'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSupplier} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
          <input type="text" placeholder="Company Name" required className="bg-gray-50 border-none p-4 rounded-xl text-sm font-bold" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
          <select className="bg-gray-50 border-none p-4 rounded-xl text-sm font-bold" value={newSupplier.supplier_type} onChange={e => setNewSupplier({...newSupplier, supplier_type: e.target.value})}>
            <option value="Local">Local Supplier</option>
            <option value="Import">Import Supplier</option>
            <option value="Service">Service Provider</option>
          </select>
          <select className="bg-gray-50 border-none p-4 rounded-xl text-sm font-bold" value={newSupplier.payment_mode} onChange={e => setNewSupplier({...newSupplier, payment_mode: e.target.value})}>
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
            <option value="Cheque">Cheque</option>
          </select>
          <input type="text" placeholder="Phone Number" className="bg-gray-50 border-none p-4 rounded-xl text-sm font-bold" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
          <input type="text" placeholder="Company Reg No" className="bg-gray-50 border-none p-4 rounded-xl text-sm font-bold" value={newSupplier.company_reg_no} onChange={e => setNewSupplier({...newSupplier, company_reg_no: e.target.value})} />
          <textarea placeholder="Address" className="bg-gray-50 border-none p-4 rounded-xl text-sm font-bold md:col-span-2" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} />
          <button type="submit" className="bg-green-500 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center shadow-lg"><Save size={18} className="mr-2" /> Save Supplier</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{s.supplier_type}</span>
              <span className="text-[9px] font-black uppercase bg-gray-50 text-gray-500 px-3 py-1 rounded-full">{s.payment_mode}</span>
            </div>
            <h3 className="text-lg font-black text-gray-800 uppercase mb-2 italic">{s.name}</h3>
            <div className="space-y-1 text-xs font-bold text-gray-400 uppercase">
              <p className="flex items-center"><Phone size={14} className="mr-2" /> {s.phone}</p>
              <p className="flex items-center"><Building size={14} className="mr-2" /> {s.address}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuppliersPage;
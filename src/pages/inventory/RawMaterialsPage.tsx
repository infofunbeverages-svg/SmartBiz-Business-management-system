import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { logActivity } from '../../utils/activityLogger';
import { Plus, Pencil, Trash2, Search, X, Loader2, FlaskConical } from 'lucide-react';

const UNIT_LABELS: Record<string, string> = {
  BAGS: 'Bags', KG: 'Kg', NOS: 'Nos', TUBES: 'Tubes', LITRE: 'Litre', MTR: 'Mtr',
};

const RawMaterialsPage = () => {
  const { company } = useCompany();
  const [materials, setMaterials]     = useState<any[]>([]);
  const [suppliers, setSuppliers]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [activeModal, setActiveModal] = useState<'NONE' | 'ADD' | 'EDIT'>('NONE');
  const [selected, setSelected]       = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '', unit_type: 'KG', size: '', default_supplier_id: '',
  });

  const fetchData = async () => {
    if (!company?.id) return;
    setLoading(true);
    const [matRes, suppRes] = await Promise.all([
      supabase.from('raw_materials')
        .select('*, suppliers:default_supplier_id(name)')
        .eq('company_id', company.id)
        .order('name', { ascending: true }),
      supabase.from('suppliers').select('*').eq('company_id', company.id).order('name'),
    ]);
    setMaterials(matRes.data || []);
    setSuppliers(suppRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (company?.id) fetchData(); }, [company?.id]);

  const closeModal = () => {
    setActiveModal('NONE');
    setSelected(null);
    setFormData({ name: '', unit_type: 'KG', size: '', default_supplier_id: '' });
  };

  const handleAdd = async () => {
    if (!formData.name) return alert('Name is required!');
    const { error } = await supabase.from('raw_materials').insert([{
      ...formData, company_id: company?.id, quantity: 0,
    }]);
    if (!error) { await logActivity({ company_id: company?.id || '', module: 'INVENTORY', action: 'RAW_MATERIAL_CREATED', details: { name: formData.name } }); closeModal(); fetchData(); }
    else alert('Error: ' + error.message);
  };

  const handleEdit = async () => {
    if (!formData.name) return alert('Name is required!');
    const { error } = await supabase.from('raw_materials')
      .update(formData).eq('id', selected.id);
    if (!error) { await logActivity({ company_id: company?.id || '', module: 'INVENTORY', action: 'RAW_MATERIAL_UPDATED', details: { name: formData.name } }); closeModal(); fetchData(); }
    else alert('Error: ' + error.message);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this raw material?')) return;
    await supabase.from('raw_materials').delete().eq('id', id);
    fetchData();
  };

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">
            Raw <span className="text-amber-600">Materials</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Raw material inventory & stock levels</p>
        </div>
        <button onClick={() => setActiveModal('ADD')}
          className="flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all">
          <Plus size={16} /> New Material
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search materials..."
          className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border font-bold text-sm outline-none"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-400" /></button>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-amber-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">No raw materials found</p>
            <p className="text-xs mt-1">Add your first raw material to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white text-[10px] uppercase">
              <tr>
                <th className="p-4 text-left">Material Name</th>
                <th className="p-4 text-center">Unit</th>
                <th className="p-4 text-center">Size</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-left">Default Supplier</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(m => {
                const unitLabel = UNIT_LABELS[m.unit_type] || m.unit_type;
                const lowStock = m.quantity <= 10;
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4"><div className="font-black text-gray-800 uppercase text-xs">{m.name}</div></td>
                    <td className="p-4 text-center">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">{unitLabel}</span>
                    </td>
                    <td className="p-4 text-center text-xs font-bold text-gray-500">{m.size || '—'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${lowStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        {m.quantity} {unitLabel}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-600 uppercase">{m.suppliers?.name || '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setSelected(m); setFormData({ name: m.name, unit_type: m.unit_type, size: m.size || '', default_supplier_id: m.default_supplier_id || '' }); setActiveModal('EDIT'); }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(m.id)}
                          className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(activeModal === 'ADD' || activeModal === 'EDIT') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black uppercase">{activeModal === 'ADD' ? 'New Raw Material' : 'Edit Material'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Material Name *</label>
                <input type="text" placeholder="e.g. PET Bottles 350ml"
                  className="w-full p-3 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-amber-400"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Unit Type *</label>
                  <select className="w-full p-3 bg-slate-50 rounded-2xl font-bold border-none outline-none"
                    value={formData.unit_type} onChange={e => setFormData({ ...formData, unit_type: e.target.value })}>
                    {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Size (Optional)</label>
                  <input type="text" placeholder="e.g. 350ml, 5kg"
                    className="w-full p-3 bg-slate-50 rounded-2xl font-bold border-none outline-none"
                    value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Default Supplier</label>
                <select className="w-full p-3 bg-slate-50 rounded-2xl font-bold border-none outline-none"
                  value={formData.default_supplier_id} onChange={e => setFormData({ ...formData, default_supplier_id: e.target.value })}>
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 py-3 bg-gray-100 rounded-2xl font-black text-xs uppercase hover:bg-gray-200">Cancel</button>
              <button onClick={activeModal === 'ADD' ? handleAdd : handleEdit}
                className="flex-1 py-3 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-amber-700">
                {activeModal === 'ADD' ? 'Add Material' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterialsPage;

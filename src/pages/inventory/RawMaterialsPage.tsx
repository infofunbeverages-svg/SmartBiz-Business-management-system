import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import TableView from '../../components/common/TableView';
import { Card, CardContent } from '../../components/ui/Card';
import {
  Plus, Pencil, Trash2, History, PackagePlus, RefreshCcw, Search, X, Package
} from 'lucide-react';
import { useCompany } from '../../utils/useCompany';

const UNIT_LABELS: Record<string, string> = {
  BAGS: 'Bags',
  KG: 'Kg',
  NOS: 'Nos',
  TUBES: 'Tubes',
};

const RawMaterialsPage = () => {
  const { company } = useCompany();
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModal, setActiveModal] = useState<'NONE' | 'ADJUST' | 'EDIT' | 'HISTORY' | 'ADD'>('NONE');
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('OUT');
  const [adjQty, setAdjQty] = useState(0);
  const [adjNote, setAdjNote] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    unit_type: 'BAGS' as 'BAGS' | 'KG' | 'NOS' | 'TUBES',
    qty_per_unit: 1,
    size: '',
    default_supplier_id: '',
    sku: '',
  });

  const fetchMaterials = async () => {
    if (!company) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*, suppliers:default_supplier_id(name)')
      .eq('company_id', company.id)
      .order('name', { ascending: true });
    if (!error) setMaterials(data || []);
    setLoading(false);
  };

  const fetchSuppliers = async () => {
    if (!company) return;
    const { data } = await supabase.from('suppliers').select('*').eq('company_id', company.id).order('name');
    setSuppliers(data || []);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [company]);

  useEffect(() => {
    fetchMaterials();
  }, [company]);

  const handleAddMaterial = async () => {
    if (!formData.name || !company) return alert('Raw material name is required!');

    const { error } = await supabase.from('raw_materials').insert([{
      company_id: company.id,
      name: formData.name,
      unit_type: formData.unit_type,
      qty_per_unit: formData.qty_per_unit || 1,
      size: formData.size || null,
      default_supplier_id: formData.default_supplier_id || null,
      sku: formData.sku || null,
      quantity: 0,
    }]);

    if (!error) {
      closeAllModals();
      fetchMaterials();
    } else {
      alert('Error adding raw material: ' + error.message);
    }
  };

  const handleUpdateMaterial = async () => {
    if (!selectedMaterial || !formData.name) return;

    const { error } = await supabase
      .from('raw_materials')
      .update({
        name: formData.name,
        unit_type: formData.unit_type,
        qty_per_unit: formData.qty_per_unit || 1,
        size: formData.size || null,
        default_supplier_id: formData.default_supplier_id || null,
        sku: formData.sku || null,
      })
      .eq('id', selectedMaterial.id);

    if (!error) {
      closeAllModals();
      fetchMaterials();
    } else {
      alert('Error updating: ' + error.message);
    }
  };

  const handleSaveAdjustment = async () => {
    if (!selectedMaterial) return;
    const finalQty = (adjType === 'IN' ? 1 : -1) * (adjQty || 0);
    if (finalQty === 0) return alert('Enter quantity!');

    const { error: moveError } = await supabase.from('raw_material_movements').insert([{
      raw_material_id: selectedMaterial.id,
      quantity: finalQty,
      type: adjType === 'IN' ? 'ADJUST_IN' : 'ADJUST_OUT',
      sub_type: 'MANUAL',
      note: adjNote,
    }]);

    if (!moveError) {
      const newQty = Math.max(0, (selectedMaterial.quantity || 0) + finalQty);
      await supabase.from('raw_materials').update({ quantity: newQty }).eq('id', selectedMaterial.id);
      closeAllModals();
      fetchMaterials();
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this raw material?')) return;
    const { error } = await supabase.from('raw_materials').delete().eq('id', id);
    if (!error) fetchMaterials();
  };

  const fetchItemHistory = async (material: any) => {
    setSelectedMaterial(material);
    const { data } = await supabase
      .from('raw_material_movements')
      .select('*')
      .eq('raw_material_id', material.id)
      .order('created_at', { ascending: false })
      .limit(15);
    setHistoryData(data || []);
    setActiveModal('HISTORY');
  };

  const closeAllModals = () => {
    setActiveModal('NONE');
    setSelectedMaterial(null);
    setAdjQty(0);
    setAdjNote('');
    setFormData({
      name: '',
      unit_type: 'BAGS',
      qty_per_unit: 1,
      size: '',
      default_supplier_id: '',
      sku: '',
    });
  };

  const filteredMaterials = materials.filter((m) =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatStock = (m: any) => {
    const unit = UNIT_LABELS[m.unit_type] || m.unit_type;
    const qty = m.quantity || 0;
    if (m.unit_type === 'BAGS' && m.qty_per_unit > 1) {
      return `${qty} ${unit} (${qty * (m.qty_per_unit || 1)} pcs)`;
    }
    return `${qty} ${unit}`;
  };

  if (!company) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase italic">Loading company...</div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">
            Raw Materials <span className="text-amber-600">Master</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Bags, Kg, Nos, Tubes - විවිධ unit types අනුව කළමනාකරණය කරන්න
          </p>
        </div>
        <button
          onClick={() => setActiveModal('ADD')}
          className="flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all"
        >
          <Plus size={18} /> New Raw Material
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search raw materials..."
          className="w-full pl-12 pr-4 py-4 bg-white border-none shadow-sm rounded-2xl outline-none font-bold text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <TableView
            data={filteredMaterials}
            columns={[
              {
                header: 'Raw Material',
                accessorKey: 'name',
                cell: (r: any) => (
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800 uppercase italic">{r.name}</span>
                    <span className="text-[9px] font-bold text-slate-400">
                      SKU: {r.sku || 'N/A'} | Unit: {UNIT_LABELS[r.unit_type] || r.unit_type}
                      {r.size && ` | Size: ${r.size}`}
                      {r.unit_type === 'BAGS' && r.qty_per_unit > 1 && ` | ${r.qty_per_unit} pcs/bag`}
                    </span>
                    {r.suppliers?.name && (
                      <span className="text-[9px] text-amber-600">Supplier: {r.suppliers.name}</span>
                    )}
                  </div>
                ),
              },
              {
                header: 'Current Stock',
                accessorKey: 'quantity',
                cell: (r: any) => (
                  <div className="font-black text-sm bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100">
                    {formatStock(r)}
                  </div>
                ),
              },
              {
                header: 'Actions',
                accessorKey: 'id',
                cell: (r: any) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedMaterial(r);
                        setActiveModal('ADJUST');
                      }}
                      className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white"
                      title="Adjust Stock"
                    >
                      <PackagePlus size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMaterial(r);
                        setFormData({
                          name: r.name,
                          unit_type: r.unit_type,
                          qty_per_unit: r.qty_per_unit || 1,
                          size: r.size || '',
                          default_supplier_id: r.default_supplier_id || '',
                          sku: r.sku || '',
                        });
                        setActiveModal('EDIT');
                      }}
                      className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => fetchItemHistory(r)}
                      className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-800 hover:text-white"
                      title="History"
                    >
                      <History size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteMaterial(r.id)}
                      className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* ADD / EDIT Modal */}
      {(activeModal === 'ADD' || activeModal === 'EDIT') && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div
              className={`p-6 ${activeModal === 'ADD' ? 'bg-amber-600' : 'bg-slate-800'} text-white flex justify-between items-center`}
            >
              <h2 className="font-black uppercase italic tracking-widest flex items-center gap-2">
                <Package size={20} /> {activeModal === 'ADD' ? 'New Raw Material' : 'Edit Raw Material'}
              </h2>
              <button onClick={closeAllModals} className="bg-white/20 p-2 rounded-full hover:bg-white/30">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Name</label>
                <input
                  placeholder="Ex: Empty Bottles 375ml, Sugar, Labels, Shrink Labels"
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none uppercase"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Unit Type</label>
                <select
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none"
                  value={formData.unit_type}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_type: e.target.value as any })
                  }
                >
                  <option value="BAGS">Bags (e.g. Empty Bottles)</option>
                  <option value="KG">Kg (e.g. Sugar)</option>
                  <option value="NOS">Nos (e.g. Labels)</option>
                  <option value="TUBES">Tubes (e.g. Shrink Labels)</option>
                </select>
              </div>

              {formData.unit_type === 'BAGS' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                      Qty per Bag (pcs)
                    </label>
                    <input
                      type="number"
                      placeholder="100"
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold"
                      value={formData.qty_per_unit}
                      onChange={(e) =>
                        setFormData({ ...formData, qty_per_unit: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                      Size (optional)
                    </label>
                    <input
                      placeholder="375ml, 625ml"
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                  Default Supplier
                </label>
                <select
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none"
                  value={formData.default_supplier_id}
                  onChange={(e) =>
                    setFormData({ ...formData, default_supplier_id: e.target.value })
                  }
                >
                  <option value="">-- Select Supplier (optional) --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-1">
                  Size එකට විශේෂිත supplier එක GRN වලදී දැම්මොත් එය ම භාවිතා වේ
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">SKU (optional)</label>
                <input
                  placeholder="EMPTY-375, SUGAR-50"
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold uppercase"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>

              <button
                onClick={activeModal === 'ADD' ? handleAddMaterial : handleUpdateMaterial}
                className={`w-full ${activeModal === 'ADD' ? 'bg-amber-600' : 'bg-slate-800'} p-5 text-white rounded-2xl font-black uppercase italic tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all`}
              >
                {activeModal === 'ADD' ? 'Create Raw Material' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {activeModal === 'HISTORY' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="font-black uppercase italic">Stock History</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  {selectedMaterial?.name} ({UNIT_LABELS[selectedMaterial?.unit_type]})
                </p>
              </div>
              <button onClick={closeAllModals} className="bg-white/20 p-2 rounded-full hover:bg-white/30">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[450px] overflow-y-auto">
              {historyData.length === 0 ? (
                <div className="text-center py-10 text-slate-300 font-bold uppercase italic text-sm">
                  No history records found
                </div>
              ) : (
                historyData.map((h, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center border-b border-slate-50 py-4 last:border-0"
                  >
                    <div>
                      <div className="font-black text-[10px] uppercase text-slate-700">
                        {h.type} {h.note && `- ${h.note}`}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold">
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div
                      className={`font-black text-sm italic ${h.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {h.quantity > 0 ? '+' : ''}
                      {h.quantity} {UNIT_LABELS[selectedMaterial?.unit_type] || ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {activeModal === 'ADJUST' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 bg-orange-500 text-white flex justify-between items-center">
              <h2 className="font-black uppercase italic">Adjust Stock</h2>
              <button onClick={closeAllModals} className="bg-white/20 p-2 rounded-full hover:bg-white/30">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm font-bold text-slate-600">
                {selectedMaterial?.name} - {UNIT_LABELS[selectedMaterial?.unit_type]}
              </p>
              <div className="p-1 bg-slate-100 rounded-2xl flex gap-1">
                <button
                  onClick={() => setAdjType('OUT')}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase ${adjType === 'OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
                >
                  Out
                </button>
                <button
                  onClick={() => setAdjType('IN')}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase ${adjType === 'IN' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}
                >
                  In
                </button>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block text-center">
                  Quantity ({UNIT_LABELS[selectedMaterial?.unit_type]})
                </label>
                <input
                  type="number"
                  className="w-full p-4 bg-slate-50 rounded-2xl text-center font-black text-xl border-none outline-none"
                  placeholder="0"
                  value={adjQty || ''}
                  onChange={(e) => setAdjQty(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Note</label>
                <textarea
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none text-xs"
                  rows={2}
                  placeholder="Reason..."
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveAdjustment}
                className="w-full bg-orange-500 text-white p-5 rounded-2xl font-black uppercase italic shadow-xl"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterialsPage;

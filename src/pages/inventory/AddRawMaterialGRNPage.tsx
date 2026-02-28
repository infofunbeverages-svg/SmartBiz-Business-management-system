import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompany } from '../../utils/useCompany';

const UNIT_LABELS: Record<string, string> = {
  BAGS: 'Bags',
  KG: 'Kg',
  NOS: 'Nos',
  TUBES: 'Tubes',
};

interface GRNItem {
  raw_material_id: string;
  quantity: number;
  unit_price: number;
}

const AddRawMaterialGRNPage = () => {
  const { company } = useCompany();
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [grnHistory, setGrnHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [grnData, setGrnData] = useState({
    grn_no: `RM-GRN-${Date.now().toString().slice(-6)}`,
    supplier_id: '',
    bill_no: '',
    grn_date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState<GRNItem[]>([
    { raw_material_id: '', quantity: 0, unit_price: 0 },
  ]);

  useEffect(() => {
    if (!company) return;
    setFetching(true);
    Promise.all([
      supabase.from('suppliers').select('*').eq('company_id', company.id).order('name'),
      supabase
        .from('raw_materials')
        .select('*, suppliers:default_supplier_id(name)')
        .eq('company_id', company.id)
        .order('name', { ascending: true }),
    ]).then(([suppRes, matRes]) => {
      setSuppliers(suppRes.data || []);
      setMaterials(matRes.data || []);
      fetchGRNHistory();
      setFetching(false);
    });
  }, [company]);

  const fetchGRNHistory = async () => {
    if (!company) return;
    const { data } = await supabase
      .from('raw_material_grn_master')
      .select('*, suppliers(name)')
      .eq('company_id', company.id)
      .order('grn_date', { ascending: false })
      .limit(20);
    setGrnHistory(data || []);
  };

  const getMaterial = (id: string) => materials.find((m) => m.id === id);

  const calculateTotal = () => {
    return items.reduce((sum, i) => {
      const qty = Number(i.quantity) || 0;
      const price = Number(i.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleSaveGRN = async () => {
    if (!grnData.supplier_id || items.some((i) => !i.raw_material_id)) {
      return alert('කරුණාකර සියලු විස්තර සම්පූර්ණ කරන්න!');
    }
    if (!company) return;

    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      const { data: master } = await supabase
        .from('raw_material_grn_master')
        .insert([
          {
            ...grnData,
            total_amount: totalAmount,
            company_id: company.id,
          },
        ])
        .select()
        .single();

      if (!master) throw new Error('Failed to create GRN');

      for (const item of items) {
        const mat = getMaterial(item.raw_material_id);
        if (!mat) continue;

        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;

        await supabase.from('raw_material_grn_items').insert([
          {
            grn_id: master.id,
            raw_material_id: item.raw_material_id,
            company_id: company.id,
            quantity: qty,
            unit_price: unitPrice,
            total_price: qty * unitPrice,
          },
        ]);

        await supabase.from('raw_material_movements').insert([
          {
            raw_material_id: item.raw_material_id,
            quantity: qty,
            type: 'GRN_IN',
            sub_type: 'PURCHASE',
            note: `GRN ${grnData.grn_no}`,
          },
        ]);

        const { data: matData } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('id', item.raw_material_id)
          .single();

        await supabase
          .from('raw_materials')
          .update({ quantity: (matData?.quantity || 0) + qty })
          .eq('id', item.raw_material_id);
      }

      alert('Raw Material GRN සාර්ථකව ඇතුළත් කරන ලදී!');
      setItems([{ raw_material_id: '', quantity: 0, unit_price: 0 }]);
      setGrnData({
        grn_no: `RM-GRN-${Date.now().toString().slice(-6)}`,
        supplier_id: grnData.supplier_id,
        bill_no: '',
        grn_date: new Date().toISOString().split('T')[0],
      });
      fetchGRNHistory();
    } catch (err) {
      alert('Error saving GRN: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!company) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase italic">
        Loading company...
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/inventory/raw-materials"
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black italic uppercase">
            New Raw Material <span className="text-amber-600">GRN</span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl shadow-sm border mb-6">
        <select
          className="w-full border p-3 rounded-xl font-bold"
          value={grnData.supplier_id}
          onChange={(e) => setGrnData({ ...grnData, supplier_id: e.target.value })}
        >
          <option value="">Select Supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Bill No"
          className="border p-3 rounded-xl font-bold"
          value={grnData.bill_no}
          onChange={(e) => setGrnData({ ...grnData, bill_no: e.target.value })}
        />
        <input
          type="date"
          className="border p-3 rounded-xl font-bold"
          value={grnData.grn_date}
          onChange={(e) => setGrnData({ ...grnData, grn_date: e.target.value })}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden mb-10">
        <table className="w-full">
          <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
            <tr>
              <th className="p-4 text-left">Raw Material</th>
              <th className="p-4">Unit</th>
              <th className="p-4">Qty</th>
              <th className="p-4">Unit Price</th>
              <th className="p-4 text-right">Subtotal</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const mat = getMaterial(item.raw_material_id);
              const unitLabel = mat ? UNIT_LABELS[mat.unit_type] || mat.unit_type : '-';
              return (
                <tr key={index} className="border-t border-gray-50">
                  <td className="p-2">
                    <select
                      className="w-full p-2 font-bold outline-none border rounded-lg"
                      value={item.raw_material_id}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index] = { ...newItems[index], raw_material_id: e.target.value };
                        setItems(newItems);
                      }}
                    >
                      <option value="">-- Select --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({UNIT_LABELS[m.unit_type]})
                          {m.size && ` - ${m.size}`}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 font-bold text-center">{unitLabel}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 p-2 bg-gray-50 rounded-lg text-center font-bold"
                      placeholder="0"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const n = [...items];
                        n[index].quantity = parseFloat(e.target.value) || 0;
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-2 bg-gray-50 rounded-lg text-right font-bold"
                      value={item.unit_price || ''}
                      onChange={(e) => {
                        const n = [...items];
                        n[index].unit_price = parseFloat(e.target.value) || 0;
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="p-2 text-right font-black text-amber-600">
                    {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          onClick={() =>
            setItems([...items, { raw_material_id: '', quantity: 0, unit_price: 0 }])
          }
          className="w-full p-3 text-[10px] font-black text-amber-600 uppercase"
        >
          + Add New Item
        </button>
      </div>

      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl mb-10">
        <h2 className="text-white font-black">
          TOTAL: <span className="text-amber-400">LKR {calculateTotal().toLocaleString()}</span>
        </h2>
        <button
          onClick={handleSaveGRN}
          className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
          Finalize GRN
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2 text-gray-700">
          Recent Raw Material GRNs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[9px]">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">GRN No</th>
                <th className="p-3">Supplier</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {grnHistory.map((grn) => (
                <tr key={grn.id} className="hover:bg-gray-50">
                  <td className="p-3 font-bold">{grn.grn_date}</td>
                  <td className="p-3 font-mono text-amber-600 font-bold">{grn.grn_no}</td>
                  <td className="p-3 font-bold uppercase">
                    {grn.suppliers?.name || 'N/A'}
                  </td>
                  <td className="p-3 text-right font-black">
                    LKR {grn.total_amount?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AddRawMaterialGRNPage;

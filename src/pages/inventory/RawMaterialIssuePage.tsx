import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { Save, Loader2, Plus, Trash2, ArrowLeft, Factory, PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const RawMaterialIssuePage = () => {
  const { company } = useCompany();

  const [materials, setMaterials]         = useState<any[]>([]);
  const [issueHistory, setIssueHistory]   = useState<any[]>([]);
  const [isSaving, setIsSaving]           = useState(false);

  const [issueData, setIssueData] = useState({
    issue_no:    `RM-ISS-${Date.now().toString().slice(-6)}`,
    issue_date:  new Date().toISOString().split('T')[0],
    issued_to:   '',   // production line / department
    notes:       '',
  });

  const [items, setItems] = useState([
    { raw_material_id: '', quantity: 0, unit_price: 0, total_value: 0 }
  ]);

  useEffect(() => {
    if (company?.id) { fetchData(); fetchHistory(); }
  }, [company?.id]);

  const fetchData = async () => {
    const { data } = await supabase
      .from('raw_materials')
      .select('*, suppliers:default_supplier_id(name)')
      .eq('company_id', company.id)
      .order('name');
    setMaterials(data || []);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('raw_material_issue_master')
      .select('*')
      .eq('company_id', company.id)
      .order('issue_date', { ascending: false })
      .limit(20);
    setIssueHistory(data || []);
  };

  const getMaterial = (id: string) => materials.find(m => m.id === id);

  // When material selected → auto-fetch last GRN price
  const handleMaterialChange = async (index: number, matId: string) => {
    const newItems = [...items];
    newItems[index].raw_material_id = matId;
    newItems[index].unit_price = 0;

    if (matId) {
      // Get last GRN price for this material
      const { data } = await supabase
        .from('raw_material_grn_items')
        .select('unit_price')
        .eq('raw_material_id', matId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data?.unit_price) {
        newItems[index].unit_price = Number(data.unit_price);
      }
    }
    newItems[index].total_value = newItems[index].quantity * newItems[index].unit_price;
    setItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].total_value = Number(newItems[index].quantity || 0) * Number(newItems[index].unit_price || 0);
    setItems(newItems);
  };

  const totalValue = items.reduce((acc, i) => acc + Number(i.total_value || 0), 0);

  const handleSave = async () => {
    if (!issueData.issued_to) { alert('Please enter issued to (production line/department)!'); return; }
    if (items.some(i => !i.raw_material_id || !i.quantity)) { alert('Please fill all item details!'); return; }

    setIsSaving(true);
    try {
      // 1. Insert master
      const { data: master, error: masterErr } = await supabase
        .from('raw_material_issue_master')
        .insert([{
          company_id:   company.id,
          issue_no:     issueData.issue_no,
          issue_date:   issueData.issue_date,
          issued_to:    issueData.issued_to,
          notes:        issueData.notes,
          total_value:  totalValue,
        }])
        .select()
        .single();
      if (masterErr) throw new Error('Issue header: ' + masterErr.message);

      // 2. Insert items + deduct stock
      for (const item of items) {
        if (!item.raw_material_id) continue;
        const qty = Number(item.quantity) || 0;

        // Insert issue item
        const { error: itemErr } = await supabase
          .from('raw_material_issue_items')
          .insert([{
            issue_id:        master.id,
            company_id:      company.id,
            raw_material_id: item.raw_material_id,
            quantity:        qty,
            unit_price:      Number(item.unit_price) || 0,
            total_value:     Number(item.total_value) || 0,
          }]);
        if (itemErr) throw new Error('Issue items: ' + itemErr.message);

        // Log movement
        await supabase.from('raw_material_movements').insert([{
          raw_material_id: item.raw_material_id,
          company_id:      company.id,
          quantity:        -qty,
          type:            'ISSUE_OUT',
          sub_type:        'PRODUCTION',
          note:            `Issue ${issueData.issue_no} → ${issueData.issued_to}`,
        }]);

        // Deduct from raw_materials stock
        const { data: matData } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('id', item.raw_material_id)
          .single();
        await supabase
          .from('raw_materials')
          .update({ quantity: Math.max(0, (matData?.quantity || 0) - qty) })
          .eq('id', item.raw_material_id);
      }

      alert(`✅ Issue ${issueData.issue_no} saved! Stock deducted.`);
      setItems([{ raw_material_id: '', quantity: 0, unit_price: 0, total_value: 0 }]);
      setIssueData({
        issue_no:   `RM-ISS-${Date.now().toString().slice(-6)}`,
        issued_to:  issueData.issued_to,
        issue_date: new Date().toISOString().split('T')[0],
        notes:      '',
      });
      fetchHistory();
      fetchData();
    } catch (err: any) {
      alert('Error saving Issue: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const UNIT_LABELS: Record<string, string> = { BAGS: 'Bags', KG: 'Kg', NOS: 'Nos', TUBES: 'Tubes' };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/inventory/raw-materials" className="p-2 bg-white rounded-xl border hover:bg-gray-50">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
              <Factory size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">RAW MATERIAL ISSUE</h1>
              <p className="text-xs text-gray-500 font-bold">Warehouse → Production</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow border p-6 mb-6">

          {/* Issue Meta */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Issue No</label>
              <input
                className="w-full p-3 bg-gray-100 rounded-xl font-bold text-sm outline-none"
                value={issueData.issue_no}
                readOnly
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Issue Date</label>
              <input
                type="date"
                className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-400"
                value={issueData.issue_date}
                onChange={e => setIssueData({ ...issueData, issue_date: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Issued To (Production Line / Department) *</label>
              <input
                className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                placeholder="e.g. Filling Line 1, Labelling, Packing..."
                value={issueData.issued_to}
                onChange={e => setIssueData({ ...issueData, issued_to: e.target.value })}
              />
            </div>
            <div className="col-span-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Notes</label>
              <input
                className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-orange-400"
                placeholder="Optional notes..."
                value={issueData.notes}
                onChange={e => setIssueData({ ...issueData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Materials to Issue</div>
          <table className="w-full mb-4">
            <thead>
              <tr className="bg-gray-900 text-white text-[10px] uppercase">
                <th className="p-3 text-left">Raw Material</th>
                <th className="p-3 text-center w-24">Stock</th>
                <th className="p-3 text-center w-28">Qty to Issue</th>
                <th className="p-3 text-right w-36">Unit Value (LKR) ✏️</th>
                <th className="p-3 text-right w-36">Total Value</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const mat = getMaterial(item.raw_material_id);
                const unitLabel = mat ? (UNIT_LABELS[mat.unit_type] || mat.unit_type) : '';
                const stockLow = mat && item.quantity > mat.quantity;
                return (
                  <tr key={i} className="border-b">
                    {/* Material dropdown */}
                    <td className="p-2">
                      <select
                        className="w-full p-2 bg-gray-50 rounded-lg font-bold text-sm outline-none border border-transparent focus:border-orange-400"
                        value={item.raw_material_id}
                        onChange={e => handleMaterialChange(i, e.target.value)}
                      >
                        <option value="">-- Select Material --</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({UNIT_LABELS[m.unit_type] || m.unit_type}) — Stock: {m.quantity}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Current Stock */}
                    <td className="p-2 text-center">
                      <span className={`text-xs font-black px-2 py-1 rounded-full ${stockLow ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        {mat ? mat.quantity : '—'} {unitLabel}
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0" step="0.01"
                          className={`w-full p-2 text-center font-black rounded-lg outline-none border ${stockLow ? 'bg-red-50 border-red-300 text-red-700' : 'bg-orange-50 border-orange-200 focus:border-orange-400'}`}
                          value={item.quantity || ''}
                          onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                        {unitLabel && <span className="text-[9px] font-black text-gray-400 whitespace-nowrap">{unitLabel}</span>}
                      </div>
                      {stockLow && <p className="text-[9px] text-red-500 font-bold mt-0.5">⚠ Exceeds stock!</p>}
                    </td>

                    {/* Unit Price - editable, auto-filled from last GRN */}
                    <td className="p-2">
                      <input
                        type="number" min="0" step="0.01"
                        className="w-full p-2 text-right font-black rounded-lg outline-none border bg-blue-50 border-blue-200 text-blue-800 focus:border-blue-500"
                        value={item.unit_price || ''}
                        onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                      {item.unit_price > 0 && <p className="text-[9px] text-blue-400 font-bold mt-0.5 text-right">From last GRN ↑</p>}
                    </td>

                    {/* Total Value */}
                    <td className="p-2 text-right font-black text-orange-600">
                      {Number(item.total_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Remove */}
                    <td className="p-2">
                      <button onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                        <Trash2 size={15} className="text-red-300 hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setItems([...items, { raw_material_id: '', quantity: 0, unit_price: 0, total_value: 0 }])}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-black uppercase"
            >
              <Plus size={14} /> Add Item
            </button>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Total Issue Value</p>
                <p className="text-2xl font-black text-orange-600">LKR {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-sm uppercase"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Issue & Deduct Stock
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl shadow border p-6">
          <h3 className="font-black mb-4 flex items-center gap-2 text-sm uppercase">
            <PackageOpen size={16} /> Recent Issues
          </h3>
          {issueHistory.length === 0 ? (
            <p className="text-gray-400 text-sm">No issues yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-[10px] uppercase border-b">
                  <th className="p-2 text-left">Issue No</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Issued To</th>
                  <th className="p-2 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {issueHistory.map(iss => (
                  <tr key={iss.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-bold text-orange-600">{iss.issue_no}</td>
                    <td className="p-2 font-bold">{iss.issue_date}</td>
                    <td className="p-2 font-bold uppercase">{iss.issued_to}</td>
                    <td className="p-2 text-right font-bold">LKR {iss.total_value?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};

export default RawMaterialIssuePage;

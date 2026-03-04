import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Filter, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompany } from '../../utils/useCompany';

interface GRNItem {
  id?: string;
  product_id: string;
  qty_cases: number;
  qty_bottles: number;
  unit_price: number;
  bpc: number;
}

const AddGRNPage = () => {
  const { company } = useCompany();
  const [products, setProducts]   = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [grnHistory, setGrnHistory] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(true);
  const [editId, setEditId]       = useState<string | null>(null);

  const [filterSupplier, setFilterSupplier] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  const [grnData, setGrnData] = useState({
    grn_no:      `GRN-${Date.now().toString().slice(-6)}`,
    supplier_id: '',
    bill_no:     '',
    grn_date:    new Date().toISOString().split('T')[0]
  });

  const [items, setItems] = useState<GRNItem[]>([{
    product_id: '', qty_cases: 0, qty_bottles: 0, unit_price: 0, bpc: 12
  }]);

  useEffect(() => { fetchInitialData(); }, [company]);

  const fetchInitialData = async () => {
    if (!company) return;
    setFetching(true);
    try {
      const [suppRes, prodRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('company_id', company.id).order('name'),
        supabase.from('inventory').select('*').eq('company_id', company.id).order('name', { ascending: true })
      ]);
      setSuppliers(suppRes.data || []);
      setProducts(prodRes.data || []);
      fetchGRNHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const fetchGRNHistory = async () => {
    let query = supabase
      .from('grn_master')
      .select(`*, suppliers(name)`)
      .eq('company_id', company?.id)
      .order('grn_date', { ascending: false });
    if (filterSupplier) query = query.eq('supplier_id', filterSupplier);
    if (startDate) query = query.gte('grn_date', startDate);
    if (endDate)   query = query.lte('grn_date', endDate);
    const { data } = await query;
    setGrnHistory(data || []);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = document.querySelectorAll<HTMLElement>('table input, .grid input, select');
      const currentIndex = Array.from(inputs).indexOf(e.target as HTMLElement);
      if (field === 'pr') {
        const newItem: GRNItem = { product_id: '', qty_cases: 0, qty_bottles: 0, unit_price: 0, bpc: 12 };
        setItems(prev => [...prev, newItem]);
        setTimeout(() => {
          const updatedInputs = document.querySelectorAll<HTMLElement>('table input, .grid input, select');
          updatedInputs[currentIndex + 1]?.focus();
        }, 50);
      } else if (currentIndex > -1 && currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
      }
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, i) => {
      const bpcValue = Number(i.bpc) || 12;
      const totalInBottles = (Number(i.qty_cases) * bpcValue) + Number(i.qty_bottles);
      return sum + ((totalInBottles / bpcValue) * Number(i.unit_price));
    }, 0);
  };

  const handleEdit = async (grn: any) => {
    setEditId(grn.id);
    setGrnData({
      grn_no:      grn.grn_no,
      supplier_id: grn.supplier_id,
      bill_no:     grn.bill_no,
      grn_date:    grn.grn_date
    });

    const { data: grnItems } = await supabase.from('grn_items').select('*').eq('grn_id', grn.id);
    if (grnItems) {
      const formattedItems = grnItems.map(item => {
        const prod = products.find(p => p.id === item.product_id);
        const bpc  = prod?.bottles_per_case || 12;
        return {
          id:          item.id,
          product_id:  item.product_id,
          qty_cases:   Math.floor(item.quantity / bpc),
          qty_bottles: item.quantity % bpc,
          unit_price:  item.unit_price,
          bpc:         bpc
        };
      });
      setItems(formattedItems);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── SAVE via RPC (properly reverses old stock on edit) ───────────────────
  const handleSaveGRN = async () => {
    if (!grnData.supplier_id || items.some(i => !i.product_id)) {
      return alert("කරුණාකර සියලු විස්තර සම්පූර්ණ කරන්න!");
    }
    setLoading(true);
    try {
      // Prepare items for RPC
      const rpcItems = items.map(item => {
        const bpcValue     = Number(item.bpc) || 12;
        const totalBottles = (Number(item.qty_cases) * bpcValue) + Number(item.qty_bottles);
        const totalPrice   = (totalBottles / bpcValue) * Number(item.unit_price);
        return {
          product_id:  item.product_id,
          quantity:    totalBottles,
          unit_price:  Number(item.unit_price),
          total_price: totalPrice
        };
      });

      const { error } = await supabase.rpc('save_grn_and_update_stock', {
        p_company_id:  company?.id,
        p_supplier_id: grnData.supplier_id,
        p_grn_no:      grnData.grn_no,
        p_bill_no:     grnData.bill_no,
        p_grn_date:    grnData.grn_date,
        p_items:       rpcItems,
        p_grn_id:      editId || null
      });

      if (error) throw error;

      alert(editId ? "✅ GRN එක යාවත්කාලීන කරන ලදී!" : "✅ GRN එක සාර්ථකව ඇතුළත් කරන ලදී!");
      setEditId(null);
      setGrnData({
        grn_no:      `GRN-${Date.now().toString().slice(-6)}`,
        supplier_id: '',
        bill_no:     '',
        grn_date:    new Date().toISOString().split('T')[0]
      });
      setItems([{ product_id: '', qty_cases: 0, qty_bottles: 0, unit_price: 0, bpc: 12 }]);
      fetchGRNHistory();
      fetchInitialData(); // refresh stock quantities
    } catch (err: any) {
      console.error(err);
      alert("Error saving GRN: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-center font-bold text-gray-400">Loading...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black italic uppercase">
          {editId ? 'Edit' : 'New'} GRN <span className="text-blue-600">Entry</span>
        </h1>
        {editId && (
          <button
            onClick={() => { setEditId(null); setItems([{ product_id: '', qty_cases: 0, qty_bottles: 0, unit_price: 0, bpc: 12 }]); }}
            className="text-red-500 font-bold text-xs uppercase"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl shadow-sm border mb-6">
        <select
          className="w-full border p-3 rounded-xl font-bold"
          value={grnData.supplier_id}
          onChange={e => setGrnData({ ...grnData, supplier_id: e.target.value })}
        >
          <option value="">Select Supplier</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          type="text" placeholder="Bill No"
          className="border p-3 rounded-xl font-bold"
          value={grnData.bill_no}
          onChange={e => setGrnData({ ...grnData, bill_no: e.target.value })}
        />
        <input
          type="date"
          className="border p-3 rounded-xl font-bold"
          value={grnData.grn_date}
          onChange={e => setGrnData({ ...grnData, grn_date: e.target.value })}
        />
      </div>

      {/* Items */}
      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden mb-10">
        <table className="w-full">
          <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
            <tr>
              <th className="p-4 text-left">Product</th>
              <th className="p-4">Cases</th>
              <th className="p-4">Bottles</th>
              <th className="p-4">BPC</th>
              <th className="p-4">Price/Case</th>
              <th className="p-4 text-right">Subtotal</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-t border-gray-50">
                <td className="p-2">
                  <input
                    list={`product-list-${index}`}
                    placeholder="Type product name..."
                    className="w-full p-2 font-bold outline-none border rounded-lg"
                    value={products.find(p => p.id === item.product_id)?.name || ''}
                    onChange={e => {
                      const p = products.find(x => x.name === e.target.value);
                      if (p) {
                        const newItems = [...items];
                        newItems[index] = { ...newItems[index], product_id: p.id, bpc: p.bottles_per_case || 12, unit_price: p.price || 0 };
                        setItems(newItems);
                      }
                    }}
                    onKeyDown={e => handleKeyDown(e, index, 'prod')}
                  />
                  <datalist id={`product-list-${index}`}>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name} (BPC: {p.bottles_per_case})</option>)}
                  </datalist>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="w-20 p-2 bg-gray-50 rounded-lg text-center font-bold"
                    value={item.qty_cases}
                    onChange={e => { const n = [...items]; n[index].qty_cases = parseInt(e.target.value) || 0; setItems(n); }}
                    onKeyDown={e => handleKeyDown(e, index, 'cs')}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="w-20 p-2 bg-blue-50 rounded-lg text-center font-bold"
                    value={item.qty_bottles}
                    onChange={e => { const n = [...items]; n[index].qty_bottles = parseInt(e.target.value) || 0; setItems(n); }}
                    onKeyDown={e => handleKeyDown(e, index, 'bt')}
                  />
                </td>
                <td className="p-2 text-center font-bold text-gray-500 text-sm">{item.bpc}</td>
                <td className="p-2">
                  <input
                    type="number"
                    className="w-full p-2 bg-gray-50 rounded-lg text-right font-bold"
                    value={item.unit_price}
                    onChange={e => { const n = [...items]; n[index].unit_price = parseFloat(e.target.value) || 0; setItems(n); }}
                    onKeyDown={e => handleKeyDown(e, index, 'pr')}
                  />
                </td>
                <td className="p-2 text-right font-black text-blue-600">
                  {(((item.qty_cases * item.bpc) + item.qty_bottles) / item.bpc * item.unit_price).toLocaleString()}
                </td>
                <td className="p-2">
                  <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-gray-300 hover:text-red-500">
                    <Trash2 size={16}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => setItems([...items, { product_id: '', qty_cases: 0, qty_bottles: 0, unit_price: 0, bpc: 12 }])}
          className="w-full p-3 text-[10px] font-black text-blue-500 uppercase"
        >
          + Add New Item Manually
        </button>
      </div>

      {/* Save Bar */}
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl mb-10">
        <h2 className="text-white font-black">
          TOTAL: <span className="text-blue-400">LKR {calculateTotal().toLocaleString()}</span>
        </h2>
        <button
          onClick={handleSaveGRN}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
          {editId ? 'Update GRN' : 'Finalize GRN'}
        </button>
      </div>

      {/* History */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2 text-gray-700">
          <Filter size={20}/> GRN History & Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <select className="border p-2 rounded-xl text-sm font-bold" value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" className="border p-2 rounded-xl text-sm font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="border p-2 rounded-xl text-sm font-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button onClick={fetchGRNHistory} className="bg-gray-800 text-white rounded-xl font-bold text-xs uppercase">Apply Filters</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[9px]">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">GRN No</th>
                <th className="p-3">Supplier</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {grnHistory.map(grn => (
                <tr key={grn.id} className="hover:bg-gray-50">
                  <td className="p-3 font-bold">{grn.grn_date}</td>
                  <td className="p-3 font-mono text-blue-600 font-bold">{grn.grn_no}</td>
                  <td className="p-3 font-bold uppercase">{grn.suppliers?.name || 'N/A'}</td>
                  <td className="p-3 text-right font-black">LKR {grn.total_amount?.toLocaleString()}</td>
                  <td className="p-3 flex justify-center">
                    <button onClick={() => handleEdit(grn)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit size={16}/>
                    </button>
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

export default AddGRNPage;

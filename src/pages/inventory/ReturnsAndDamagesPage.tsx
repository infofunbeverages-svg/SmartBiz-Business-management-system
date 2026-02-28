import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { RotateCcw, Gift, AlertTriangle, Package, Loader2, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompany } from '../../utils/useCompany';

type EntryMode = 'MARKET_RETURN' | 'DAMAGE_RETURN' | 'SAMPLE' | 'PACK_DAMAGE';

const DAMAGE_SUB_TYPES = [
  { id: 'DAMAGE', label: 'Damage' },
  { id: 'BLAST', label: 'Blast' },
  { id: 'LABEL_DAMAGED', label: 'Label Damaged' },
  { id: 'OTHER', label: 'Other' },
];

interface ReturnItem {
  inventory_id: string;
  cases: number;
  qty_bottles: number;
  unit_price: number;
}

const ReturnsAndDamagesPage = () => {
  const { company } = useCompany();
  const [mode, setMode] = useState<EntryMode>('MARKET_RETURN');
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [damageSubType, setDamageSubType] = useState('DAMAGE');
  const [creditToLedger, setCreditToLedger] = useState(false);
  const [note, setNote] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);

  const [items, setItems] = useState<ReturnItem[]>([
    { inventory_id: '', cases: 0, qty_bottles: 0, unit_price: 0 },
  ]);

  useEffect(() => {
    if (!company) return;
    Promise.all([
      supabase.from('customers').select('id, full_name, name').eq('company_id', company.id).order('full_name'),
      supabase.from('inventory').select('*').eq('company_id', company.id).order('name'),
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data || []);
      setProducts(pRes.data || []);
    });
  }, [company]);

  const addItem = () => setItems([...items, { inventory_id: '', cases: 0, qty_bottles: 0, unit_price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ReturnItem, val: any) => {
    const n = [...items];
    (n[i] as any)[field] = val;
    if (field === 'inventory_id') {
      const prod = products.find(p => p.id === val);
      n[i].unit_price = prod?.price || 0;
    }
    setItems(n);
  };

  const getTotalCreditValue = () => {
    return items.reduce((sum, it) => {
      const prod = products.find(p => p.id === it.inventory_id);
      const bpc = prod?.bottles_per_case || 12;
      const qty = (it.cases || 0) * bpc + (it.qty_bottles || 0);
      return sum + qty * (it.unit_price || 0) / bpc;
    }, 0);
  };

  const handleSave = async () => {
    const validItems = items.filter(i => i.inventory_id && ((i.cases || 0) + (i.qty_bottles || 0)) > 0);
    if (validItems.length === 0) return alert('Add at least one product with quantity!');
    if ((mode === 'MARKET_RETURN' || mode === 'DAMAGE_RETURN' || mode === 'SAMPLE') && !customerId) {
      return alert('Select customer!');
    }
    if (!company) return;

    setLoading(true);
    const returnRef = `${mode === 'MARKET_RETURN' ? 'MR' : mode === 'DAMAGE_RETURN' ? 'DR' : mode === 'SAMPLE' ? 'SMP' : 'PD'}-${Date.now().toString().slice(-6)}`;
    const subType = mode === 'MARKET_RETURN' ? 'EXPIRY' : mode === 'DAMAGE_RETURN' ? damageSubType : mode === 'SAMPLE' ? 'SAMPLE' : damageSubType;

    try {
      for (const it of validItems) {
        const prod = products.find(p => p.id === it.inventory_id);
        if (!prod) continue;
        const bpc = prod.bottles_per_case || 12;
        const qtyBottles = (it.cases || 0) * bpc + (it.qty_bottles || 0);
        const isStockIn = mode === 'MARKET_RETURN' || mode === 'DAMAGE_RETURN';
        const finalQty = isStockIn ? qtyBottles : -qtyBottles;

        const movementPayload: any = {
          inventory_id: it.inventory_id,
          quantity: finalQty,
          type: mode,
          sub_type: subType,
          note: `${returnRef} ${note ? '| ' + note : ''}`,
          return_ref: returnRef,
          company_id: company.id,
        };
        if (mode !== 'PACK_DAMAGE') movementPayload.customer_id = customerId;

        const { error: mErr } = await supabase.from('stock_movements').insert([movementPayload]);
        if (mErr) throw mErr;

        const { data: curr } = await supabase.from('inventory').select('quantity').eq('id', it.inventory_id).single();
        await supabase.from('inventory').update({ quantity: (curr?.quantity || 0) + finalQty }).eq('id', it.inventory_id);
      }

      if ((mode === 'MARKET_RETURN' || mode === 'DAMAGE_RETURN') && creditToLedger && customerId) {
        const creditValue = Math.round(getTotalCreditValue());
        if (creditValue > 0) {
          await supabase.from('customer_ledger').insert([{
            customer_id: customerId,
            date: returnDate,
            type: 'Return Credit',
            reference: returnRef,
            description: `${mode === 'MARKET_RETURN' ? 'Market Return (Expiry)' : 'Damage Return'} ${returnRef} | LKR ${creditValue.toLocaleString()}`,
            debit: 0,
            credit: creditValue,
            status: 'Cleared',
          }]);
        }
      }

      alert('සාර්ථකයි!');
      setItems([{ inventory_id: '', cases: 0, qty_bottles: 0, unit_price: 0 }]);
      setNote('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!company) return <div className="p-8 text-center font-bold text-slate-500">Loading...</div>;

  const tabs = [
    { id: 'MARKET_RETURN' as EntryMode, label: 'Market Return (Expiry)', icon: <RotateCcw size={18} /> },
    { id: 'DAMAGE_RETURN' as EntryMode, label: 'Damage Return', icon: <AlertTriangle size={18} /> },
    { id: 'SAMPLE' as EntryMode, label: 'Samples (Bonna)', icon: <Gift size={18} /> },
    { id: 'PACK_DAMAGE' as EntryMode, label: 'Pack Damage (Warehouse)', icon: <Package size={18} /> },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/inventory/reports" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black uppercase italic text-slate-800">Returns & Damages</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Market Returns, Damage Returns, Samples, Pack Damages</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-8 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setMode(t.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${mode === t.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-white">
        {(mode === 'MARKET_RETURN' || mode === 'DAMAGE_RETURN' || mode === 'SAMPLE') && (
          <div className="mb-6">
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Customer</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">-- Select Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name || c.name}</option>)}
            </select>
          </div>
        )}

        {mode === 'DAMAGE_RETURN' && (
          <div className="mb-6">
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Damage Type</label>
            <div className="flex gap-2 flex-wrap">
              {DAMAGE_SUB_TYPES.map(d => (
                <button key={d.id} onClick={() => setDamageSubType(d.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${damageSubType === d.id ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'PACK_DAMAGE' && (
          <div className="mb-6">
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Damage Type</label>
            <div className="flex gap-2 flex-wrap">
              {DAMAGE_SUB_TYPES.map(d => (
                <button key={d.id} onClick={() => setDamageSubType(d.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${damageSubType === d.id ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(mode === 'MARKET_RETURN' || mode === 'DAMAGE_RETURN') && (
          <label className="flex items-center gap-3 mb-6 p-4 bg-blue-50 rounded-2xl cursor-pointer">
            <input type="checkbox" checked={creditToLedger} onChange={e => setCreditToLedger(e.target.checked)} className="rounded" />
            <span className="text-sm font-bold text-blue-800">Ledger එකට Credit කරන්න (Outstanding එක අඩු කරන්න)</span>
          </label>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Products</label>
            <button onClick={addItem} className="text-blue-600 text-[10px] font-black uppercase">+ Add Item</button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 px-3 text-[9px] font-black uppercase text-slate-500">
              <div className="col-span-4">Product</div>
              <div className="col-span-2 text-center">Cases</div>
              <div className="col-span-2 text-center">Bottles</div>
              <div className="col-span-2 text-right">Price/Case <span className="text-blue-600 font-normal">(edit කරන්න පුළුවන්)</span></div>
              <div className="col-span-2"></div>
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-xl">
                <div className="col-span-4">
                  <select className="w-full p-2 bg-white rounded-lg font-bold text-sm" value={it.inventory_id} onChange={e => updateItem(i, 'inventory_id', e.target.value)}>
                    <option value="">Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><input type="number" placeholder="Cs" className="w-full p-2 bg-white rounded-lg text-center font-bold" value={it.cases || ''} onChange={e => updateItem(i, 'cases', parseInt(e.target.value) || 0)} /></div>
                <div className="col-span-2"><input type="number" placeholder="Bt" className="w-full p-2 bg-white rounded-lg text-center font-bold" value={it.qty_bottles || ''} onChange={e => updateItem(i, 'qty_bottles', parseInt(e.target.value) || 0)} /></div>
                <div className="col-span-2"><input type="number" placeholder="0" title="Customer to customer වෙනස් වෙනවා - edit කරන්න පුළුවන්" className="w-full p-2 bg-blue-50 border border-blue-200 rounded-lg text-right font-bold" value={it.unit_price || ''} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} /></div>
                <div className="col-span-2 flex justify-end"><button onClick={() => removeItem(i)} className="text-red-500 text-xs font-black">Remove</button></div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Date</label>
          <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
        </div>
        <div className="mb-8">
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Note (optional)</label>
          <input type="text" placeholder="Remarks..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {creditToLedger && (mode === 'MARKET_RETURN' || mode === 'DAMAGE_RETURN') && (
          <p className="text-sm font-bold text-blue-600 mb-4">Credit Value: LKR {getTotalCreditValue().toLocaleString()} (Ledger එකට යයි)</p>
        )}

        <button onClick={handleSave} disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase italic shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : null} Save {mode === 'MARKET_RETURN' ? 'Market Return' : mode === 'DAMAGE_RETURN' ? 'Damage Return' : mode === 'SAMPLE' ? 'Sample' : 'Pack Damage'}
        </button>
      </div>
    </div>
  );
};

export default ReturnsAndDamagesPage;

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { ClipboardList, Save, Loader2, CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import { logActivity } from '../../utils/activityLogger';

interface CountItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  system_qty: number;
  physical_cases: string;
  physical_bottles: string;
  bottles_per_case: number;
}

const StockCountPage = () => {
  const { company } = useCompany();
  const [items, setItems]         = useState<CountItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [countNote, setCountNote] = useState('');
  const [filter, setFilter]       = useState<'ALL' | 'DIFF'>('ALL');

  const fetchInventory = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('inventory')
      .select('id, name, quantity, bottles_per_case')
      .eq('company_id', company.id)
      .order('name', { ascending: true });
    setItems((data || []).map(p => ({
      id: p.id, name: p.name, sku: '', category: '',
      system_qty: Number(p.quantity || 0), physical_cases: '', physical_bottles: '',
      bottles_per_case: p.bottles_per_case || 12,
    })));
    setLoading(false);
  };

  useEffect(() => { if (company?.id) fetchInventory(); }, [company?.id]);

  const updatePhysical = (id: string, field: 'physical_cases' | 'physical_bottles', val: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  };

  const getPhysicalQty = (item: CountItem) => {
    if (item.physical_cases === '' && item.physical_bottles === '') return null;
    const cs = Number(item.physical_cases || 0);
    const bt = Number(item.physical_bottles || 0);
    return cs * item.bottles_per_case + bt;
  };

  const getDiff = (item: CountItem) => {
    const phys = getPhysicalQty(item);
    if (phys === null) return null;
    return phys - item.system_qty;
  };

  const isEntered = (item: CountItem) => item.physical_cases !== '' || item.physical_bottles !== '';
  const filledItems = items.filter(i => isEntered(i));
  const diffItems   = filledItems.filter(i => getDiff(i) !== 0);
  const displayItems = filter === 'DIFF' ? items.filter(i => isEntered(i) && getDiff(i) !== 0) : items;

  const handleSave = async () => {
    if (filledItems.length === 0) return alert('අවම වශයෙන් item එකක් count කරන්න!');
    if (!window.confirm(filledItems.length + ' items stock count save කරන්නද?')) return;
    setSaving(true);
    try {
      for (const item of filledItems) {
        const diff = getDiff(item);
        if (diff === null) continue;
        const physicalQty = getPhysicalQty(item);
        if (physicalQty === null) continue;
        await supabase.from('inventory').update({ quantity: physicalQty }).eq('id', item.id);
        if (diff !== 0) {
          await supabase.from('stock_movements').insert([{
            product_id: item.id,
            quantity:   diff,
            type:       diff > 0 ? 'RESTORE' : 'DAMAGE',
            sub_type:   'STOCK_COUNT',
            note:       'Stock Count ' + countDate + (countNote ? ' - ' + countNote : '') + ' | System: ' + item.system_qty + ' | Physical: ' + physicalQty + ' | Diff: ' + (diff > 0 ? '+' : '') + diff + ' | ' + Math.floor(physicalQty/item.bottles_per_case) + 'cs ' + (physicalQty%item.bottles_per_case) + 'bt',
          }]);
        }
      }
      await logActivity({
        company_id: company?.id || '', module: 'INVENTORY', action: 'STOCK_COUNT',
        details: { date: countDate, items_counted: filledItems.length, items_adjusted: diffItems.length },
      });
      alert('Stock count saved! ' + filledItems.length + ' counted, ' + diffItems.length + ' adjusted.');
      fetchInventory();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter flex items-center gap-2">
            <ClipboardList size={24} className="text-blue-600" />
            Stock <span className="text-blue-600">Count</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Physical count → System auto-adjust</p>
        </div>
        <button onClick={fetchInventory} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-xs font-black hover:bg-gray-50">
          <RefreshCcw size={14} /> Reload
        </button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Count Date</label>
          <input type="date" className="p-2.5 bg-slate-50 rounded-xl font-bold text-sm outline-none"
            value={countDate} onChange={e => setCountDate(e.target.value)} />
        </div>
        <div className="flex-1 min-w-48">
          <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Note (Optional)</label>
          <input type="text" placeholder="e.g. Month-end count..."
            className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-sm outline-none"
            value={countNote} onChange={e => setCountNote(e.target.value)} />
        </div>
        <div className="flex gap-3 ml-auto">
          <div className="bg-blue-50 rounded-xl px-4 py-2 text-center">
            <p className="text-[10px] font-black text-blue-400 uppercase">Counted</p>
            <p className="text-xl font-black text-blue-600">{filledItems.length}</p>
          </div>
          <div className={`rounded-xl px-4 py-2 text-center ${diffItems.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className={`text-[10px] font-black uppercase ${diffItems.length > 0 ? 'text-red-400' : 'text-green-400'}`}>Differences</p>
            <p className={`text-xl font-black ${diffItems.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{diffItems.length}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${filter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-white border text-gray-500'}`}>
          All Items ({items.length})
        </button>
        <button onClick={() => setFilter('DIFF')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${filter === 'DIFF' ? 'bg-red-600 text-white' : 'bg-white border text-gray-500'}`}>
          Differences Only ({diffItems.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white text-[10px] uppercase">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-center w-32">System Count</th>
                <th className="p-3 text-center w-40">Physical Count</th>
                <th className="p-3 text-center w-28">Difference</th>
                <th className="p-3 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayItems.map(item => {
                const diff = getDiff(item);
                const entered = isEntered(item);
                return (
                  <tr key={item.id} className={`transition-colors ${
                    !entered ? 'hover:bg-slate-50' :
                    diff === 0 ? 'bg-green-50/40' :
                    (diff ?? 0) > 0 ? 'bg-blue-50/40' : 'bg-red-50/40'}`}>
                    <td className="p-3">
                      <div className="font-black text-gray-800 text-xs uppercase">{item.name}</div>
                      {item.sku && <div className="text-[10px] text-gray-400">{item.sku}</div>}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-center">
                          <div className="text-[9px] text-gray-400 font-black">CS</div>
                          <span className="font-black text-gray-700 text-sm">{Math.floor(item.system_qty / item.bottles_per_case)}</span>
                        </div>
                        <div className="text-gray-300 text-xs">+</div>
                        <div className="text-center">
                          <div className="text-[9px] text-gray-400 font-black">BT</div>
                          <span className="font-black text-gray-700 text-sm">{item.system_qty % item.bottles_per_case}</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 text-center mt-0.5">= {item.system_qty} btl</div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 items-center">
                        <div className="flex-1">
                          <div className="text-[9px] text-gray-400 font-black text-center mb-0.5">CS</div>
                          <input type="number" min="0" step="1" placeholder="0"
                            className={`w-full p-2 text-center font-black rounded-xl outline-none border text-sm ${
                              !entered ? 'bg-gray-50 border-gray-200 focus:border-blue-400' :
                              diff === 0 ? 'bg-green-50 border-green-300 text-green-700' :
                              (diff ?? 0) > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' :
                              'bg-red-50 border-red-300 text-red-700'}`}
                            value={item.physical_cases}
                            onChange={e => updatePhysical(item.id, 'physical_cases', e.target.value)} />
                        </div>
                        <div className="text-gray-300 font-black text-xs mt-3">+</div>
                        <div className="flex-1">
                          <div className="text-[9px] text-gray-400 font-black text-center mb-0.5">BT</div>
                          <input type="number" min="0" step="1" placeholder="0"
                            className={`w-full p-2 text-center font-black rounded-xl outline-none border text-sm ${
                              !entered ? 'bg-gray-50 border-gray-200 focus:border-blue-400' :
                              diff === 0 ? 'bg-green-50 border-green-300 text-green-700' :
                              (diff ?? 0) > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' :
                              'bg-red-50 border-red-300 text-red-700'}`}
                            value={item.physical_bottles}
                            onChange={e => updatePhysical(item.id, 'physical_bottles', e.target.value)} />
                        </div>
                      </div>
                      {entered && getPhysicalQty(item) !== null && (
                        <div className="text-[9px] text-gray-400 text-center mt-0.5 font-bold">
                          = {getPhysicalQty(item)} bottles total
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isEntered && diff !== null ? (
                        <span className={`font-black text-sm ${diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      {!entered ? (
                        <span className="text-[10px] text-gray-300 font-bold">Not counted</span>
                      ) : diff === 0 ? (
                        <span className="flex items-center justify-center gap-1 text-[10px] text-green-600 font-black"><CheckCircle size={12} /> Match</span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-[10px] text-red-600 font-black"><AlertTriangle size={12} /> {(diff ?? 0) > 0 ? 'Over' : 'Short'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 px-4 z-50">
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
          <div className="text-white">
            <p className="text-xs font-black uppercase text-gray-400">Ready to save</p>
            <p className="font-black">
              <span className="text-blue-400">{filledItems.length} counted</span>
              {diffItems.length > 0 && <span className="text-red-400 ml-3">{diffItems.length} will be adjusted</span>}
              {diffItems.length === 0 && filledItems.length > 0 && <span className="text-green-400 ml-3">All match! ✓</span>}
            </p>
          </div>
          <button onClick={handleSave} disabled={saving || filledItems.length === 0}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Count & Adjust
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockCountPage;

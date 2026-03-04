import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import TableView from '../../components/common/TableView';
import { Card, CardContent } from '../../components/ui/Card';
import { useCompany } from '../../utils/useCompany';
import { 
  Plus, Pencil, Trash2, History, PackagePlus, 
  RefreshCcw, Search, X, Package, Loader2, Calculator
} from 'lucide-react';

const InventoryPage = () => {
  const { company } = useCompany();
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals States - 'ADD' කොටස අලුතින් ඇතුළත් කළා
  const [activeModal, setActiveModal] = useState<'NONE' | 'ADJUST' | 'EDIT' | 'HISTORY' | 'ADD'>('NONE');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Form States (Adjustment)
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('OUT');
  const [adjSubType, setAdjSubType] = useState('INTERNAL_DAMAGE');
  const [adjCases, setAdjCases] = useState(0);
  const [adjBottles, setAdjBottles] = useState(0);
  const [adjNote, setAdjNote] = useState('');

  // Form States (Edit & Add)
  // Pack Size (bottles_per_case) එක මෙතනින් පාලනය වෙනවා
  const [formData, setFormData] = useState({ name: '', price: 0, special_price: 0, bottles_per_case: 12, sku: '', category: '' });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('inventory').select('*').order('name', { ascending: true });
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  // --- 0. Add New Product Logic (අලුතින් එකතු කළා) ---
  const handleAddProduct = async () => {
    if (!formData.name) return alert("Product name is required!");
    
    const { error } = await supabase.from('inventory').insert([{
      name: formData.name,
      price: formData.price,
        special_price: formData.special_price || null,
      bottles_per_case: formData.bottles_per_case,
      sku: formData.sku,
      quantity: 0 // මුලින්ම stock එක 0 යි
    }]);

    if (!error) {
      closeAllModals();
      fetchProducts();
    } else {
      alert("Error adding product: " + error.message);
    }
  };

  // --- 1. Stock Adjustment Logic ---
  const handleSaveAdjustment = async () => {
    const bpc = selectedProduct.bottles_per_case || 12;
    const finalQty = (adjType === 'IN' ? 1 : -1) * ((adjCases * bpc) + adjBottles);

    const { error: moveError } = await supabase.from('stock_movements').insert([{
      inventory_id: selectedProduct.id, 
      quantity: finalQty,
      type: adjType === 'IN' ? 'RESTORE' : 'DAMAGE', 
      sub_type: adjSubType, 
      note: adjNote
    }]);

    if (!moveError) {
      await supabase.from('inventory').update({ quantity: (selectedProduct.quantity || 0) + finalQty }).eq('id', selectedProduct.id);
      closeAllModals();
      fetchProducts();
    }
  };

  // --- 2. Edit Product Logic ---
  const handleUpdateProduct = async () => {
    const { error } = await supabase.from('inventory').update(formData).eq('id', selectedProduct.id);
    if (!error) {
      closeAllModals();
      fetchProducts();
    }
  };

  // --- 3. Delete Product Logic ---
  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (!error) fetchProducts();
    }
  };

  // --- Sync Inventory from GRN - Invoice (Balance) ---
  const handleSyncFromGRNAndInvoices = async () => {
    if (!window.confirm('Recalculate inventory balance from GRN and Invoices? (Existing quantity will be replaced)')) return;
    setSyncing(true);
    try {
      const companyId = company?.id;
      let grnQ: any = supabase.from('grn_items').select('product_id, quantity');
      let invQ: any = supabase.from('invoice_items').select('inventory_id, quantity, qty_bottles');
      if (companyId) {
        grnQ = grnQ.eq('company_id', companyId);
        invQ = invQ.eq('company_id', companyId);
      }
      const invQ2 = supabase.from('inventory').select('id, bottles_per_case');
      const [grnRes, invRes, invData, returnsRes] = await Promise.all([
        grnQ,
        invQ,
        invQ2,
        supabase.from('stock_movements').select('inventory_id, product_id, quantity, type').in('type', ['MARKET_RETURN', 'DAMAGE_RETURN'])
      ]);

      const inventoryMap: Record<string, number> = {};
      const bpcMap: Record<string, number> = {};
      (invData.data || []).forEach((p: any) => { bpcMap[p.id] = p.bottles_per_case || 12; });

      (grnRes.data || []).forEach((g: any) => {
        const pid = g.product_id;
        if (!inventoryMap[pid]) inventoryMap[pid] = 0;
        inventoryMap[pid] += Number(g.quantity) || 0;
      });

      (invRes.data || []).forEach((i: any) => {
        const pid = i.inventory_id;
        const bpc = bpcMap[pid] || 12;
        const bottles = (Number(i.quantity) || 0) * bpc + (Number(i.qty_bottles) || 0);
        if (!inventoryMap[pid]) inventoryMap[pid] = 0;
        inventoryMap[pid] -= bottles;
      });

      (returnsRes.data || []).forEach((r: any) => {
        const pid = r.inventory_id || r.product_id;
        if (pid && (Number(r.quantity) || 0) > 0) {
          if (!inventoryMap[pid]) inventoryMap[pid] = 0;
          inventoryMap[pid] += Number(r.quantity);
        }
      });

      const productIds = Object.keys(inventoryMap);
      for (const productId of productIds) {
        const balance = Math.max(0, inventoryMap[productId] || 0);
        await supabase.from('inventory').update({ quantity: balance }).eq('id', productId);
      }
      alert('Inventory balance synced! GRN - Invoice + Returns = Balance');
      fetchProducts();
    } catch (err: any) {
      alert('Sync error: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // --- 4. History Logic ---
  const fetchItemHistory = async (product: any) => {
    setSelectedProduct(product);
    const { data } = await supabase.from('stock_movements').select('*').eq('inventory_id', product.id).order('created_at', { ascending: false }).limit(10);
    setHistoryData(data || []);
    setActiveModal('HISTORY');
  };

  const closeAllModals = () => {
    setActiveModal('NONE');
    setSelectedProduct(null);
    setAdjCases(0); setAdjBottles(0); setAdjNote('');
    setFormData({ name: '', price: 0, special_price: 0, bottles_per_case: 12, sku: '', category: '' });
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 p-4 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Inventory <span className="text-blue-600">Master</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage your products and stock levels</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSyncFromGRNAndInvoices}
            disabled={syncing}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50"
            title="GRN - Invoice + Returns = Balance"
          >
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <Calculator size={18} />} Sync from GRN & Invoice
          </button>
          <button 
            onClick={() => setActiveModal('ADD')}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
          >
            <Plus size={18} /> New Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search products by name..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-none shadow-sm rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500 transition-all" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* Products Table */}
      <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <TableView 
            data={filteredProducts}
            columns={[
              { header: 'Product Details', accessorKey: 'name', cell: (r: any) => (
                <div className="flex flex-col">
                  <span className="font-black text-slate-800 uppercase italic">{r.name}</span>
                  <span className="text-[9px] font-bold text-slate-400">SKU: {r.sku || 'N/A'} | Pack: {r.bottles_per_case} Btls</span>
                </div>
              )},
              { 
                header: 'Current Stock', 
                accessorKey: 'quantity', 
                cell: (r: any) => {
                  const bpc = r.bottles_per_case || 12;
                  const qty = r.quantity || 0;
                  return (
                    <div className="flex items-center gap-2">
                      <div className="font-black text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">
                        {Math.floor(qty / bpc)} <span className="text-[9px] uppercase opacity-60">Cs</span> | {qty % bpc} <span className="text-[9px] uppercase opacity-60">Btl</span>
                      </div>
                    </div>
                  )
                } 
              },
              {
                header: 'Price / Special',
                accessorKey: 'price',
                cell: (r: any) => (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase">MRP</span>
                      <span className="font-black text-slate-700">LKR {Number(r.price || 0).toFixed(2)}</span>
                    </div>
                    {r.special_price ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-orange-400 uppercase">Special 🔥</span>
                        <span className="font-black text-orange-600">LKR {Number(r.special_price).toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-300 font-bold">No special price</span>
                    )}
                  </div>
                )
              },
              { 
                header: 'Actions', 
                accessorKey: 'id', 
                cell: (r: any) => (
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedProduct(r); setActiveModal('ADJUST'); }} className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm" title="Adjust Stock"><PackagePlus size={18} /></button>
                    <button onClick={() => { setSelectedProduct(r); setFormData({ name: r.name, price: r.price, special_price: r.special_price || 0, bottles_per_case: r.bottles_per_case, sku: r.sku, category: r.category }); setActiveModal('EDIT'); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Edit"><Pencil size={18} /></button>
                    <button onClick={() => fetchItemHistory(r)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm" title="History"><History size={18} /></button>
                    <button onClick={() => handleDeleteProduct(r.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Delete"><Trash2 size={18} /></button>
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* --- ADD / EDIT MODAL (අලුතින් නිවැරදි කළා) --- */}
      {(activeModal === 'ADD' || activeModal === 'EDIT') && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`p-6 ${activeModal === 'ADD' ? 'bg-blue-600' : 'bg-slate-800'} text-white flex justify-between items-center`}>
              <h2 className="font-black uppercase italic tracking-widest flex items-center gap-2">
                <Package size={20} /> {activeModal === 'ADD' ? 'New Product' : 'Edit Product'}
              </h2>
              <button onClick={closeAllModals} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Product Name</label>
                <input placeholder="Ex: Lion Lager 625ml" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Case Price (LKR)</label>
                  <input type="number" placeholder="0.00" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-orange-400 mb-2 block tracking-widest">Special Price (LKR) 🔥</label>
                  <input type="number" placeholder="For 40%+ disc customers" className="w-full p-4 bg-orange-50 rounded-2xl font-bold border border-orange-200 outline-none focus:border-orange-400" value={formData.special_price || ''} onChange={e => setFormData({...formData, special_price: parseFloat(e.target.value) || 0})} />
                  <p className="text-[9px] text-orange-400 mt-1 font-bold">Auto-used when customer disc &gt; 40%</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Pack Size (Btls)</label>
                  <select 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none appearance-none"
                    value={formData.bottles_per_case}
                    onChange={e => setFormData({...formData, bottles_per_case: parseInt(e.target.value)})}
                  >
                    <option value={12}>12 Bottles</option>
                    <option value={24}>24 Bottles</option>
                    <option value={6}>6 Bottles</option>
                    <option value={1}>Loose / Single</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">SKU / Code (Optional)</label>
                <input placeholder="Ex: LION-625" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none uppercase" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>

              <button 
                onClick={activeModal === 'ADD' ? handleAddProduct : handleUpdateProduct} 
                className={`w-full ${activeModal === 'ADD' ? 'bg-blue-600 shadow-blue-100' : 'bg-slate-800 shadow-slate-100'} p-5 text-white rounded-2xl font-black uppercase italic tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all`}
              >
                {activeModal === 'ADD' ? 'Create Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL (පරණ විදියටම ඇත) --- */}
      {activeModal === 'HISTORY' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border-none">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="font-black uppercase italic tracking-widest">Stock History</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedProduct?.name}</p>
              </div>
              <button onClick={closeAllModals} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 max-h-[450px] overflow-y-auto">
              {historyData.length === 0 ? (
                <div className="text-center py-10 text-slate-300 font-bold uppercase italic text-sm tracking-widest">No history records found</div>
              ) : (
                historyData.map((h, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-50 py-4 last:border-0">
                    <div className="flex gap-4 items-center">
                      <div className={`p-2 rounded-lg ${h.quantity > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                         <RefreshCcw size={14} className={h.quantity > 0 ? '' : 'rotate-180'} />
                      </div>
                      <div>
                        <div className="font-black text-[10px] uppercase tracking-tighter text-slate-700">{h.type} <span className="text-slate-400 font-bold">({h.sub_type})</span></div>
                        <div className="text-[9px] text-gray-400 font-bold">{new Date(h.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className={`font-black text-sm italic ${h.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {h.quantity > 0 ? '+' : ''}{h.quantity} <span className="text-[9px] uppercase opacity-60">Btls</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADJUSTMENT MODAL (පරණ විදියටම ඇත) --- */}
      {activeModal === 'ADJUST' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border-none">
             <div className="p-6 bg-orange-500 text-white flex justify-between items-center">
                <h2 className="font-black uppercase italic tracking-widest">Adjust Stock</h2>
                <button onClick={closeAllModals} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><X size={20} /></button>
             </div>
             <div className="p-8 space-y-6">
                <div className="p-1 bg-slate-100 rounded-2xl flex gap-1">
                   <button onClick={() => setAdjType('OUT')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${adjType === 'OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}>Manual Issue / Damage</button>
                   <button onClick={() => setAdjType('IN')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${adjType === 'IN' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}>Manual Receive / Restore</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block tracking-widest text-center">Cases</label>
                      <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl text-center font-black text-xl border-none outline-none focus:ring-2 focus:ring-orange-500" placeholder="0" onChange={e => setAdjCases(parseInt(e.target.value) || 0)} />
                   </div>
                   <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block tracking-widest text-center">Bottles</label>
                      <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl text-center font-black text-xl border-none outline-none focus:ring-2 focus:ring-orange-500" placeholder="0" onChange={e => setAdjBottles(parseInt(e.target.value) || 0)} />
                   </div>
                </div>
                <div>
                   <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Remarks / Note</label>
                   <textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none text-xs" rows={2} placeholder="Reason for adjustment..." value={adjNote} onChange={e => setAdjNote(e.target.value)}></textarea>
                </div>
                <button onClick={handleSaveAdjustment} className="w-full bg-orange-500 text-white p-5 rounded-2xl font-black uppercase italic tracking-[0.2em] shadow-xl shadow-orange-100 hover:scale-[1.02] active:scale-[0.98] transition-all">Apply Adjustment</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
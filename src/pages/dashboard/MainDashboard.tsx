import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ShoppingCart, Truck, Package, ArrowUpRight, Plus, ArrowDownLeft, RotateCcw, Box, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../utils/useCompany';

// Format bottles → CS / BT using given bpc
const fmtBtl = (totalBtl: number, bpc = 12) => {
  const cs = Math.floor(totalBtl / bpc);
  const bt = totalBtl % bpc;
  if (cs > 0 && bt > 0) return `${cs.toLocaleString()} CS  ${bt} BT`;
  if (cs > 0)           return `${cs.toLocaleString()} CS`;
  if (bt > 0)           return `${bt} BT`;
  return '—';
};

const MainDashboard = () => {
  const navigate    = useNavigate();
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    // GRN: quantity = total bottles
    receivedBottles: 0,
    // Invoice: quantity = cases, need to × bpc per product
    issuedBottles:   0,
    // Movements: quantity = total bottles
    returnBottles:   0,
    damageBottles:   0,
    sampleBottles:   0,
    packDmgBottles:  0,
    // Inventory: quantity = total bottles
    stockBottles:    0,
    rawMaterials:    0,
    transportNet:    0,
  });

  useEffect(() => { fetchStats(); }, [company]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const cid = company?.id;
      if (!cid) return;

      // Step 1: master tables
      const [grnRes, invRes, rawGrnRes, stockRes, transportRes, movRes] = await Promise.all([
        supabase.from('grn_master').select('id').eq('company_id', cid),
        supabase.from('invoices').select('id').eq('company_id', cid),
        supabase.from('raw_material_grn_items').select('quantity').eq('company_id', cid),
        supabase.from('inventory').select('quantity').eq('company_id', cid),
        supabase.from('transport_log').select('hire_cost, advance_paid').eq('company_id', cid),
        supabase.from('stock_movements').select('quantity, type').eq('company_id', cid),
      ]);

      const grnIds = (grnRes.data || []).map((g: any) => g.id);
      const invIds = (invRes.data || []).map((i: any) => i.id);

      // Step 2: items
      const [grnItemsRes, invItemsRes] = await Promise.all([
        // grn_items: quantity = total bottles (cases×bpc + loose) - already correct
        grnIds.length > 0
          ? supabase.from('grn_items').select('quantity').in('grn_id', grnIds)
          : Promise.resolve({ data: [] }),
        // invoice_items: quantity = cases, need bpc from inventory join
        invIds.length > 0
          ? supabase.from('invoice_items')
              .select('quantity, qty_bottles, inventory:inventory_id(bottles_per_case)')
              .in('invoice_id', invIds)
              .neq('is_free', true)
          : Promise.resolve({ data: [] }),
      ]);

      // GRN: quantity already = total bottles ✅
      const receivedBottles = (grnItemsRes.data || [])
        .reduce((a: number, c: any) => a + (c.quantity || 0), 0);

      // Invoice: quantity = cases → × actual bpc from inventory + loose bottles
      const issuedBottles = (invItemsRes.data || [])
        .reduce((a: number, c: any) => {
          const bpc = (c.inventory as any)?.bottles_per_case || 12;
          return a + (c.quantity || 0) * bpc + (c.qty_bottles || 0);
        }, 0);

      // Stock movements: quantity = total bottles
      const allMov        = movRes.data || [];
      const returnBottles  = allMov.filter((m:any) => m.type === 'MARKET_RETURN') .reduce((a:number,m:any)=>a+Math.abs(m.quantity||0),0);
      const damageBottles  = allMov.filter((m:any) => m.type === 'DAMAGE_RETURN') .reduce((a:number,m:any)=>a+Math.abs(m.quantity||0),0);
      const sampleBottles  = allMov.filter((m:any) => m.type === 'SAMPLE')        .reduce((a:number,m:any)=>a+Math.abs(m.quantity||0),0);
      const packDmgBottles = allMov.filter((m:any) => m.type === 'PACK_DAMAGE')   .reduce((a:number,m:any)=>a+Math.abs(m.quantity||0),0);

      // Stock on hand: inventory.quantity = total bottles ✅
      const stockBottles   = (stockRes.data    || []).reduce((a:number,c:any)=>a+(c.quantity||0),0);
      const rawMaterials   = (rawGrnRes.data   || []).reduce((a:number,c:any)=>a+(c.quantity||0),0);
      const transportNet   = (transportRes.data|| []).reduce((a:number,c:any)=>a+((c.hire_cost||0)-(c.advance_paid||0)),0);

      setStats({ receivedBottles, issuedBottles, returnBottles, damageBottles, sampleBottles, packDmgBottles, stockBottles, rawMaterials, transportNet });
    } catch (err) { console.error('Dashboard Error:', err); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10">

        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">SmartBiz <span className="text-blue-600">ERP</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Command Center · Real-time Updates</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchStats} className="bg-slate-100 text-slate-600 p-3 rounded-2xl shadow hover:bg-slate-200 transition-all"><RefreshCw size={20} /></button>
            <button onClick={() => navigate('/sales/new-invoice')} className="bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all flex items-center gap-2 font-bold"><Plus size={20} /> New Invoice</button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

          {/* Received Goods */}
          <div onClick={() => navigate('/inventory/grn/new')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all"><ArrowDownLeft size={22} /></div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Received Goods (GRN)</p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 italic">{fmtBtl(stats.receivedBottles)}</h3>
            <p className="text-[9px] text-slate-400 mt-2">{stats.receivedBottles.toLocaleString()} total bottles</p>
            <div className="mt-3 flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase">Add GRN <ArrowUpRight size={11} /></div>
          </div>

          {/* Issued Goods */}
          <div onClick={() => navigate('/sales/new-invoice')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all"><ArrowUpRight size={22} /></div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Issued Goods (Invoice)</p>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-600 italic">{fmtBtl(stats.issuedBottles)}</h3>
            <p className="text-[9px] text-slate-400 mt-2">{stats.issuedBottles.toLocaleString()} total bottles</p>
            <div className="mt-3 flex items-center gap-1 text-blue-600 font-bold text-[10px] uppercase">New Invoice <ArrowUpRight size={11} /></div>
          </div>

          {/* Returns & Deductions */}
          <div onClick={() => navigate('/inventory/returns')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
            <div className="bg-orange-50 text-orange-500 p-3 rounded-2xl w-fit mb-4 group-hover:bg-orange-500 group-hover:text-white transition-all"><RotateCcw size={22} /></div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Returns & Deductions</p>
            <h3 className="text-xl sm:text-2xl font-black text-orange-500 italic">{fmtBtl(stats.returnBottles)}</h3>
            <div className="mt-1 space-y-0.5">
              <p className="text-[9px] text-slate-500">↩ Market Return: {fmtBtl(stats.returnBottles)}</p>
              <p className="text-[9px] text-red-400">↩ Damage Return: {fmtBtl(stats.damageBottles)}</p>
              <p className="text-[9px] text-purple-400">✕ Samples: {fmtBtl(stats.sampleBottles)}</p>
              <p className="text-[9px] text-slate-400">✕ Pack Damage: {fmtBtl(stats.packDmgBottles)}</p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-orange-500 font-bold text-[10px] uppercase">Add Return <ArrowUpRight size={11} /></div>
          </div>

          {/* Stock On Hand */}
          <div onClick={() => navigate('/inventory')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
            <div className="bg-slate-100 text-slate-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-slate-800 group-hover:text-white transition-all"><Package size={22} /></div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock On Hand</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 italic">{fmtBtl(stats.stockBottles)}</h3>
            <p className="text-[9px] text-slate-400 mt-2">{stats.stockBottles.toLocaleString()} total bottles</p>
            <div className="mt-3 flex items-center gap-1 text-slate-600 font-bold text-[10px] uppercase">Inventory <ArrowUpRight size={11} /></div>
          </div>

          {/* Total Issued Wide */}
          <div onClick={() => navigate('/dashboard/sales')} className="bg-blue-600 p-5 rounded-[2rem] shadow-xl cursor-pointer hover:bg-blue-700 transition-all col-span-2 active:scale-[0.97]">
            <div className="bg-white/20 text-white p-3 rounded-2xl w-fit mb-4"><ShoppingCart size={26} /></div>
            <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">Total Issued (All Time)</p>
            <h3 className="text-3xl sm:text-4xl font-black text-white italic">{fmtBtl(stats.issuedBottles)}</h3>
            <p className="text-[9px] text-blue-200 mt-2">{stats.issuedBottles.toLocaleString()} bottles invoiced</p>
            <div className="mt-3 flex items-center gap-1 text-white font-bold text-[10px] uppercase">View Sales <ArrowUpRight size={11} /></div>
          </div>

          {/* Raw Materials */}
          <div onClick={() => navigate('/inventory/raw-materials/grn/new')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
            <div className="bg-amber-50 text-amber-500 p-3 rounded-2xl w-fit mb-4 group-hover:bg-amber-500 group-hover:text-white transition-all"><Box size={22} /></div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Raw Materials (GRN)</p>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-500 italic">{stats.rawMaterials.toLocaleString()} Nos</h3>
            <p className="text-[9px] text-slate-400 mt-2">Updated from RM GRN</p>
            <div className="mt-3 flex items-center gap-1 text-amber-500 font-bold text-[10px] uppercase">Add RM GRN <ArrowUpRight size={11} /></div>
          </div>

          {/* Fleet */}
          <div onClick={() => navigate('/transport')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
            <div className="bg-rose-50 text-rose-500 p-3 rounded-2xl w-fit mb-4 group-hover:bg-rose-500 group-hover:text-white transition-all"><Truck size={22} /></div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fleet Payable</p>
            <h3 className="text-2xl sm:text-3xl font-black text-rose-500 italic">LKR {stats.transportNet.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-400 mt-2">Hire cost minus advance paid</p>
            <div className="mt-3 flex items-center gap-1 text-rose-500 font-bold text-[10px] uppercase">Manage Fleet <ArrowUpRight size={11} /></div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">GRN, Invoice, Returns, Raw Materials — Real-time update</p>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;

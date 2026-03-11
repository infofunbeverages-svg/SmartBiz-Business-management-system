import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
  ShoppingCart, Truck, Package, ArrowUpRight, Plus,
  ArrowDownLeft, RotateCcw, Box, RefreshCw, Calendar, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../utils/useCompany';

// Format bottles → CS / BT using given bpc
const fmtBtl = (totalBtl: number, bpc = 12) => {
  const cs = Math.floor(totalBtl / bpc);
  const bt = totalBtl % bpc;
  if (cs > 0 && bt > 0) return `${cs.toLocaleString()} CS  ${bt} BT`;
  if (cs > 0)            return `${cs.toLocaleString()} CS`;
  if (bt > 0)            return `${bt} BT`;
  return '—';
};


// Format stock with correct CS/BT
const fmtStock = (cs: number, bt: number) => {
  if (cs > 0 && bt > 0) return `${cs.toLocaleString()} CS  ${bt} BT`;
  if (cs > 0)            return `${cs.toLocaleString()} CS`;
  if (bt > 0)            return `${bt} BT`;
  return '—';
};

// Date range presets
type Preset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all';

const getDateRange = (preset: Preset): { start: string; end: string } => {
  const now   = new Date();
  const fmt   = (d: Date) => d.toISOString().split('T')[0];
  const today = fmt(now);

  if (preset === 'today') {
    return { start: today, end: today };
  }
  if (preset === 'this_week') {
    const day  = now.getDay(); // 0=Sun
    const mon  = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { start: fmt(mon), end: today };
  }
  if (preset === 'this_month') {
    return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: today };
  }
  if (preset === 'last_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmt(first), end: fmt(last) };
  }
  if (preset === 'this_year') {
    return { start: fmt(new Date(now.getFullYear(), 0, 1)), end: today };
  }
  // all
  return { start: '', end: '' };
};

const presetLabels: { key: Preset; label: string }[] = [
  { key: 'today',      label: 'Today'      },
  { key: 'this_week',  label: 'This Week'  },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year',  label: 'This Year'  },
  { key: 'all',        label: 'All Time'   },
];

const MainDashboard = () => {
  const navigate    = useNavigate();
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);

  // Date filter state
  const [preset,    setPreset]    = useState<Preset>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const [stats, setStats] = useState({
    receivedBottles: 0,
    issuedBottles:   0,
    returnBottles:   0,
    damageBottles:   0,
    sampleBottles:   0,
    packDmgBottles:  0,
    stockBottles:    0,
    stockCs:         0,
    stockBt:         0,
    issuedCs:        0,
    issuedBt:        0,
    rawMaterials:    0,
    transportNet:    0,
  });

  // Init with this month
  useEffect(() => {
    const range = getDateRange('this_month');
    setStartDate(range.start);
    setEndDate(range.end);
  }, []);

  // Fetch when company or dates change
  useEffect(() => {
    if (company && (startDate || preset === 'all')) {
      fetchStats();
    }
  }, [company, startDate, endDate, preset]);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    setCustomMode(false);
    const range = getDateRange(p);
    setStartDate(range.start);
    setEndDate(range.end);
    setShowFilter(false);
  };

  const handleCustomApply = () => {
    setPreset('all'); // neutral
    setShowFilter(false);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const cid = company?.id;
      if (!cid) return;

      const { start, end } = preset === 'all' && !customMode
        ? { start: '', end: '' }
        : { start: startDate, end: endDate };

      // ── GRN ──────────────────────────────────────────────
      // grn_date is a plain date column (YYYY-MM-DD) - safe to use gte/lte
      // But fetch with date field to do client-side safe comparison
      let grnQuery = supabase.from('grn_master').select('id, grn_date').eq('company_id', cid);

      // ── Invoices ──────────────────────────────────────────
      // Use 'date' field for filtering. If date is null, fallback via created_at.
      // We fetch both and merge to handle older invoices where date may be null.
      let invQuery = supabase.from('invoices').select('id, date, created_at').eq('company_id', cid);
      const { data: allInvoices } = await invQuery;

      // Filter client-side: extract YYYY-MM-DD from timestamp
      // inv.date can be "2026-02-14 00:00:00+00" or "2026-02-14T..." or null
      const filteredInvIds = (allInvoices || []).filter((inv: any) => {
        const raw = inv.date || inv.created_at;
        if (!raw) return true;
        const d = raw.toString().substring(0, 10); // always YYYY-MM-DD
        if (start && d < start) return false;
        if (end   && d > end)   return false;
        return true;
      }).map((inv: any) => inv.id);

      // Dummy query placeholder (we already have ids above)
      const invIds = filteredInvIds;

      // ── Stock Movements ───────────────────────────────────
      // Fetch all, filter client-side to handle timestamp format safely
      let movQuery = supabase.from('stock_movements').select('quantity, type, created_at').eq('company_id', cid);

      // ── Raw Materials ─────────────────────────────────────
      let rmQuery = supabase.from('raw_material_grn_items').select('quantity').eq('company_id', cid);
      // raw_material_grn_items may not have date - fetch all (no date filter)

      const [grnRes, movRes, rawGrnRes, stockRes, transportRes] = await Promise.all([
        grnQuery,
        movQuery,
        rmQuery,
        supabase.from('inventory').select('quantity, bottles_per_case').eq('company_id', cid),
        supabase.from('transport_log').select('hire_cost, advance_paid'),
      ]);

      // GRN: client-side date filter (grn_date may be plain date or timestamp)
      const grnIds = (grnRes.data || []).filter((g: any) => {
        const raw = g.grn_date;
        if (!raw || (!start && !end)) return true;
        const d = raw.toString().substring(0, 10);
        if (start && d < start) return false;
        if (end   && d > end)   return false;
        return true;
      }).map((g: any) => g.id);
      // ── GRN Items ─────────────────────────────────────────
      const grnItemsRes = grnIds.length > 0
        ? await supabase.from('grn_items').select('quantity').in('grn_id', grnIds)
        : { data: [] };

      // ── Invoice Items ─────────────────────────────────────
      const invItemsRes = invIds.length > 0
        ? await supabase
            .from('invoice_items')
            .select('quantity, qty_bottles, inventory:inventory_id(bottles_per_case)')
            .in('invoice_id', invIds)
            .neq('is_free', true)
        : { data: [] };

      // ── Calculations ──────────────────────────────────────

      // GRN: quantity = total bottles ✅
      const receivedBottles = (grnItemsRes.data || [])
        .reduce((a: number, c: any) => a + (c.quantity || 0), 0);

      // Invoice: quantity = cases (same field used by SalesDashboard + Reports)
      const issuedCs      = (invItemsRes.data || []).reduce((a: number, c: any) => a + (Number(c.quantity) || 0), 0);
      const issuedLooseBt = (invItemsRes.data || []).reduce((a: number, c: any) => a + (c.qty_bottles || 0), 0);
      const issuedBottles = issuedCs * 12 + issuedLooseBt; // kept for backwards compat

      // Stock Movements: client-side date filter
      const allMov = (movRes.data || []).filter((m: any) => {
        const raw = m.created_at;
        if (!raw || (!start && !end)) return true;
        const d = raw.toString().substring(0, 10);
        if (start && d < start) return false;
        if (end   && d > end)   return false;
        return true;
      });
      const returnBottles  = allMov.filter((m:any) => m.type === 'MARKET_RETURN') .reduce((a:number,m:any)=>a+Math.abs(m.quantity||0),0);
      const damageBottles  = allMov.filter((m:any) => m.type === 'DAMAGE_RETURN') .reduce((a:number,m:any)=>a+Math.abs(m.quantity||0),0);
      const sampleBottles  = allMov.filter((m:any) => m.type === 'SAMPLE')        .reduce((a:number,m:any)=>a+Math.abs(m.quantity||0),0);
      const packDmgBottles = allMov.filter((m:any) => m.type === 'PACK_DAMAGE')   .reduce((a:number,m:any)=>a+Math.abs(m.quantity||0),0);

      // Stock & Transport - always all time (snapshot)
      // Stock: quantity = total bottles; convert to CS+BT using actual BPC per product
      const stockCalc = (stockRes.data || []).reduce((acc:any, c:any) => {
        const bpc = c.bottles_per_case || 12;
        const totalBtl = c.quantity || 0;
        acc.cs += Math.floor(totalBtl / bpc);
        acc.bt += totalBtl % bpc;
        return acc;
      }, { cs: 0, bt: 0 });
      const stockBottles = stockCalc.cs * 12 + stockCalc.bt; // keep for total bottles display
      const stockCs = stockCalc.cs;
      const stockBt = stockCalc.bt;
      const rawMaterials = (rawGrnRes.data   || []).reduce((a:number,c:any)=>a+(c.quantity||0),0);
      const transportNet = (transportRes.data|| []).reduce((a:number,c:any)=>a+((c.hire_cost||0)-(c.advance_paid||0)),0);

      setStats({ receivedBottles, issuedBottles, issuedCs, issuedBt: issuedLooseBt, returnBottles, damageBottles, sampleBottles, packDmgBottles, stockBottles, stockCs, stockBt, rawMaterials, transportNet });
    } catch (err) {
      console.error('Dashboard Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Label for active filter
  const activeLabel = customMode
    ? `${startDate} → ${endDate}`
    : presetLabels.find(p => p.key === preset)?.label || 'This Month';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-20 lg:pb-8">

      {/* ── MOBILE LAYOUT ── */}
      <div className="lg:hidden px-3 pt-3 space-y-2">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
              SmartBiz <span className="text-blue-600">ERP</span>
            </h1>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Command Center</p>
          </div>
          <div className="flex gap-1.5 items-center">
            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl shadow flex items-center gap-1 font-bold text-[10px]"
              >
                <Calendar size={11} className="text-blue-600" />
                {activeLabel}
                <ChevronDown size={10} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
              </button>
              {showFilter && (
                <div className="absolute right-0 top-9 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 w-56 p-2.5 space-y-0.5">
                  {presetLabels.map(p => (
                    <button key={p.key} onClick={() => handlePreset(p.key)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all
                        ${preset === p.key && !customMode ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                      {p.label}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 my-1.5" />
                  <p className="text-[9px] font-black text-slate-400 uppercase px-1">Custom</p>
                  <input type="date" value={startDate}
                    onChange={e => { setStartDate(e.target.value); setCustomMode(true); setPreset('all'); }}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold mb-1" />
                  <input type="date" value={endDate}
                    onChange={e => { setEndDate(e.target.value); setCustomMode(true); setPreset('all'); }}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold mb-1" />
                  <button onClick={handleCustomApply}
                    className="w-full bg-blue-600 text-white py-1.5 rounded-xl text-xs font-black">Apply</button>
                </div>
              )}
            </div>
            <button onClick={fetchStats} className="bg-white border border-slate-200 p-1.5 rounded-xl shadow">
              <RefreshCw size={14} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Filter badge */}
        <div className="flex items-center gap-1.5">
          <span className="bg-blue-100 text-blue-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
            {customMode ? `${startDate} → ${endDate}` : activeLabel}
          </span>
        </div>

        {/* Main stats - 2 col grid, all cards same height */}
        <div className="grid grid-cols-2 gap-2">

          {/* Received GRN */}
          <div onClick={() => navigate('/inventory/grn/new')}
            className="bg-white rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.97] transition-all border border-slate-100">
            <div className="bg-emerald-50 w-7 h-7 rounded-lg flex items-center justify-center mb-2">
              <ArrowDownLeft size={14} className="text-emerald-600" />
            </div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Received (GRN)</p>
            <p className="text-base font-black text-emerald-600 leading-tight mt-0.5">{fmtBtl(stats.receivedBottles)}</p>
            <p className="text-[7px] text-slate-400">{stats.receivedBottles.toLocaleString()} btl</p>
          </div>

          {/* Issued Invoice */}
          <div onClick={() => navigate('/sales/new-invoice')}
            className="bg-white rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.97] transition-all border border-slate-100">
            <div className="bg-blue-50 w-7 h-7 rounded-lg flex items-center justify-center mb-2">
              <ArrowUpRight size={14} className="text-blue-600" />
            </div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Issued (Invoice)</p>
            <p className="text-base font-black text-blue-600 leading-tight mt-0.5">{fmtStock(stats.issuedCs, stats.issuedBt)}</p>
            <p className="text-[7px] text-slate-400">{stats.issuedCs.toLocaleString()} CS  {stats.issuedBt} BT</p>
          </div>

          {/* Returns */}
          <div onClick={() => navigate('/inventory/returns')}
            className="bg-white rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.97] transition-all border border-slate-100">
            <div className="bg-orange-50 w-7 h-7 rounded-lg flex items-center justify-center mb-2">
              <RotateCcw size={14} className="text-orange-500" />
            </div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Returns</p>
            <p className="text-base font-black text-orange-500 leading-tight mt-0.5">
              {fmtBtl(stats.returnBottles + stats.damageBottles + stats.sampleBottles + stats.packDmgBottles)}
            </p>
            <div className="mt-0.5 space-y-0">
              <p className="text-[6.5px] text-slate-500">↩ Mkt: {fmtBtl(stats.returnBottles)}</p>
              <p className="text-[6.5px] text-red-400">↩ Dmg: {fmtBtl(stats.damageBottles)}</p>
            </div>
          </div>

          {/* Stock */}
          <div onClick={() => navigate('/inventory')}
            className="bg-white rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.97] transition-all border border-slate-100">
            <div className="bg-slate-100 w-7 h-7 rounded-lg flex items-center justify-center mb-2">
              <Package size={14} className="text-slate-600" />
            </div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Stock On Hand</p>
            <p className="text-base font-black text-slate-800 leading-tight mt-0.5">{fmtStock(stats.stockCs, stats.stockBt)}</p>
            <p className="text-[7px] text-blue-400 font-bold">↑ Current</p>
          </div>

          {/* Total Issued - full width */}
          <div onClick={() => navigate('/dashboard/sales')}
            className="bg-blue-600 rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.97] transition-all col-span-2 flex items-center justify-between">
            <div>
              <p className="text-[7px] font-black text-blue-200 uppercase tracking-wider">Total Issued · {activeLabel}</p>
              <p className="text-xl font-black text-white leading-tight mt-0.5">{fmtStock(stats.issuedCs, stats.issuedBt)}</p>
              <p className="text-[7px] text-blue-200">{stats.issuedCs.toLocaleString()} CS  {stats.issuedBt} BT invoiced</p>
            </div>
            <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center">
              <ShoppingCart size={20} className="text-white" />
            </div>
          </div>

          {/* Raw Materials */}
          <div onClick={() => navigate('/inventory/raw-materials/grn/new')}
            className="bg-white rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.97] transition-all border border-slate-100">
            <div className="bg-amber-50 w-7 h-7 rounded-lg flex items-center justify-center mb-2">
              <Box size={14} className="text-amber-500" />
            </div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Raw Materials</p>
            <p className="text-base font-black text-amber-500 leading-tight mt-0.5">{stats.rawMaterials.toLocaleString()}</p>
            <p className="text-[7px] text-slate-400">Nos</p>
          </div>

          {/* Fleet */}
          <div onClick={() => navigate('/transport')}
            className="bg-white rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.97] transition-all border border-slate-100">
            <div className="bg-rose-50 w-7 h-7 rounded-lg flex items-center justify-center mb-2">
              <Truck size={14} className="text-rose-500" />
            </div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Fleet Payable</p>
            <p className="text-base font-black text-rose-500 leading-tight mt-0.5">
              {stats.transportNet === 0 ? 'LKR 0' : `LKR ${stats.transportNet.toLocaleString()}`}
            </p>
            <p className="text-[7px] text-slate-400">Hire - Advance</p>
          </div>

        </div>
      </div>

      {/* ── DESKTOP LAYOUT (unchanged) ── */}
      <div className="hidden lg:block p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">
                SmartBiz <span className="text-blue-600">ERP</span>
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Command Center · Real-time Updates</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <button onClick={() => setShowFilter(!showFilter)}
                  className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl shadow hover:shadow-md transition-all flex items-center gap-2 font-bold text-sm">
                  <Calendar size={16} className="text-blue-600" />
                  {activeLabel}
                  <ChevronDown size={14} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
                </button>
                {showFilter && (
                  <div className="absolute right-0 top-14 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 w-64 p-3 space-y-1">
                    {presetLabels.map(p => (
                      <button key={p.key} onClick={() => handlePreset(p.key)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                          ${preset === p.key && !customMode ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                        {p.label}
                      </button>
                    ))}
                    <div className="border-t border-slate-100 my-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 pb-1">Custom Range</p>
                    <div className="space-y-2 px-1">
                      <input type="date" value={startDate}
                        onChange={e => { setStartDate(e.target.value); setCustomMode(true); setPreset('all'); }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                      <input type="date" value={endDate}
                        onChange={e => { setEndDate(e.target.value); setCustomMode(true); setPreset('all'); }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                      <button onClick={handleCustomApply}
                        className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-black">Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={fetchStats} className="bg-slate-100 text-slate-600 p-3 rounded-2xl shadow hover:bg-slate-200 transition-all">
                <RefreshCw size={20} />
              </button>
              <button onClick={() => navigate('/sales/new-invoice')}
                className="bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all flex items-center gap-2 font-bold">
                <Plus size={20} /> New Invoice
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Showing data for:</span>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              {customMode ? `${startDate} → ${endDate}` : activeLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div onClick={() => navigate('/inventory/grn/new')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all"><ArrowDownLeft size={22}/></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Received Goods (GRN)</p>
              <h3 className="text-3xl font-black text-emerald-600 italic">{fmtBtl(stats.receivedBottles)}</h3>
              <p className="text-[9px] text-slate-400 mt-2">{stats.receivedBottles.toLocaleString()} total bottles</p>
              <div className="mt-3 flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase">Add GRN <ArrowUpRight size={11}/></div>
            </div>
            <div onClick={() => navigate('/sales/new-invoice')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all"><ArrowUpRight size={22}/></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Issued Goods (Invoice)</p>
              <h3 className="text-3xl font-black text-blue-600 italic">{fmtStock(stats.issuedCs, stats.issuedBt)}</h3>
              <p className="text-[9px] text-slate-400 mt-2">{stats.issuedCs.toLocaleString()} CS  {stats.issuedBt} BT</p>
              <div className="mt-3 flex items-center gap-1 text-blue-600 font-bold text-[10px] uppercase">New Invoice <ArrowUpRight size={11}/></div>
            </div>
            <div onClick={() => navigate('/inventory/returns')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
              <div className="bg-orange-50 text-orange-500 p-3 rounded-2xl w-fit mb-4 group-hover:bg-orange-500 group-hover:text-white transition-all"><RotateCcw size={22}/></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Returns & Deductions</p>
              <h3 className="text-2xl font-black text-orange-500 italic">{fmtBtl(stats.returnBottles+stats.damageBottles+stats.sampleBottles+stats.packDmgBottles)}</h3>
              <div className="mt-1 space-y-0.5">
                <p className="text-[9px] text-slate-500">↩ Market: {fmtBtl(stats.returnBottles)}</p>
                <p className="text-[9px] text-red-400">↩ Damage: {fmtBtl(stats.damageBottles)}</p>
                <p className="text-[9px] text-purple-400">✕ Sample: {fmtBtl(stats.sampleBottles)}</p>
                <p className="text-[9px] text-slate-400">✕ Pack: {fmtBtl(stats.packDmgBottles)}</p>
              </div>
            </div>
            <div onClick={() => navigate('/inventory')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
              <div className="bg-slate-100 text-slate-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-slate-800 group-hover:text-white transition-all"><Package size={22}/></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock On Hand</p>
              <h3 className="text-3xl font-black text-slate-800 italic">{fmtStock(stats.stockCs, stats.stockBt)}</h3>
              <p className="text-[9px] text-slate-400 mt-2">{(stats.stockCs * 12 + stats.stockBt).toLocaleString()} total bottles</p>
              <p className="text-[9px] text-blue-400 font-bold">↑ Current snapshot</p>
            </div>
            <div onClick={() => navigate('/dashboard/sales')} className="bg-blue-600 p-5 rounded-[2rem] shadow-xl cursor-pointer hover:bg-blue-700 transition-all col-span-2 active:scale-[0.97]">
              <div className="bg-white/20 text-white p-3 rounded-2xl w-fit mb-4"><ShoppingCart size={26}/></div>
              <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">Total Issued · {activeLabel}</p>
              <h3 className="text-4xl font-black text-white italic">{fmtStock(stats.issuedCs, stats.issuedBt)}</h3>
              <p className="text-[9px] text-blue-200 mt-2">{stats.issuedCs.toLocaleString()} CS  {stats.issuedBt} BT invoiced</p>
            </div>
            <div onClick={() => navigate('/inventory/raw-materials/grn/new')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
              <div className="bg-amber-50 text-amber-500 p-3 rounded-2xl w-fit mb-4 group-hover:bg-amber-500 group-hover:text-white transition-all"><Box size={22}/></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Raw Materials (GRN)</p>
              <h3 className="text-3xl font-black text-amber-500 italic">{stats.rawMaterials.toLocaleString()} Nos</h3>
            </div>
            <div onClick={() => navigate('/transport')} className="bg-white p-5 rounded-[2rem] shadow-xl cursor-pointer hover:shadow-2xl transition-all group active:scale-[0.97]">
              <div className="bg-rose-50 text-rose-500 p-3 rounded-2xl w-fit mb-4 group-hover:bg-rose-500 group-hover:text-white transition-all"><Truck size={22}/></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fleet Payable</p>
              <h3 className="text-3xl font-black text-rose-500 italic">LKR {stats.transportNet.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              GRN, Invoice, Returns — Filtered by {customMode ? `${startDate} → ${endDate}` : activeLabel} · Stock & Fleet always current
            </p>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>
        </div>
      </div>

    </div>
  );
};

export default MainDashboard;

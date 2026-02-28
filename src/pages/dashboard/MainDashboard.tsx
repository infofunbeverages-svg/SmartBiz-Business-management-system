import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  ShoppingCart, Truck, Package, ArrowUpRight, Plus, ArrowDownLeft, RotateCcw, Box, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../utils/useCompany';

const MainDashboard = () => {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    receivedGoods: 0,
    issuedGoods: 0,
    marketReturns: 0,
    rawMaterials: 0,
    grossRevenue: 0,
    stockValue: 0,
    transportNet: 0
  });

  useEffect(() => {
    fetchGlobalStats();
  }, [company]);

  const fetchGlobalStats = async () => {
    try {
      setLoading(true);
      const companyId = company?.id;

      const [
        grnRes,
        invRes,
        ledgerRes,
        rawGrnRes,
        stockRes,
        transportRes,
        custRes
      ] = await Promise.all([
        companyId ? supabase.from('grn_master').select('total_amount').eq('company_id', companyId) : Promise.resolve({ data: [] }),
        companyId ? supabase.from('invoices').select('total_amount').eq('company_id', companyId) : Promise.resolve({ data: [] }),
        supabase.from('customer_ledger').select('credit, customer_id').eq('type', 'Return Credit'),
        companyId ? supabase.from('raw_material_grn_master').select('total_amount').eq('company_id', companyId) : Promise.resolve({ data: [] }),
        companyId ? supabase.from('inventory').select('quantity, price, bottles_per_case').eq('company_id', companyId) : supabase.from('inventory').select('quantity, price, bottles_per_case'),
        supabase.from('transport_log').select('hire_cost, advance_paid'),
        companyId ? supabase.from('customers').select('id').eq('company_id', companyId) : Promise.resolve({ data: [] })
      ]);

      const custIds = new Set((custRes.data || []).map((c: any) => c.id));
      const marketReturns = (ledgerRes.data || [])
        .filter((e: any) => !companyId || custIds.has(e.customer_id))
        .reduce((acc: number, curr: any) => acc + (curr.credit || 0), 0);

      const receivedGoods = (grnRes.data || []).reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);
      const issuedGoods = (invRes.data || []).reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);
      const rawMaterials = (rawGrnRes.data || []).reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);
      const stockValue = (stockRes.data || []).reduce((acc: number, curr: any) => {
        const bpc = curr.bottles_per_case || 12;
        const casesEq = (curr.quantity || 0) / bpc;
        return acc + (casesEq * (curr.price || 0));
      }, 0);
      const transNet = (transportRes.data || []).reduce((acc: number, curr: any) => acc + ((curr.hire_cost || 0) - (curr.advance_paid || 0)), 0);

      setStats({
        receivedGoods,
        issuedGoods,
        marketReturns,
        rawMaterials,
        grossRevenue: issuedGoods,
        stockValue,
        transportNet: transNet
      });
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">
              SmartBiz <span className="text-blue-600">ERP</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Command Center · Real-time Updates</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchGlobalStats} className="bg-slate-100 text-slate-600 p-3 rounded-2xl shadow hover:bg-slate-200 transition-all" title="Refresh">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => navigate('/sales/new-invoice')} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition-all flex items-center gap-2">
              <Plus size={20} /> New Invoice
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Received Goods (GRN) */}
          <div onClick={() => navigate('/inventory/grn/new')} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white cursor-pointer hover:shadow-2xl transition-all group">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <ArrowDownLeft size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received Goods (GRN)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 italic">LKR {stats.receivedGoods.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-500 mt-2 italic">Invoices, Returns & GRN එකේ update වෙනවා</p>
            <div className="mt-3 flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase italic">Add GRN <ArrowUpRight size={12} /></div>
          </div>

          {/* Issued Goods (Invoices) */}
          <div onClick={() => navigate('/sales/new-invoice')} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white cursor-pointer hover:shadow-2xl transition-all group">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <ArrowUpRight size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued Goods (Invoice)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 italic">LKR {stats.issuedGoods.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-500 mt-2 italic">Invoice එකේ stock auto deduct වෙනවා</p>
            <div className="mt-3 flex items-center gap-2 text-blue-600 font-bold text-xs uppercase italic">New Invoice <ArrowUpRight size={12} /></div>
          </div>

          {/* Market Returns */}
          <div onClick={() => navigate('/inventory/returns')} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white cursor-pointer hover:shadow-2xl transition-all group">
            <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-orange-600 group-hover:text-white transition-all">
              <RotateCcw size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Returns</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 italic">LKR {stats.marketReturns.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-500 mt-2 italic">Returns record කළහොත් auto update</p>
            <div className="mt-3 flex items-center gap-2 text-orange-600 font-bold text-xs uppercase italic">Add Return <ArrowUpRight size={12} /></div>
          </div>

          {/* Raw Materials */}
          <div onClick={() => navigate('/inventory/raw-materials/grn/new')} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white cursor-pointer hover:shadow-2xl transition-all group">
            <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Box size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raw Materials</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 italic">LKR {stats.rawMaterials.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-500 mt-2 italic">RM GRN වලින් update</p>
            <div className="mt-3 flex items-center gap-2 text-amber-600 font-bold text-xs uppercase italic">Add RM GRN <ArrowUpRight size={12} /></div>
          </div>

          {/* Gross Revenue - Prominent */}
          <div onClick={() => navigate('/dashboard/sales')} className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl border border-blue-500 cursor-pointer hover:shadow-2xl hover:bg-blue-700 transition-all group col-span-1 md:col-span-2">
            <div className="bg-white/20 text-white p-3 rounded-2xl w-fit mb-4">
              <ShoppingCart size={28} />
            </div>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Gross Revenue</p>
            <h3 className="text-3xl font-black text-white mt-1 italic">LKR {stats.grossRevenue.toLocaleString()}</h3>
            <p className="text-[9px] text-blue-200 mt-2 italic">Invoices total - real-time</p>
            <div className="mt-3 flex items-center gap-2 text-white font-bold text-xs uppercase italic">View Sales <ArrowUpRight size={12} /></div>
          </div>

          {/* Stock Value */}
          <div onClick={() => navigate('/inventory')} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white cursor-pointer hover:shadow-2xl transition-all group">
            <div className="bg-slate-100 text-slate-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-slate-800 group-hover:text-white transition-all">
              <Package size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Value</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 italic">LKR {stats.stockValue.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-500 mt-2 italic">GRN, Invoice, Returns එකෙන් update</p>
            <div className="mt-3 flex items-center gap-2 text-slate-600 font-bold text-xs uppercase italic">Inventory <ArrowUpRight size={12} /></div>
          </div>

          {/* Transport Card */}
          <div onClick={() => navigate('/transport')} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white cursor-pointer hover:shadow-2xl transition-all group">
            <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl w-fit mb-4 group-hover:bg-orange-600 group-hover:text-white transition-all">
              <Truck size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fleet Payable</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 italic">LKR {stats.transportNet.toLocaleString()}</h3>
            <div className="mt-3 flex items-center gap-2 text-orange-600 font-bold text-xs uppercase italic">Manage Fleet <ArrowUpRight size={12} /></div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
           <h2 className="text-3xl font-black uppercase italic tracking-tighter">Enterprise Overview</h2>
           <p className="text-slate-400 font-bold text-sm uppercase opacity-80 mt-2">GRN, Invoice, Returns, Raw Materials - හැම දෙයක්ම real-time update</p>
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
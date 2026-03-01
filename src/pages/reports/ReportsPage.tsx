import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import TableView from '../../components/common/TableView';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Link } from 'react-router-dom';
import { 
  Printer, FileSpreadsheet, RefreshCcw, Filter, Box, 
  ArrowUpRight, ArrowDownLeft, RotateCcw, 
  LayoutDashboard, ShoppingCart, Banknote, History, Plus, Wallet,
  ZoomIn, ZoomOut
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCompany } from '../../utils/useCompany';

// Module Types
type ReportModule = 'INVENTORY' | 'SALES' | 'EXPENSES' | 'RETURNS';

const ReportsPage = () => {
  const { company } = useCompany();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<ReportModule>('INVENTORY');
  const [returnCustomerFilter, setReturnCustomerFilter] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [pageZoom, setPageZoom] = useState(100);
  const zoomOptions = [80, 90, 100, 110, 125];

  const fetchData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      let query: any;
      
      if (activeModule === 'INVENTORY') {
        query = supabase.from('stock_movements').select(`*, inventory:product_id (name, bottles_per_case)`);
      } else if (activeModule === 'SALES') {
        query = supabase.from('sales_invoices').select(`*, customer:customer_id (full_name)`);
      } else if (activeModule === 'EXPENSES') {
        query = supabase.from('expenses').select(`*`);
      } else if (activeModule === 'RETURNS') {
        query = supabase.from('stock_movements').select(`*, inventory:product_id (name), customers:customer_id (full_name, name)`).in('type', ['RETURN', 'MARKET_RETURN', 'DAMAGE_RETURN', 'SAMPLE', 'PACK_DAMAGE']);
        if (returnCustomerFilter) query = query.eq('customer_id', returnCustomerFilter);
      }

      const { data: result, error } = await query
        .eq('company_id', company.id)
        .gte('created_at', dateRange.start + 'T00:00:00')
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [company, dateRange, activeModule]);

  useEffect(() => {
    if (company && activeModule === 'RETURNS') {
      supabase.from('customers').select('id, full_name, name').eq('company_id', company.id).order('full_name').then(({ data }) => setCustomers(data || []));
    }
  }, [company, activeModule]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Excel Export Logic
  const exportToExcel = () => {
    const exportData = data.map(item => ({
      Date: new Date(item.created_at).toLocaleDateString(),
      ...(activeModule === 'INVENTORY' && { Product: item.inventory?.name, Type: item.type, Qty: item.quantity }),
      ...(activeModule === 'SALES' && { Customer: item.customer?.full_name, Amount: item.total_net_amount }),
      ...(activeModule === 'EXPENSES' && { Category: item.category, Description: item.description, Amount: item.amount }),
      Note: item.note || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeModule}_Report_${dateRange.start}.xlsx`);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 min-h-screen bg-slate-50/50">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 no-print">
        <div>
          <h1 className="text-xl sm:text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-800">
            <LayoutDashboard className="text-blue-600" size={28} /> {activeModule} <span className="text-blue-600">REPORTS</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date Range: {dateRange.start} to {dateRange.end}</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          {/* Zoom: Report / Page zoom control */}
          <div className="flex items-center gap-1 sm:gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
            <ZoomOut size={18} className="text-slate-500 flex-shrink-0" />
            <select 
              value={pageZoom} 
              onChange={(e) => setPageZoom(Number(e.target.value))}
              className="text-xs font-bold bg-transparent border-none py-2 pr-1 focus:ring-0 cursor-pointer min-h-[44px] sm:min-h-0"
            >
              {zoomOptions.map((z) => (
                <option key={z} value={z}>{z}%</option>
              ))}
            </select>
            <ZoomIn size={18} className="text-slate-500 flex-shrink-0" />
          </div>
          {activeModule === 'RETURNS' && (
            <>
              <Link to="/inventory/returns" className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-2xl hover:bg-orange-700 transition shadow-lg font-bold text-xs uppercase">
                <Plus size={18} /> Add Return / Damage
              </Link>
              <Link to="/finance/ledger" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl hover:bg-blue-700 transition shadow-lg font-bold text-xs uppercase">
                <Wallet size={18} /> View Ledger
              </Link>
            </>
          )}
          <button type="button" onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-4 sm:px-5 py-3 sm:py-2.5 rounded-2xl hover:bg-emerald-700 transition shadow-lg font-bold text-xs uppercase min-h-[44px] sm:min-h-0">
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-4 sm:px-5 py-3 sm:py-2.5 rounded-2xl hover:bg-black transition shadow-lg font-bold text-xs uppercase min-h-[44px] sm:min-h-0">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      {/* --- MODULE TABS --- */}
      <div className="flex gap-3 no-print overflow-x-auto pb-2">
        {[
          { id: 'INVENTORY', label: 'Inventory', icon: <Box size={16}/> },
          { id: 'SALES', label: 'Sales', icon: <ShoppingCart size={16}/> },
          { id: 'RETURNS', label: 'Returns', icon: <RotateCcw size={16}/> },
          { id: 'EXPENSES', label: 'Expenses', icon: <Banknote size={16}/> },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveModule(tab.id as ReportModule)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all whitespace-nowrap ${
              activeModule === tab.id ? 'bg-blue-600 text-white shadow-xl translate-y-[-2px]' : 'bg-white text-slate-400 hover:bg-slate-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* --- FILTERS --- */}
      <Card className="border-none shadow-sm rounded-[2rem] no-print bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">{activeModule === 'RETURNS' ? 'Date Range & Customer' : 'Select Date Range'}</label>
              <div className="flex flex-wrap items-center gap-3">
                <input type="date" className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                <span className="text-slate-300 font-bold text-xs">TO</span>
                <input type="date" className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                {activeModule === 'RETURNS' && (
                  <select className="p-3 bg-slate-50 rounded-xl text-xs font-bold min-w-[200px]" value={returnCustomerFilter} onChange={(e) => setReturnCustomerFilter(e.target.value)}>
                    <option value="">All Customers</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name || c.name}</option>)}
                  </select>
                )}
                <button onClick={fetchData} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                  <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="bg-blue-50 p-5 px-8 rounded-[2rem] border border-blue-100 hidden md:block text-center">
              <p className="text-[10px] font-black text-blue-400 uppercase">Total Records</p>
              <p className="text-2xl font-black text-blue-700">{data.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- REPORT TABLE (zoom applied for mobile/desktop) --- */}
      <div 
        className="origin-top-left"
        style={{ 
          transform: `scale(${pageZoom / 100})`,
          transformOrigin: 'top left',
          width: pageZoom === 100 ? '100%' : `${(100 / pageZoom) * 100}%`,
          minHeight: pageZoom === 100 ? undefined : `${(100 / pageZoom) * 100}vh`,
        }}
      >
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white print:shadow-none">
          <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-32">
              <div className="animate-spin inline-block w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Synchronizing Data...</p>
            </div>
          ) : (
            <TableView 
              data={data}
              columns={
                activeModule === 'INVENTORY' || activeModule === 'RETURNS' ? [
                  { header: 'Date', cell: (r: any) => <span className="text-[10px] font-bold">{new Date(r.created_at).toLocaleDateString()}</span> },
                  { header: 'Product', cell: (r: any) => <span className="font-black text-slate-800 uppercase italic">{r.inventory?.name}</span> },
                  { header: 'Type', cell: (r: any) => <span className={`text-[9px] font-black px-2 py-1 rounded ${r.type === 'MARKET_RETURN' ? 'bg-orange-100 text-orange-700' : r.type === 'DAMAGE_RETURN' ? 'bg-red-100 text-red-700' : r.type === 'SAMPLE' ? 'bg-purple-100 text-purple-700' : r.type === 'PACK_DAMAGE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>{r.type?.replace('_', ' ')}</span> },
                  { header: 'Customer', cell: (r: any) => <span className="text-[10px] font-bold text-slate-600">{r.customers?.full_name || r.customers?.name || '-'}</span> },
                  { header: 'Qty', cell: (r: any) => <span className={`font-black ${r.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{r.quantity} Btl</span> },
                  { header: 'Note', cell: (r: any) => <span className="text-[10px] text-slate-500 uppercase">{r.note || '-'}</span> },
                ] : activeModule === 'SALES' ? [
                  { header: 'Date', cell: (r: any) => <span className="text-[10px] font-bold">{new Date(r.created_at).toLocaleDateString()}</span> },
                  { header: 'Invoice #', cell: (r: any) => <span className="font-bold text-blue-600">#{r.id.slice(0,8).toUpperCase()}</span> },
                  { header: 'Customer', cell: (r: any) => <span className="font-black text-slate-800 uppercase">{r.customer?.full_name || 'CASH'}</span> },
                  { header: 'Net Total', cell: (r: any) => <span className="font-black text-slate-900">LKR {r.total_net_amount?.toLocaleString()}</span> },
                ] : [
                  // Expenses
                  { header: 'Date', cell: (r: any) => <span className="text-[10px] font-bold">{new Date(r.created_at).toLocaleDateString()}</span> },
                  { header: 'Category', cell: (r: any) => <span className="font-black uppercase text-slate-700">{r.category}</span> },
                  { header: 'Description', cell: (r: any) => <span className="text-[10px] uppercase text-slate-500">{r.description}</span> },
                  { header: 'Amount', cell: (r: any) => <span className="font-black text-red-600">LKR {r.amount?.toLocaleString()}</span> },
                ]
              }
            />
          )}
        </CardContent>
      </Card>
      </div>

      {/* --- PRINT STYLES --- */}
      <style>{`
        @media print {
          @page { size: portrait; margin: 10mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .print\:shadow-none { shadow: none !important; border: 1px solid #eee; }
        }
      `}</style>
    </div>
  );
};

export default ReportsPage;
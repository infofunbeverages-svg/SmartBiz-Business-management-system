import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import TableView from '../../components/common/TableView';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Printer, FileSpreadsheet, RefreshCcw, Filter, Box, ArrowUpRight, ArrowDownLeft, AlertTriangle, Gift, RotateCcw, Droplets, Coffee } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCompany } from '../../utils/useCompany';

const ReportsPage = () => {
  const { company } = useCompany();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          inventory:product_id (name, bottles_per_case)
        `)
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
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, company]);

  const getMovementBadge = (type: string) => {
    const types: any = {
      'GRN': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Stock In (GRN)', icon: <ArrowDownLeft size={12}/> },
      'SALE': { color: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Issued for Sale', icon: <ArrowUpRight size={12}/> },
      'DAMAGE': { color: 'bg-red-50 text-red-600 border-red-100', label: 'Damage Removed', icon: <AlertTriangle size={12}/> },
      'RETURN': { color: 'bg-orange-50 text-orange-600 border-orange-100', label: 'Market Return', icon: <RotateCcw size={12}/> },
      'SAMPLE': { color: 'bg-purple-50 text-purple-600 border-purple-100', label: 'Sample / Free', icon: <Gift size={12}/> },
      'REPACK': { color: 'bg-cyan-50 text-cyan-600 border-cyan-100', label: 'Repacked & Added', icon: <Box size={12}/> },
      'GAS_OUT': { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Gas Out / Pressure', icon: <Droplets size={12}/> },
      'CONSUMPTION': { color: 'bg-pink-50 text-pink-600 border-pink-100', label: 'Hospitality / Staff', icon: <Coffee size={12}/> },
    };
    const style = types[type?.toUpperCase()] || { color: 'bg-gray-50 text-gray-500', label: type, icon: null };
    
    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black border uppercase ${style.color}`}>
        {style.icon} {style.label}
      </span>
    );
  };

  const exportToExcel = () => {
    const exportData = data.map(item => {
      const bpc = item.inventory?.bottles_per_case || 12;
      const qtyVal = item.quantity || 0;
      const absQty = Math.abs(qtyVal);
      return {
        'Date': new Date(item.created_at).toLocaleString(),
        'Product': item.inventory?.name || 'N/A',
        'Type': item.type,
        'Cases': Math.floor(absQty / bpc),
        'Bottles': absQty % bpc,
        'Net Qty (Btl)': qtyVal,
        'Reason/Note': item.note || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock_Log");
    XLSX.writeFile(wb, `Stock_Log_${dateRange.start}.xlsx`);
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-slate-50/50">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-800">
            <Box className="text-blue-600" size={32} /> STOCK <span className="text-blue-600">MOVEMENT LOG</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Inventory History</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 font-bold text-xs uppercase">
            <FileSpreadsheet size={18} /> Excel Export
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl hover:bg-black transition shadow-lg shadow-slate-200 font-bold text-xs uppercase">
            <Printer size={18} /> Print Log
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="border-none shadow-sm rounded-[2rem] no-print bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Filter By Date</label>
              <div className="flex items-center gap-3">
                <input type="date" className="flex-1 bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                <span className="text-slate-300 font-bold text-xs">TO</span>
                <input type="date" className="flex-1 bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                <button onClick={fetchData} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">
                  <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 hidden md:block">
              <p className="text-[10px] font-black text-blue-400 uppercase">Total Items Found</p>
              <p className="text-xl font-black text-blue-700">{data.length} Records</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-50 p-6">
          <CardTitle className="text-sm font-black uppercase text-slate-700 flex items-center gap-2">
            <Filter size={16} className="text-blue-500" /> Stock Transaction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-24">
              <div className="animate-spin inline-block w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Synchronizing Records...</p>
            </div>
          ) : (
            <TableView 
              data={data}
              columns={[
                { 
                  header: 'Date & Time', 
                  cell: (r: any) => (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 uppercase">{new Date(r.created_at).toLocaleDateString()}</span>
                      <span className="text-[8px] text-slate-400 font-bold">{new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>
                  )
                },
                { 
                  header: 'Product', 
                  cell: (r: any) => (
                    <span className="font-black text-slate-800 uppercase italic tracking-tighter">{r.inventory?.name || 'Unknown'}</span>
                  )
                },
                { 
                  header: 'Movement Type', 
                  cell: (r: any) => getMovementBadge(r.type) 
                },
                { 
                  header: 'Qty Change', 
                  cell: (r: any) => {
                    const bpc = r.inventory?.bottles_per_case || 12;
                    const qtyVal = r.quantity || 0;
                    const abs = Math.abs(qtyVal);
                    const isPositive = qtyVal > 0;
                    return (
                      <div className={`flex flex-col items-end font-black ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span>{isPositive ? '+' : '-'}{Math.floor(abs / bpc)} Cs {abs % bpc} Btl</span>
                        <span className="text-[8px] opacity-60">Net: {qtyVal} Btl</span>
                      </div>
                    );
                  }
                },
                { 
                  header: 'Reason / Notes', 
                  cell: (r: any) => <span className="text-[10px] font-bold text-slate-500 uppercase">{r.note || '-'}</span> 
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import TableView from '../../components/common/TableView';
import { Card, CardContent } from '../../components/ui/Card'; // CardHeader, CardTitle අයින් කළා usage එකක් නැති නිසා
import { 
  Printer, FileSpreadsheet, RefreshCcw, Wallet 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCompany } from '../../utils/useCompany';

const CustomerLedger = () => {
  const { company } = useCompany();
  const [data, setData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchCustomers = async () => {
    if (!company) return;
    const { data: custs } = await supabase
      .from('customers')
      .select('id, full_name, shop_name')
      .eq('company_id', company.id)
      .order('full_name');
    setCustomers(custs || []);
  };

  const fetchLedgerData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      let query = supabase
        .from('customer_transactions')
        .select(`*, customer:customer_id (full_name, shop_name)`)
        .eq('company_id', company.id)
        .gte('created_at', dateRange.start + 'T00:00:00')
        .lte('created_at', dateRange.end + 'T23:59:59');

      if (selectedCustomerId !== 'all') {
        query = query.eq('customer_id', selectedCustomerId);
      }

      const { data: result, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error("Ledger Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [company, selectedCustomerId, dateRange]);

  useEffect(() => {
    fetchCustomers();
  }, [company]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  // --- EXCEL EXPORT FIXED ---
  const exportToExcel = () => {
    if (data.length === 0) {
      alert("No data to export!");
      return;
    }

    const exportData = data.map(item => ({
      'Date': new Date(item.created_at).toLocaleDateString(),
      'Customer': item.customer?.full_name || 'N/A',
      'Description': item.description,
      'Debit': item.type === 'DEBIT' ? item.amount : 0,
      'Credit': item.type === 'CREDIT' ? item.amount : 0,
      'Balance': item.running_balance || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    
    // File එක download කරවන කොටස
    XLSX.writeFile(workbook, `Ledger_Report_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-slate-50/50">
      
      {/* Header - මෙතන Buttons ටික පේන විදිහ සහ click එක fixed */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-800">
            <Wallet className="text-blue-600" size={32} /> CUSTOMER <span className="text-blue-600">LEDGER</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Financial Transaction History</p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10"> 
          <button 
            type="button"
            onClick={exportToExcel} 
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl hover:bg-emerald-700 transition shadow-lg font-bold text-xs uppercase cursor-pointer"
          >
            <FileSpreadsheet size={18} /> Excel Export
          </button>
          <button 
            type="button"
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl hover:bg-black transition shadow-lg font-bold text-xs uppercase cursor-pointer"
          >
            <Printer size={18} /> Print Statement
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <Card className="border-none shadow-sm rounded-[2rem] no-print bg-white">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Select Customer</label>
              <select 
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold outline-none ring-0 focus:ring-2 focus:ring-blue-500"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="all">ALL CUSTOMERS</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.shop_name})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Date Range</label>
              <div className="flex items-center gap-3">
                <input type="date" className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-xs font-bold outline-none" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                <span className="text-slate-300 font-bold text-xs">TO</span>
                <input type="date" className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-xs font-bold outline-none" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                <button onClick={fetchLedgerData} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-transform active:scale-90">
                  <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-20 italic font-black uppercase text-slate-300 tracking-widest">Fetching Ledger...</div>
          ) : (
            <TableView 
              data={data}
              columns={[
                { 
                  header: 'Date', 
                  cell: (r: any) => <span className="text-[10px] font-bold">{new Date(r.created_at).toLocaleDateString()}</span> 
                },
                { 
                  header: 'Description', 
                  cell: (r: any) => (
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{r.description}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{r.customer?.full_name}</span>
                    </div>
                  )
                },
                { 
                  header: 'Debit', 
                  cell: (r: any) => <span className="font-black text-red-500">{r.type === 'DEBIT' ? `LKR ${r.amount.toLocaleString()}` : '-'}</span> 
                },
                { 
                  header: 'Credit', 
                  cell: (r: any) => <span className="font-black text-emerald-600">{r.type === 'CREDIT' ? `LKR ${r.amount.toLocaleString()}` : '-'}</span> 
                },
                { 
                  header: 'Balance', 
                  cell: (r: any) => (
                    <span className="font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                      LKR {r.running_balance?.toLocaleString()}
                    </span>
                  ) 
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <style>{`
        @media print {
          @page { size: portrait; margin: 15mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default CustomerLedger;
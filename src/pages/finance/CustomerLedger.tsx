import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Download, Wallet, TrendingUp, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LedgerEntry {
  transaction_id: string;
  date: string;
  type: string;
  reference: string;
  description?: string;
  debit: number;
  credit: number;
}

const CustomerLedger = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    // 💡 මෙතන SQL View එකෙන් balance එක එනවා නම් සුපිරි
    const { data } = await supabase.from('customer_summary').select('*').order('full_name');
    if (data) {
      // mapping 'full_name' to 'name' for UI consistency
      const formatted = data.map(c => ({ ...c, name: c.full_name }));
      setCustomers(formatted);
    }
  };

  useEffect(() => {
    if (selectedCustomerId !== 'ALL') {
      fetchLedger();
    }
  }, [selectedCustomerId]);

  const fetchLedger = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_ledger')
      .select('*')
      .eq('customer_id', selectedCustomerId)
      .order('date', { ascending: true });

    if (error) console.error(error);
    else setLedgerData(data || []);
    setLoading(false);
  };

  // --- 📊 EXCEL EXPORT (MARKET SUMMARY) ---
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(customers.map(c => ({
      "Customer Name": c.name,
      "Outstanding Balance": c.balance,
      "Status": c.balance > 0 ? "Owed" : "Cleared"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MarketSummary");
    XLSX.writeFile(wb, `Market_Summary_${new Date().toLocaleDateString()}.xlsx`);
  };

  // --- 📄 PDF EXPORT (CUSTOMER STATEMENT) ---
  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const customer = customers.find(c => c.id === selectedCustomerId);
    
    doc.setFontSize(18);
    doc.text("CUSTOMER STATEMENT", 14, 20);
    doc.setFontSize(10);
    doc.text(`Customer: ${customer?.name}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 35);

    let runningBal = 0;
    const tableData = ledgerData.map(entry => {
      runningBal += (entry.debit - entry.credit);
      return [
        new Date(entry.date).toLocaleDateString(),
        entry.type.toUpperCase(),
        entry.reference || '-',
        entry.debit.toLocaleString(),
        entry.credit.toLocaleString(),
        runningBal.toLocaleString()
      ];
    });

    doc.autoTable({
      startY: 45,
      head: [['Date', 'Type', 'Reference', 'Debit (+)', 'Credit (-)', 'Balance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55] }
    });

    doc.save(`Statement_${customer?.name}.pdf`);
  };

  const totalMarketOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  let runningBalance = 0;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-gray-800 uppercase italic">
          <Wallet className="text-blue-600" size={32} /> 
          Customer <span className="text-blue-600">Ledger</span>
        </h2>

        {/* Top Summary Cards */}
        {selectedCustomerId === 'ALL' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white relative overflow-hidden">
               <TrendingUp className="absolute right-[-10px] bottom-[-10px] text-red-500/10" size={100} />
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Market Outstanding</p>
               <h3 className="text-3xl font-black text-red-600 italic">LKR {totalMarketOutstanding.toLocaleString()}</h3>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white">
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Active Customers</p>
               <h3 className="text-3xl font-black text-gray-800 italic">{customers.length}</h3>
            </div>

            <div className="flex items-end">
               <button 
                onClick={exportToExcel}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg"
               >
                 <Download size={16} /> Export Excel Report
               </button>
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl mb-8 flex flex-wrap gap-4 items-end border border-white">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Filter By Customer</label>
            <select 
              className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-black text-gray-700"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="ALL">--- VIEW ALL CUSTOMERS (MARKET SUMMARY) ---</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} (LKR {c.balance?.toLocaleString()})</option>
              ))}
            </select>
          </div>
          {selectedCustomerId !== 'ALL' && (
            <button 
              onClick={exportToPDF}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition font-black text-[10px] uppercase tracking-widest shadow-lg"
            >
              <Download size={18} /> Download Statement
            </button>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-900 text-white">
                {selectedCustomerId === 'ALL' ? (
                  <>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest">Customer Name</th>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest text-right">Outstanding Amount</th>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest text-center">Status</th>
                  </>
                ) : (
                  <>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest">Date</th>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest text-center">Type</th>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest">Description</th>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest text-right">Debit (+)</th>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest text-right">Credit (-)</th>
                    <th className="p-6 font-black text-[10px] uppercase tracking-widest text-right">Balance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-20 text-center font-black text-gray-400 italic"><Loader2 className="animate-spin inline mr-2" /> FETCHING DATA...</td></tr>
              ) : selectedCustomerId === 'ALL' ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/50 transition cursor-pointer" onClick={() => setSelectedCustomerId(c.id)}>
                    <td className="p-6 font-black text-gray-800 text-sm uppercase italic">{c.name}</td>
                    <td className="p-6 text-right font-mono font-black text-lg text-gray-800">LKR {c.balance?.toLocaleString()}</td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase italic ${c.balance > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {c.balance > 0 ? 'Owed' : 'Cleared'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                ledgerData.map((entry) => {
                  runningBalance += (entry.debit - entry.credit);
                  return (
                    <tr key={entry.transaction_id} className="hover:bg-gray-50 transition border-b border-gray-50 last:border-none">
                      <td className="p-6 text-xs font-black text-gray-400 uppercase italic">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="p-6 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest italic ${entry.type === 'Invoice' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {entry.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-6 text-xs font-black text-gray-700 uppercase tracking-tight">{entry.description || entry.reference}</td>
                      <td className="p-6 text-right text-red-600 font-mono font-bold">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                      <td className="p-6 text-right text-green-600 font-mono font-bold">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                      <td className={`p-6 text-right font-black font-mono text-lg ${runningBalance > 0 ? 'text-blue-700 bg-blue-50' : 'text-gray-800'}`}>
                        {runningBalance.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerLedger;
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  DollarSign, Plus, ArrowUpCircle, ArrowDownCircle, 
  Wallet, History, X, Printer, ReceiptText, Calendar,
  Users, Search, AlertTriangle, FileSpreadsheet
} from 'lucide-react';
import { useCompany } from '../../utils/useCompany';

const FinancePage = () => {
  const { company } = useCompany();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [outstandingList, setOutstandingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'OUT',
    category: 'Petty Cash'
  });

  useEffect(() => {
    if (company) {
        fetchData();
    }
  }, [company]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTransactions(), fetchOutstandingBalances()]);
    setLoading(false);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('company_id', company?.id)
      .order('created_at', { ascending: false });
    if (!error) setTransactions(data || []);
  };

  const fetchOutstandingBalances = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`id, name, phone, customer_ledger ( debit, credit )`);

    if (!error && data) {
      const formattedData = data.map(customer => {
        const totalDebit = customer.customer_ledger?.reduce((sum: number, item: any) => sum + (item.debit || 0), 0) || 0;
        const totalCredit = customer.customer_ledger?.reduce((sum: number, item: any) => sum + (item.credit || 0), 0) || 0;
        return { id: customer.id, name: customer.name, phone: customer.phone, balance: totalDebit - totalCredit };
      }).filter(c => c.balance > 0);
      setOutstandingList(formattedData);
    }
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    const { error } = await supabase.from('finance_transactions').insert([{
        ...formData,
        amount: parseFloat(formData.amount),
        company_id: company.id,
        recorded_by: (await supabase.auth.getUser()).data.user?.id
    }]);
    if (!error) {
      setShowForm(false);
      setFormData({ description: '', amount: '', type: 'OUT', category: 'Petty Cash' });
      fetchTransactions();
    }
  };

  const printVoucher = (t: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Voucher</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap'); body { font-family: 'Inter', sans-serif; padding: 40px; } .voucher-box { border: 2px solid #e2e8f0; padding: 30px; border-radius: 20px; max-width: 600px; margin: auto; } .title { font-size: 24px; font-weight: 900; color: #2563eb; text-transform: uppercase; } .amount { font-size: 28px; font-weight: 900; background: #f8fafc; padding: 20px; border-radius: 15px; border: 1px dashed #cbd5e1; margin-top: 20px; text-align: center; }</style></head><body><div class="voucher-box"><div class="title">SmartBiz ERP</div><p>Voucher No: #PCV-${t.id.slice(0,8).toUpperCase()}</p><p>Description: ${t.description}</p><div class="amount">LKR ${t.amount.toLocaleString()}</div></div><script>window.onload = () => { window.print(); window.close(); }</script></body></html>`);
    printWindow.document.close();
  };

  const totalIncome = transactions.filter(t => t.type === 'IN').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'OUT').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOutstanding = outstandingList.reduce((sum, item) => sum + item.balance, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2">
            <DollarSign className="text-blue-600" size={32} /> FINANCE <span className="text-blue-600">HUB</span>
        </h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1">Unified Cash & Credit Overview</p>
      </div>

      {/* Stats Cards: Petty Cash & Total Outstanding */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0f172a] p-6 rounded-[2rem] text-white shadow-xl">
          <p className="text-[9px] font-black uppercase text-blue-400 mb-1">Cash Balance</p>
          <h2 className="text-2xl font-black font-mono italic">LKR {(totalIncome - totalExpense).toLocaleString()}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-red-500 mb-1">Total Outstanding</p>
          <h2 className="text-2xl font-black font-mono italic text-red-600">LKR {totalOutstanding.toLocaleString()}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hidden md:block">
          <p className="text-[9px] font-black uppercase text-emerald-500 mb-1">Total Income</p>
          <h2 className="text-2xl font-black font-mono italic text-emerald-600">LKR {totalIncome.toLocaleString()}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hidden md:block">
          <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Total Expenses</p>
          <h2 className="text-2xl font-black font-mono italic text-red-400">LKR {totalExpense.toLocaleString()}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Petty Cash Table (ඔයාගේ පරණ කෝඩ් එක) */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden h-fit">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-gray-500">
              <History size={16} className="text-blue-600" /> Recent Petty Cash
            </div>
            <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white p-2 rounded-lg hover:scale-105 transition shadow-lg"><Plus size={16} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-gray-50">
                {transactions.slice(0, 6).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="p-4 text-[11px] font-black text-gray-800 uppercase">{t.description}</td>
                    <td className={`p-4 text-right text-xs font-black italic ${t.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t.type === 'IN' ? '+' : '-'} {t.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                        <button onClick={() => printVoucher(t)} className="text-gray-300 hover:text-blue-600"><Printer size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Outstanding List (අලුතින් ඕනේ කිව්ව එක) */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden h-fit">
          <div className="p-6 border-b border-gray-50">
             <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-gray-500 mb-4">
              <Users size={16} className="text-red-500" /> Pending Receivables
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                <input 
                  type="text" placeholder="SEARCH CUSTOMER..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-200"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-gray-50">
                {outstandingList.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                        <p className="text-[11px] font-black text-gray-800 uppercase">{c.name}</p>
                    </td>
                    <td className="p-4 text-right font-black text-xs text-red-600 font-mono italic">
                        LKR {c.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Modal (පරණ කෝඩ් එක) */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 relative">
             <button onClick={() => setShowForm(false)} className="absolute top-8 right-8 text-gray-400"><X size={24} /></button>
             <h2 className="text-xl font-black italic uppercase mb-6">Record <span className="text-blue-600">Transaction</span></h2>
             <form onSubmit={handleRecordTransaction} className="space-y-4">
                <input required type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none" placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <select className="p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}><option value="OUT">Expense</option><option value="IN">Income</option></select>
                    <input required type="number" className="p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-200">Save Transaction</button>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
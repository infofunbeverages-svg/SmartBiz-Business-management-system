import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Loader2, RefreshCw, PlusCircle, FileText,
         ExternalLink, Download, AlertCircle, CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LedgerEntry {
  id?: string;
  date: string;
  type: string;
  reference: string;
  description?: string;
  debit: number;
  credit: number;
  status?: string;
  payment_id?: string;
}

const StatusBadge = ({ status, type }: { status?: string; type: string }) => {
  if (type === 'Invoice') {
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-100 text-orange-700 uppercase">Invoice</span>;
  }
  if (type === 'Return Credit') {
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-700 uppercase">Return</span>;
  }
  const s = (status || '').toLowerCase();
  if (s === 'cleared') return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700 uppercase flex items-center gap-1 w-fit"><CheckCircle size={9}/>Cleared</span>;
  if (s === 'pending') return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 uppercase flex items-center gap-1 w-fit"><Clock size={9}/>Pending Cheque</span>;
  if (s === 'returned') return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 uppercase flex items-center gap-1 w-fit"><XCircle size={9}/>Cheque Returned</span>;
  return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700 uppercase">{type}</span>;
};

export default function CustomerLedger() {
  const { company } = useCompany();
  const [customers, setCustomers]           = useState<any[]>([]);
  const [selectedCustId, setSelectedCustId] = useState('ALL');
  const [ledger, setLedger]                 = useState<LedgerEntry[]>([]);
  const [loading, setLoading]               = useState(false);
  const [syncing, setSyncing]               = useState(false);
  const [showPayForm, setShowPayForm]       = useState(false);
  const [savingPay, setSavingPay]           = useState(false);
  const [dailyDate, setDailyDate]           = useState(new Date().toISOString().split('T')[0]);
  const [payForm, setPayForm]               = useState({
    amount: 0, date: new Date().toISOString().split('T')[0],
    method: 'CASH' as 'CASH'|'CHEQUE'|'BANK',
    reference: '', chequeBank: '', postDate: '',
  });

  useEffect(() => { if (company) fetchCustomers(); }, [company]);
  useEffect(() => { if (selectedCustId !== 'ALL') fetchLedger(); else setLedger([]); }, [selectedCustId]);

  const fetchCustomers = async () => {
    const { data: custData } = await supabase
      .from('customers').select('id, full_name').eq('company_id', company.id).order('full_name');
    const ids = (custData || []).map((c: any) => c.id);
    const { data: ledgerRows } = await supabase
      .from('customer_ledger').select('customer_id, debit, credit, status').in('customer_id', ids);
    const balMap: Record<string, number> = {};
    ids.forEach((id: string) => { balMap[id] = 0; });
    (ledgerRows || []).forEach((r: any) => {
      // Pending/Returned cheques don't count as credit
      const creditAmt = (r.status === 'Pending' || r.status === 'Returned') ? 0 : Number(r.credit || 0);
      balMap[r.customer_id] = (balMap[r.customer_id] || 0) + Number(r.debit || 0) - creditAmt;
    });
    setCustomers((custData || []).map((c: any) => ({
      ...c, name: c.full_name, balance: balMap[c.id] ?? 0
    })));
  };

  const fetchLedger = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customer_ledger').select('*')
      .eq('customer_id', selectedCustId)
      .order('date', { ascending: true });
    setLedger(data || []);
    setLoading(false);
  };

  const syncFromInvoices = async () => {
    setSyncing(true);
    try {
      const { data: invs } = await supabase
        .from('invoices').select('id, invoice_no, date, customer_id, company_id, total_amount, net_amount')
        .eq('company_id', company.id);
      const { data: existing } = await supabase
        .from('customer_ledger').select('reference, customer_id').eq('type', 'Invoice');
      const existSet = new Set((existing || []).map((e: any) => `${e.customer_id}:${e.reference}`));
      let added = 0;
      for (const inv of (invs || [])) {
        if (existSet.has(`${inv.customer_id}:${inv.invoice_no}`)) continue;
        const amt = Number(inv.net_amount || inv.total_amount || 0);
        if (amt <= 0) continue;
        const invDate = inv.date
          ? (typeof inv.date === 'string' && inv.date.includes('T') ? inv.date.split('T')[0] : inv.date)
          : new Date().toISOString().split('T')[0];
        await supabase.from('customer_ledger').insert([{
          company_id:  inv.company_id,
          customer_id: inv.customer_id,
          date:        invDate,
          type:        'Invoice',
          reference:   inv.invoice_no,
          description: `Invoice ${inv.invoice_no} | ${invDate} | LKR ${amt.toLocaleString()}`,
          debit:       amt,
          credit:      0,
          status:      'Open',
        }]);
        added++;
      }
      alert(added > 0 ? `✅ ${added} invoice(s) synced to ledger!` : 'Already up to date!');
      fetchCustomers();
      if (selectedCustId !== 'ALL') fetchLedger();
    } catch (e: any) { alert('Sync error: ' + e.message); }
    setSyncing(false);
  };

  const handleSavePayment = async () => {
    if (!selectedCustId || selectedCustId === 'ALL') return alert('Select a customer!');
    if (!payForm.amount || payForm.amount <= 0) return alert('Enter amount!');
    if (payForm.method === 'CHEQUE' && !payForm.reference.trim()) return alert('Cheque number required!');
    setSavingPay(true);
    try {
      const refNo = payForm.method === 'CASH'
        ? `CASH-${Date.now().toString().slice(-6)}`
        : payForm.reference.trim();
      const isCheque = payForm.method === 'CHEQUE';
      const { data: pay, error: pErr } = await supabase.from('customer_payments').insert([{
        customer_id:     selectedCustId,
        amount:          payForm.amount,
        payment_method:  payForm.method,
        reference_no:    refNo,
        bank_name:       isCheque ? payForm.chequeBank : null,
        cheque_date:     isCheque ? (payForm.postDate || payForm.date) : null,
        post_date:       isCheque && payForm.postDate ? payForm.postDate : null,
        status:          isCheque ? 'Pending' : 'Cleared',
      }]).select().single();
      if (pErr) throw pErr;

      const { error: lErr } = await supabase.from('customer_ledger').insert([{
        company_id:  company.id,
        customer_id: selectedCustId,
        date:        payForm.date,
        type:        'Payment',
        reference:   refNo,
        description: isCheque
          ? `Cheque ${refNo} | Bank: ${payForm.chequeBank} | Post: ${payForm.postDate || payForm.date}`
          : `Payment ${payForm.method} - ${refNo} | ${payForm.date}`,
        debit:       0,
        credit:      payForm.amount,
        status:      isCheque ? 'Pending' : 'Cleared',
        payment_id:  pay?.id || null,
      }]);
      if (lErr) throw lErr;

      alert(`✅ Payment recorded! ${isCheque ? '⏳ Cheque pending until cleared.' : ''}`);
      setShowPayForm(false);
      setPayForm({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'CASH', reference: '', chequeBank: '', postDate: '' });
      fetchCustomers();
      fetchLedger();
    } catch (e: any) { alert('Error: ' + e.message); }
    setSavingPay(false);
  };

  const handleChequeAction = async (entry: LedgerEntry, action: 'clear' | 'return') => {
    if (!entry.payment_id) return alert('No payment linked!');
    const newStatus = action === 'clear' ? 'Cleared' : 'Returned';
    const confirm = window.confirm(
      action === 'clear'
        ? `✅ Mark cheque ${entry.reference} as CLEARED?`
        : `⚠️ Mark cheque ${entry.reference} as RETURNED? This will add the amount back as debt!`
    );
    if (!confirm) return;
    // Update payment
    await supabase.from('customer_payments').update({ status: newStatus }).eq('id', entry.payment_id);
    // Update ledger entry
    await supabase.from('customer_ledger').update({ status: newStatus }).eq('id', entry.id);
    // If returned - add debit entry back
    if (action === 'return') {
      await supabase.from('customer_ledger').insert([{
        company_id:  company.id,
        customer_id: selectedCustId,
        date:        new Date().toISOString().split('T')[0],
        type:        'Cheque Return',
        reference:   entry.reference,
        description: `⚠️ Cheque ${entry.reference} RETURNED - Amount reversed`,
        debit:       entry.credit,
        credit:      0,
        status:      'Returned',
      }]);
    }
    alert(action === 'clear' ? '✅ Cheque cleared!' : '⚠️ Cheque marked as returned - debt reversed!');
    fetchCustomers();
    fetchLedger();
  };

  const exportPDF = () => {
    const cust = customers.find(c => c.id === selectedCustId);
    const doc = new jsPDF() as any;
    doc.setFontSize(16); doc.text('CUSTOMER STATEMENT', 14, 18);
    doc.setFontSize(10);
    doc.text(`Customer: ${cust?.name}`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 34);
    let bal = 0;
    const rows = ledger.map(e => {
      const cr = (e.status === 'Pending' || e.status === 'Returned') ? 0 : e.credit;
      bal += e.debit - cr;
      return [
        new Date(e.date).toLocaleDateString('en-GB'),
        e.type,
        e.reference || '-',
        e.debit > 0 ? e.debit.toLocaleString() : '-',
        e.credit > 0 ? e.credit.toLocaleString() : '-',
        e.status || '-',
        bal.toLocaleString(),
      ];
    });
    doc.autoTable({
      startY: 42,
      head: [['Date','Type','Reference','Debit','Credit','Status','Balance']],
      body: rows, theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 },
    });
    doc.save(`Statement_${cust?.name}.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(customers.map(c => ({
      'Customer': c.name, 'Outstanding': c.balance, 'Status': c.balance > 0 ? 'Owed' : 'Cleared'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `Ledger_Summary_${new Date().toLocaleDateString()}.xlsx`);
  };

  const totalOutstanding = customers.reduce((s, c) => s + Math.max(0, c.balance || 0), 0);

  // Running balance for ledger view
  let runBal = 0;

  const selectedCust = customers.find(c => c.id === selectedCustId);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black mb-6 flex items-center gap-3 text-gray-800 uppercase italic">
          <Wallet className="text-blue-600" size={30}/> Customer <span className="text-blue-600">Ledger</span>
        </h2>

        {/* ── TOP CARDS ── */}
        {selectedCustId === 'ALL' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="bg-white p-6 rounded-2xl shadow border relative overflow-hidden">
              <TrendingUp className="absolute right-3 bottom-3 text-red-100" size={60}/>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Outstanding</p>
              <h3 className="text-3xl font-black text-red-600">LKR {totalOutstanding.toLocaleString()}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow border">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Customers</p>
              <h3 className="text-3xl font-black text-gray-800">{customers.length}</h3>
              <p className="text-[10px] text-red-500 font-bold mt-1">{customers.filter(c=>c.balance>0).length} with outstanding</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-white p-4 rounded-2xl border shadow">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Daily Report</p>
                <div className="flex gap-2">
                  <input type="date" className="flex-1 p-2.5 rounded-xl border font-bold text-sm"
                    value={dailyDate} onChange={e => setDailyDate(e.target.value)}/>
                  <button className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-[10px]">
                    <FileText size={15}/>
                  </button>
                </div>
              </div>
              <button onClick={syncFromInvoices} disabled={syncing}
                className="bg-amber-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                {syncing ? <Loader2 className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
                Sync Invoices → Ledger
              </button>
              <button onClick={exportExcel}
                className="bg-slate-800 text-white py-3 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                <Download size={14}/> Export Excel
              </button>
            </div>
          </div>
        )}

        {/* ── CUSTOMER SELECT + ACTIONS ── */}
        <div className="bg-white p-5 rounded-2xl shadow border mb-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">Customer</label>
            <select className="w-full p-3.5 bg-gray-50 rounded-xl font-bold text-sm outline-none"
              value={selectedCustId} onChange={e => setSelectedCustId(e.target.value)}>
              <option value="ALL">--- ALL CUSTOMERS (Market Summary) ---</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `— LKR ${c.balance.toLocaleString()} OWED` : '— Cleared'}
                </option>
              ))}
            </select>
          </div>
          {selectedCustId !== 'ALL' && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowPayForm(true)}
                className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                <PlusCircle size={15}/> Record Payment
              </button>
              <button onClick={syncFromInvoices} disabled={syncing}
                className="bg-amber-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 disabled:opacity-50">
                {syncing ? <Loader2 className="animate-spin" size={14}/> : <RefreshCw size={14}/>} Sync
              </button>
              <Link to="/finance/payment-router"
                className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                <ExternalLink size={15}/> Payment Router
              </Link>
              <button onClick={exportPDF}
                className="bg-slate-700 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                <Download size={15}/> PDF
              </button>
            </div>
          )}
        </div>

        {/* ── CUSTOMER BALANCE BANNER ── */}
        {selectedCustId !== 'ALL' && selectedCust && (
          <div className={`p-4 rounded-2xl mb-4 flex items-center justify-between ${selectedCust.balance > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-500">{selectedCust.name}</p>
              <p className={`text-2xl font-black ${selectedCust.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {selectedCust.balance > 0 ? `LKR ${selectedCust.balance.toLocaleString()} OUTSTANDING` : '✅ All Cleared'}
              </p>
            </div>
            {selectedCust.balance > 0 && <AlertCircle className="text-red-400" size={28}/>}
            {selectedCust.balance <= 0 && <CheckCircle className="text-green-400" size={28}/>}
          </div>
        )}

        {/* ── PAYMENT FORM ── */}
        {showPayForm && selectedCustId !== 'ALL' && (
          <div className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-2xl mb-5">
            <h3 className="text-sm font-black uppercase text-emerald-800 mb-4">💳 Record Payment</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-black text-gray-500 block mb-1">Amount (LKR) *</label>
                <input type="number" className="w-full p-3 rounded-xl border font-bold"
                  value={payForm.amount||''} onChange={e => setPayForm({...payForm, amount: parseFloat(e.target.value)||0})}/>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 block mb-1">Date</label>
                <input type="date" className="w-full p-3 rounded-xl border font-bold"
                  value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 block mb-1">Method</label>
                <select className="w-full p-3 rounded-xl border font-bold"
                  value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value as any})}>
                  <option value="CASH">💵 CASH</option>
                  <option value="CHEQUE">🏦 CHEQUE</option>
                  <option value="BANK">🔁 BANK TRANSFER</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 block mb-1">
                  {payForm.method === 'CHEQUE' ? 'Cheque No *' : 'Reference'}
                </label>
                <input type="text" className="w-full p-3 rounded-xl border font-bold"
                  placeholder={payForm.method === 'CASH' ? 'Optional' : 'Required'}
                  value={payForm.reference} onChange={e => setPayForm({...payForm, reference: e.target.value})}/>
              </div>
              {payForm.method === 'CHEQUE' && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 block mb-1">Cheque Bank</label>
                    <input type="text" placeholder="Bank name" className="w-full p-3 rounded-xl border font-bold"
                      value={payForm.chequeBank} onChange={e => setPayForm({...payForm, chequeBank: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 block mb-1">Post / Deposit Date</label>
                    <input type="date" className="w-full p-3 rounded-xl border font-bold"
                      value={payForm.postDate} onChange={e => setPayForm({...payForm, postDate: e.target.value})}/>
                  </div>
                </>
              )}
            </div>
            {payForm.method === 'CHEQUE' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-[11px] font-bold text-amber-700">
                ⏳ Cheque will show as <strong>PENDING</strong> until you mark it as Cleared or Returned
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleSavePayment} disabled={savingPay}
                className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase disabled:opacity-50 flex items-center gap-2">
                {savingPay && <Loader2 className="animate-spin" size={13}/>} Save Payment
              </button>
              <button onClick={() => setShowPayForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-black text-xs uppercase">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── LEDGER TABLE ── */}
        <div className="bg-white rounded-2xl shadow border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-900 text-white">
                {selectedCustId === 'ALL' ? (
                  <>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest">Customer</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Outstanding</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                    <th className="p-4 w-8"></th>
                  </>
                ) : (
                  <>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest">Date</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest">Type / Ref</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest">Description</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Debit (නය)</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Credit (ගෙවීම)</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Balance</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="p-16 text-center font-black text-gray-300 italic">
                  <Loader2 className="animate-spin inline mr-2"/>Loading...
                </td></tr>
              ) : selectedCustId === 'ALL' ? (
                customers.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50 cursor-pointer transition" onClick={() => setSelectedCustId(c.id)}>
                    <td className="p-4 font-black text-gray-800 uppercase text-sm">{c.name}</td>
                    <td className={`p-4 text-right font-black text-lg font-mono ${c.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      LKR {c.balance > 0 ? c.balance.toLocaleString() : '0'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${c.balance > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {c.balance > 0 ? 'OWED' : 'Cleared'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300"><ChevronRight size={16}/></td>
                  </tr>
                ))
              ) : (
                ledger.map(entry => {
                  // Pending/returned cheques don't affect real balance
                  const effectiveCredit = (entry.status === 'Pending' || entry.status === 'Returned') ? 0 : entry.credit;
                  runBal += entry.debit - effectiveCredit;
                  const isPendingCheque = entry.type === 'Payment' && entry.status === 'Pending';
                  return (
                    <tr key={entry.id} className={`transition border-b border-gray-50 ${isPendingCheque ? 'bg-amber-50/50' : 'hover:bg-gray-50'}`}>
                      <td className="p-4 text-xs font-black text-gray-400 uppercase">
                        {new Date(entry.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-black text-gray-700">{entry.reference || '-'}</div>
                      </td>
                      <td className="p-4 text-xs text-gray-600 max-w-[200px] truncate">{entry.description || '-'}</td>
                      <td className="p-4 text-right font-mono font-bold text-red-600">
                        {entry.debit > 0 ? `LKR ${entry.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className={`p-4 text-right font-mono font-bold ${entry.status === 'Pending' ? 'text-amber-400' : entry.status === 'Returned' ? 'text-red-300 line-through' : 'text-green-600'}`}>
                        {entry.credit > 0 ? `LKR ${entry.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className={`p-4 text-right font-black font-mono text-base ${runBal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        LKR {runBal.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={entry.status} type={entry.type}/>
                      </td>
                      <td className="p-4 text-center">
                        {isPendingCheque && (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => handleChequeAction(entry, 'clear')}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[9px] font-black uppercase hover:bg-green-200">
                              ✅ Clear
                            </button>
                            <button onClick={() => handleChequeAction(entry, 'return')}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase hover:bg-red-200">
                              ❌ Return
                            </button>
                          </div>
                        )}
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
}

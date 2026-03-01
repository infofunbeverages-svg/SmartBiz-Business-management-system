import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { Link } from 'react-router-dom';
import { Download, Wallet, TrendingUp, Loader2, RefreshCw, PlusCircle, FileText, ExternalLink } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LedgerEntry {
  id?: string;
  transaction_id?: string;
  date: string;
  type: string;
  reference: string;
  description?: string;
  debit: number;
  credit: number;
}

const CustomerLedger = () => {
  const { company } = useCompany();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: 'CASH' as 'CASH' | 'CHEQUE' | 'BANK',
    reference: '',
  });
  const [dailyReportDate, setDailyReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (company) fetchCustomers();
  }, [company]);

  const fetchCustomers = async () => {
    if (!company?.id) return;
    const { data: custData } = await supabase
      .from('customers')
      .select('id, full_name, name')
      .eq('company_id', company.id)
      .order('full_name');
    const list = custData || [];
    const customerIds = list.map((c: any) => c.id);
    if (customerIds.length === 0) {
      setCustomers(list.map((c: any) => ({ ...c, name: c.full_name || c.name || '', balance: 0 })));
      return;
    }
    const { data: ledgerRows } = await supabase
      .from('customer_ledger')
      .select('customer_id, debit, credit')
      .in('customer_id', customerIds);
    const balanceByCustomer: Record<string, number> = {};
    customerIds.forEach((id: string) => { balanceByCustomer[id] = 0; });
    (ledgerRows || []).forEach((row: any) => {
      const id = row.customer_id;
      if (id in balanceByCustomer) balanceByCustomer[id] += Number(row.debit || 0) - Number(row.credit || 0);
    });
    setCustomers(
      list.map((c: any) => ({
        ...c,
        name: c.full_name || c.name || '',
        balance: balanceByCustomer[c.id] ?? 0,
      }))
    );
  };

  useEffect(() => {
    if (selectedCustomerId !== 'ALL') {
      fetchLedger();
    } else {
      setLedgerData([]);
    }
  }, [selectedCustomerId]);

  const fetchLedger = async () => {
    if (selectedCustomerId === 'ALL') return;
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

  const syncLedgerFromInvoices = async () => {
    if (!company?.id) return alert('Company not loaded.');
    setSyncing(true);
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_no, customer_id, total_amount, created_at')
        .eq('company_id', company.id);
      const { data: existingLedger } = await supabase
        .from('customer_ledger')
        .select('reference, customer_id')
        .eq('type', 'Invoice');
      const existingSet = new Set(
        (existingLedger || []).map((e: any) => `${e.customer_id}:${e.reference}`)
      );
      let added = 0;
      for (const inv of invoices || []) {
        const key = `${inv.customer_id}:${inv.invoice_no}`;
        if (existingSet.has(key)) continue;
        const invDate = (inv.created_at || '').split('T')[0];
        const { error } = await supabase.from('customer_ledger').insert([
          {
            customer_id: inv.customer_id,
            date: invDate,
            type: 'Invoice',
            reference: inv.invoice_no,
            description: `Invoice ${inv.invoice_no} | ${invDate} | LKR ${Number(inv.total_amount || 0).toLocaleString()}`,
            debit: Number(inv.total_amount || 0),
            credit: 0,
            status: 'Open',
          },
        ]);
        if (!error) {
          added++;
          existingSet.add(key);
        }
      }
      alert(added > 0 ? `Ledger updated: ${added} invoice(s) added.` : 'Ledger already up to date.');
      await fetchCustomers();
      if (selectedCustomerId !== 'ALL') fetchLedger();
    } catch (e: any) {
      alert('Sync error: ' + (e?.message || e));
    } finally {
      setSyncing(false);
    }
  };

  const handleSavePayment = async () => {
    if (!selectedCustomerId || selectedCustomerId === 'ALL') return alert('Select a customer first.');
    if (!paymentForm.amount || paymentForm.amount <= 0) return alert('Enter amount.');
    if (paymentForm.method === 'CHEQUE' && !paymentForm.reference.trim()) return alert('Cheque number required.');
    setSavingPayment(true);
    try {
      const refNo =
        paymentForm.method === 'CASH'
          ? `CASH-${Date.now().toString().slice(-6)}`
          : paymentForm.reference.trim() || `PAY-${Date.now().toString().slice(-6)}`;
      const payPayload: any = {
        customer_id: selectedCustomerId,
        amount: paymentForm.amount,
        payment_method: paymentForm.method,
        reference_no: refNo,
        status: paymentForm.method === 'CHEQUE' ? 'Pending' : 'Cleared',
      };
      const { data: payment, error: pErr } = await supabase
        .from('customer_payments')
        .insert([payPayload])
        .select()
        .single();
      if (pErr) throw pErr;
      const ledgerPayload: any = {
        customer_id: selectedCustomerId,
        date: paymentForm.date,
        type: 'Payment',
        reference: refNo,
        description: `Payment ${paymentForm.method} - ${refNo}`,
        debit: 0,
        credit: paymentForm.amount,
        status: paymentForm.method === 'CHEQUE' ? 'Pending' : 'Cleared',
      };
      if (payment?.id) ledgerPayload.payment_id = payment.id;
      const { error: lErr } = await supabase.from('customer_ledger').insert([ledgerPayload]);
      if (lErr) throw lErr;
      alert('Payment recorded.');
      setShowPaymentForm(false);
      setPaymentForm({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'CASH', reference: '' });
      await fetchCustomers();
      fetchLedger();
    } catch (e: any) {
      alert('Error: ' + (e?.message || e));
    } finally {
      setSavingPayment(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      customers.map((c) => ({
        'Customer Name': c.name,
        'Outstanding Balance': c.balance,
        Status: c.balance > 0 ? 'Owed' : 'Cleared',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MarketSummary');
    XLSX.writeFile(wb, `Market_Summary_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportToPDF = () => {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const doc = new jsPDF() as any;
    doc.setFontSize(18);
    doc.text('CUSTOMER STATEMENT', 14, 20);
    doc.setFontSize(10);
    doc.text(`Customer: ${customer?.name}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 35);
    let runningBal = 0;
    const tableData = ledgerData.map((entry) => {
      runningBal += entry.debit - entry.credit;
      return [
        new Date(entry.date).toLocaleDateString(),
        entry.type.toUpperCase(),
        entry.reference || '-',
        entry.debit.toLocaleString(),
        entry.credit.toLocaleString(),
        runningBal.toLocaleString(),
      ];
    });
    doc.autoTable({
      startY: 45,
      head: [['Date', 'Type', 'Reference', 'Debit (+)', 'Credit (-)', 'Balance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55] },
    });
    doc.save(`Statement_${customer?.name}.pdf`);
  };

  const downloadDailyReport = async () => {
    if (!company?.id || customers.length === 0) return;
    const customerIds = customers.map((c) => c.id);
    const { data: entries } = await supabase
      .from('customer_ledger')
      .select('*')
      .eq('date', dailyReportDate)
      .in('customer_id', customerIds)
      .order('date', { ascending: true });
    const nameMap: Record<string, string> = {};
    customers.forEach((c) => { nameMap[c.id] = c.name; });
    const tableData = (entries || []).map((e: any) => [
      nameMap[e.customer_id] || e.customer_id,
      e.type || '-',
      e.reference || '-',
      (e.description || '').slice(0, 40),
      Number(e.debit || 0).toLocaleString(),
      Number(e.credit || 0).toLocaleString(),
    ]);
    const doc = new jsPDF() as any;
    doc.setFontSize(18);
    doc.text('DAILY REPORT', 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${dailyReportDate}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
    if (tableData.length === 0) {
      doc.text('No ledger entries for this date.', 14, 45);
    } else {
      doc.autoTable({
        startY: 42,
        head: [['Customer', 'Type', 'Reference', 'Description', 'Debit', 'Credit']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] },
        margin: { left: 14 },
      });
    }
    doc.save(`Daily_Report_${dailyReportDate}.pdf`);
  };

  const totalMarketOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  let runningBalance = 0;

  if (!company) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen text-gray-500 font-bold">
        <Loader2 className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-gray-800 uppercase italic">
          <Wallet className="text-blue-600" size={32} />
          Customer <span className="text-blue-600">Ledger</span>
        </h2>

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
            <div className="flex flex-col gap-2">
              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Daily Report</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="flex-1 p-3 rounded-xl font-bold border border-slate-200 text-sm"
                    value={dailyReportDate}
                    onChange={(e) => setDailyReportDate(e.target.value)}
                  />
                  <button
                    onClick={downloadDailyReport}
                    className="bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-blue-700"
                  >
                    <FileText size={16} /> Download
                  </button>
                </div>
              </div>
              <Link
                to="/finance/payment-router"
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg"
              >
                <ExternalLink size={16} /> Payment Router (Update payments)
              </Link>
              <button
                onClick={syncLedgerFromInvoices}
                disabled={syncing}
                className="w-full bg-amber-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-700 transition shadow-lg disabled:opacity-50"
              >
                {syncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                Sync Ledger from Invoices
              </button>
              <button
                onClick={exportToExcel}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg"
              >
                <Download size={16} /> Export Excel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-[2rem] shadow-xl mb-8 flex flex-wrap gap-4 items-end border border-white">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Filter By Customer</label>
            <select
              className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-black text-gray-700"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="ALL">--- VIEW ALL CUSTOMERS (MARKET SUMMARY) ---</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (LKR {c.balance?.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
          {selectedCustomerId !== 'ALL' && (
            <>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition font-black text-[10px] uppercase tracking-widest shadow-lg"
              >
                <PlusCircle size={18} /> Record Payment
              </button>
              <button
                onClick={syncLedgerFromInvoices}
                disabled={syncing}
                className="bg-amber-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-amber-700 font-black text-[10px] uppercase shadow-lg disabled:opacity-50"
              >
                {syncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} Sync from Invoices
              </button>
              <Link
                to="/finance/payment-router"
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition font-black text-[10px] uppercase tracking-widest shadow-lg"
              >
                <ExternalLink size={18} /> Payment Router (Update payments)
              </Link>
              <button
                onClick={exportToPDF}
                className="bg-slate-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-slate-700 font-black text-[10px] uppercase shadow-lg"
              >
                <Download size={18} /> Statement PDF
              </button>
            </>
          )}
        </div>

        {selectedCustomerId !== 'ALL' && showPaymentForm && (
          <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-2xl mb-8">
            <h3 className="text-sm font-black uppercase text-emerald-800 mb-4">Record Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-emerald-700 block mb-1">Amount (LKR)</label>
                <input
                  type="number"
                  className="w-full p-3 rounded-xl font-bold border border-emerald-200"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-emerald-700 block mb-1">Date</label>
                <input
                  type="date"
                  className="w-full p-3 rounded-xl font-bold border border-emerald-200"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-emerald-700 block mb-1">Method</label>
                <select
                  className="w-full p-3 rounded-xl font-bold border border-emerald-200"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                >
                  <option value="CASH">CASH</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="BANK">BANK</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-emerald-700 block mb-1">Reference / Chq No</label>
                <input
                  type="text"
                  placeholder={paymentForm.method === 'CASH' ? 'Optional' : 'Required for Cheque'}
                  className="w-full p-3 rounded-xl font-bold border border-emerald-200"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSavePayment}
                disabled={savingPayment}
                className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase disabled:opacity-50"
              >
                {savingPayment ? <Loader2 className="animate-spin inline mr-2" size={14} /> : null}
                Save Payment
              </button>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-black text-xs uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
                <tr>
                  <td colSpan={6} className="p-20 text-center font-black text-gray-400 italic">
                    <Loader2 className="animate-spin inline mr-2" /> FETCHING DATA...
                  </td>
                </tr>
              ) : selectedCustomerId === 'ALL' ? (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-blue-50/50 transition cursor-pointer"
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    <td className="p-6 font-black text-gray-800 text-sm uppercase italic">{c.name}</td>
                    <td className="p-6 text-right font-mono font-black text-lg text-gray-800">LKR {c.balance?.toLocaleString()}</td>
                    <td className="p-6 text-center">
                      <span
                        className={`px-4 py-1 rounded-full text-[9px] font-black uppercase italic ${
                          c.balance > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}
                      >
                        {c.balance > 0 ? 'Owed' : 'Cleared'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                ledgerData.map((entry) => {
                  runningBalance += entry.debit - entry.credit;
                  return (
                    <tr
                      key={entry.id || entry.transaction_id || entry.reference + entry.date}
                      className="hover:bg-gray-50 transition border-b border-gray-50 last:border-none"
                    >
                      <td className="p-6 text-xs font-black text-gray-400 uppercase italic">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="p-6 text-center">
                        <span
                          className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest italic ${
                            entry.type === 'Invoice' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {entry.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-6 text-xs font-black text-gray-700 uppercase tracking-tight">
                        {entry.description || entry.reference}
                      </td>
                      <td className="p-6 text-right text-red-600 font-mono font-bold">
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </td>
                      <td className="p-6 text-right text-green-600 font-mono font-bold">
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </td>
                      <td
                        className={`p-6 text-right font-black font-mono text-lg ${
                          runningBalance > 0 ? 'text-blue-700 bg-blue-50' : 'text-gray-800'
                        }`}
                      >
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

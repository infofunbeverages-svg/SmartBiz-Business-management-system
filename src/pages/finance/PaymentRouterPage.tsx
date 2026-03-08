import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient'; 
import { ArrowRightLeft, Loader2, Pencil, X } from 'lucide-react';

const PaymentRouterPage = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  
  const bankAccounts = [
    { name: 'HNB Main', acc: '80012345' },
    { name: 'Sampath Business', acc: '4009876' },
    { name: 'BOC Corporate', acc: '7001234' },
    { name: 'Commercial Bank', acc: '5006789' },
    { name: 'Peoples Bank', acc: '11223344' }
  ];

  const [customerId, setCustomerId] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'CHEQUE' | 'BANK'>('CASH');
  
  const [bankInfo, setBankInfo] = useState({ 
    refNo: '', 
    account: bankAccounts[0].name, 
    date: new Date().toISOString().split('T')[0],
    narration: ''
  });

  const [cashInfo, setCashInfo] = useState({
    destination: 'Office' as 'Office' | 'Lorry' | 'Driver' | 'Other',
    narration: ''
  });

  const [chequeInfo, setChequeInfo] = useState({
    number: '',
    bankName: '',
    depositBank: '',
    chequeDate: '',
    postDate: '',
    narration: ''
  });

  const [splits, setSplits] = useState([
    { category: 'Transport Hire', amount: 0 },
    { category: 'Raw Materials', amount: 0 },
    { category: 'Empty Bottles', amount: 0 },
    { category: 'Filling Charges', amount: 0 },
    { category: 'Other Expenses', amount: 0 }
  ]);

  // Refs for Auto-Focus
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchCustomers(); fetchRecentPayments(); }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('full_name');
    if (data) setCustomers(data);
  };

  const fetchRecentPayments = async () => {
    const { data } = await supabase
      .from('customer_payments')
      .select('*, customers(full_name)')
      .order('created_at', { ascending: false })
      .limit(40);
    setRecentPayments(data || []);
  };

  const loadPaymentForEdit = (p: any) => {
    setEditingPaymentId(p.id);
    setCustomerId(p.customer_id);
    setTotalAmount(p.amount);
    const method = (p.payment_method || 'CASH').toUpperCase();
    setPayMethod(method === 'CHEQUE' ? 'CHEQUE' : method === 'BANK' ? 'BANK' : 'CASH');
    setBankInfo({
      refNo: p.reference_no && p.payment_method === 'BANK' ? p.reference_no : '',
      account: p.bank_name || bankAccounts[0].name,
      date: (p.cheque_date || new Date().toISOString().split('T')[0]).toString().slice(0, 10),
      narration: p.narration || '',
    });
    setCashInfo({ destination: (p.cash_destination as any) || 'Office', narration: p.narration || '' });
    setChequeInfo({
      number: p.payment_method === 'CHEQUE' ? (p.reference_no || '') : '',
      bankName: p.bank_name || '',
      depositBank: p.deposit_bank || '',
      chequeDate: (p.cheque_date || '').toString().slice(0, 10),
      postDate: (p.post_date || p.cheque_date || '').toString().slice(0, 10),
      narration: p.narration || '',
    });
  };

  const cancelEdit = () => {
    setEditingPaymentId(null);
    setCustomerId('');
    setTotalAmount(0);
    setPayMethod('CASH');
    setBankInfo({ refNo: '', account: bankAccounts[0].name, date: new Date().toISOString().split('T')[0], narration: '' });
    setCashInfo({ destination: 'Office', narration: '' });
    setChequeInfo({ number: '', bankName: '', depositBank: '', chequeDate: '', postDate: '', narration: '' });
  };

  const handleSaveAll = async () => {
    if (!customerId || totalAmount <= 0) return alert("කරුණාකර විස්තර සම්පූර්ණ කරන්න!");
    if (payMethod === 'CHEQUE' && !chequeInfo.number) return alert("Cheque number required!");
    setLoading(true);

    try {
      let desc = `Payment via ${payMethod}. `;
      let refNo = 'CASH-PAY';

      if (payMethod === 'CASH') {
        desc += `→ ${cashInfo.destination}. ${cashInfo.narration ? `| ${cashInfo.narration}` : ''}`;
      } else if (payMethod === 'BANK') {
        refNo = bankInfo.refNo || `BANK-${Date.now().toString().slice(-6)}`;
        desc += `Bank: ${bankInfo.account} | Ref: ${refNo} | Date: ${bankInfo.date}. ${bankInfo.narration ? `| ${bankInfo.narration}` : ''}`;
      } else if (payMethod === 'CHEQUE') {
        refNo = chequeInfo.number;
        const postDate = chequeInfo.postDate || chequeInfo.chequeDate;
        desc += `Chq No: ${chequeInfo.number} | Bank: ${chequeInfo.bankName} | Deposit: ${chequeInfo.depositBank || '-'} | Post Date: ${postDate || '-'}. ${chequeInfo.narration ? `| ${chequeInfo.narration}` : ''}`;
      }

      const payPayload: any = {
        customer_id: customerId,
        amount: totalAmount,
        payment_method: payMethod,
        reference_no: refNo,
        bank_name: payMethod === 'BANK' ? bankInfo.account : (payMethod === 'CHEQUE' ? chequeInfo.bankName : null),
        cheque_date: payMethod === 'CHEQUE' ? (chequeInfo.postDate || chequeInfo.chequeDate) || null : null,
        status: payMethod === 'CHEQUE' ? 'Pending' : 'Cleared',
        narration: payMethod === 'CASH' ? cashInfo.narration : (payMethod === 'BANK' ? bankInfo.narration : chequeInfo.narration),
        cash_destination: payMethod === 'CASH' ? cashInfo.destination : null,
        deposit_bank: payMethod === 'CHEQUE' ? chequeInfo.depositBank || null : null,
        post_date: payMethod === 'CHEQUE' && chequeInfo.postDate ? chequeInfo.postDate : null,
      };

      const ledgerDate = new Date().toISOString().split('T')[0];

      if (editingPaymentId) {
        const { error: uErr } = await supabase
          .from('customer_payments')
          .update(payPayload)
          .eq('id', editingPaymentId);
        if (uErr) throw uErr;

        const { error: lErr } = await supabase
          .from('customer_ledger')
          .update({
            date: ledgerDate,
            description: desc,
            reference: refNo,
            credit: totalAmount,
            status: payMethod === 'CHEQUE' ? 'Pending' : 'Cleared',
          })
          .eq('payment_id', editingPaymentId);
        if (lErr) throw lErr;

        alert("Payment updated!");
        cancelEdit();
        fetchRecentPayments();
      } else {
        const { data: payment, error: pError } = await supabase
          .from('customer_payments')
          .insert([payPayload])
          .select().single();
        if (pError) throw pError;

        const ledgerPayload: any = {
          customer_id: customerId,
          date: ledgerDate,
          description: desc,
          type: 'Payment',
          reference: refNo,
          debit: 0,
          credit: totalAmount,
          status: payMethod === 'CHEQUE' ? 'Pending' : 'Cleared',
        };
        if (payment?.id) ledgerPayload.payment_id = payment.id;

        const { error: lError } = await supabase.from('customer_ledger').insert([ledgerPayload]);
        if (lError) throw lError;

        alert("සාර්ථකයි!");
        cancelEdit();
        fetchRecentPayments();
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 lg:p-6 bg-slate-50 min-h-screen font-sans pb-24 lg:pb-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black uppercase text-slate-800 flex items-center gap-3 mb-8 italic">
          <ArrowRightLeft className="text-blue-600" size={32} />
          Payment <span className="text-blue-600">Router</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl lg:rounded-[2.5rem] shadow-xl border border-white">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block">1. Source & Method</label>
              
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none mb-4 border-none"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>

              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                {['CASH', 'CHEQUE', 'BANK'].map((m: any) => (
                  <button 
                    key={m} 
                    onClick={() => setPayMethod(m)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${payMethod === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* 💵 Cash Fields - Office/Lorry/Driver/Narration */}
              {payMethod === 'CASH' && (
                <div className="mt-4 space-y-3 p-4 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <label className="text-[9px] font-black uppercase text-slate-500 block">ගෙන් ගත් මුදල කොහෙද දාන්නේ?</label>
                  <div className="flex gap-1 p-1 bg-white rounded-xl">
                    {(['Office', 'Lorry', 'Driver', 'Other'] as const).map(d => (
                      <button key={d} type="button" onClick={() => setCashInfo({...cashInfo, destination: d})}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase ${cashInfo.destination === d ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>
                        {d === 'Office' ? 'Office' : d === 'Lorry' ? 'Lorry' : d === 'Driver' ? 'Driver' : 'Other'}
                      </button>
                    ))}
                  </div>
                  <input placeholder="Narration / Slip details (optional)" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={cashInfo.narration} onChange={e => setCashInfo({...cashInfo, narration: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && amountRef.current?.focus()}/>
                </div>
              )}

              {/* 🏦 Bank Fields */}
              {payMethod === 'BANK' && (
                <div className="mt-4 space-y-3 p-4 bg-blue-50 rounded-3xl border border-blue-100">
                  <select className="w-full p-3 bg-white rounded-xl text-xs font-bold outline-none" value={bankInfo.account} onChange={e => setBankInfo({...bankInfo, account: e.target.value})}>
                    {bankAccounts.map((acc, idx) => <option key={idx} value={acc.name}>{acc.name}</option>)}
                  </select>
                  <input ref={ref1} placeholder="Ref / Slip No" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={bankInfo.refNo} onChange={e => setBankInfo({...bankInfo, refNo: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && ref2.current?.focus()}/>
                  <input ref={ref2} type="date" placeholder="Date" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={bankInfo.date} onChange={e => setBankInfo({...bankInfo, date: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && amountRef.current?.focus()}/>
                  <input placeholder="Narration / Slip details (optional)" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={bankInfo.narration} onChange={e => setBankInfo({...bankInfo, narration: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && amountRef.current?.focus()}/>
                </div>
              )}

              {/* 🎫 Cheque Fields - Chq No, Bank, Deposit Bank, Post Date */}
              {payMethod === 'CHEQUE' && (
                <div className="mt-4 space-y-3 p-4 bg-orange-50 rounded-3xl border border-orange-100">
                  <input placeholder="Cheque Number *" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={chequeInfo.number} onChange={e => setChequeInfo({...chequeInfo, number: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && ref1.current?.focus()}/>
                  <input ref={ref1} placeholder="Issuing Bank" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={chequeInfo.bankName} onChange={e => setChequeInfo({...chequeInfo, bankName: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && ref2.current?.focus()}/>
                  <input ref={ref2} placeholder="Deposit Bank (api deposit karana bank)" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={chequeInfo.depositBank} onChange={e => setChequeInfo({...chequeInfo, depositBank: e.target.value})}/>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black uppercase text-orange-600 block mb-1">Cheque Date</label>
                      <input type="date" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={chequeInfo.chequeDate} onChange={e => setChequeInfo({...chequeInfo, chequeDate: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && amountRef.current?.focus()}/>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-orange-600 block mb-1">Post Date (awama)</label>
                      <input type="date" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={chequeInfo.postDate} onChange={e => setChequeInfo({...chequeInfo, postDate: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && amountRef.current?.focus()}/>
                    </div>
                  </div>
                  <input placeholder="Narration (optional)" className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={chequeInfo.narration} onChange={e => setChequeInfo({...chequeInfo, narration: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && amountRef.current?.focus()}/>
                </div>
              )}
            </div>

            <div className="bg-blue-600 p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-xl text-white">
              <label className="text-[10px] font-black uppercase mb-2 block">Amount Received</label>
              <input ref={amountRef} type="number" className="w-full bg-transparent border-none text-3xl lg:text-4xl font-black outline-none placeholder:text-blue-300" placeholder="0.00" value={totalAmount || ''} onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[3rem] shadow-xl">
            <h3 className="text-sm font-black uppercase mb-4 italic flex items-center gap-2">
              <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div> Expense Distribution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {splits.map((s, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">{s.category}</label>
                  <input type="number" className="w-full bg-transparent border-none text-xl font-black outline-none" value={s.amount || ''} onChange={(e) => {
                    const newSplits = [...splits];
                    newSplits[i].amount = parseFloat(e.target.value) || 0;
                    setSplits(newSplits);
                  }} />
                </div>
              ))}
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 text-white flex flex-wrap justify-between items-center mt-4 gap-3 shadow-2xl">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Net Cash to Office</p>
                <h4 className="text-2xl lg:text-4xl font-black italic text-green-400">LKR {(totalAmount - splits.reduce((a, b) => a + b.amount, 0)).toLocaleString()}</h4>
              </div>
              <div className="flex gap-2">
                {editingPaymentId && (
                  <button onClick={cancelEdit} className="bg-slate-600 hover:bg-slate-500 px-6 py-5 rounded-2xl font-black uppercase italic transition-all">
                    <X size={18} className="inline mr-1" /> Cancel
                  </button>
                )}
                <button onClick={handleSaveAll} disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-10 py-5 rounded-2xl font-black uppercase italic transition-all disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" /> : editingPaymentId ? 'Update Payment' : 'Complete Routing'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[3rem] shadow-xl border border-slate-100">
          <h3 className="text-lg font-black uppercase mb-6 text-slate-800 italic flex items-center gap-2">
            Recent Payments <span className="text-[10px] font-normal text-slate-400">(Edit කරන්න ඕනෙ payment එක Edit බොත්තම් එක ක්ලික් කරන්න)</span>
          </h3>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-2">
            {recentPayments.map((p) => (
              <div key={p.id} className={`rounded-2xl px-3 py-2.5 border ${editingPaymentId===p.id?'bg-blue-50 border-blue-200':'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-800 text-sm truncate">{p.customers?.full_name || '-'}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] font-black">{p.payment_method || '-'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${p.status==='Cleared'?'bg-green-100 text-green-700':p.status==='Returned'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                      <span className="text-[9px] text-slate-400">{(p.cheque_date||p.created_at||'').toString().slice(0,10)}</span>
                    </div>
                    <p className="font-mono text-[9px] text-slate-400">{p.reference_no||'-'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-blue-600 text-sm">LKR {Number(p.amount||0).toLocaleString()}</p>
                    <button onClick={() => loadPaymentForEdit(p)}
                      className="mt-1 inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg text-[10px] font-black">
                      <Pencil size={12}/> Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-4 rounded-tl-xl">Customer</th><th className="p-4">Date</th>
                  <th className="p-4">Method</th><th className="p-4">Reference</th>
                  <th className="p-4 text-right">Amount</th><th className="p-4 text-center">Status</th>
                  <th className="p-4 rounded-tr-xl text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50 ${editingPaymentId===p.id?'bg-blue-50':''}`}>
                    <td className="p-4 font-bold text-slate-700">{p.customers?.full_name||'-'}</td>
                    <td className="p-4 text-slate-600">{(p.cheque_date||p.created_at||'').toString().slice(0,10)}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black">{p.payment_method||'-'}</span></td>
                    <td className="p-4 font-mono text-xs">{p.reference_no||'-'}</td>
                    <td className="p-4 text-right font-black text-blue-600">LKR {Number(p.amount||0).toLocaleString()}</td>
                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-[9px] font-black ${p.status==='Cleared'?'bg-green-100 text-green-700':p.status==='Returned'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{p.status}</span></td>
                    <td className="p-4 text-center"><button onClick={() => loadPaymentForEdit(p)} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-[10px] font-black hover:bg-blue-200"><Pencil size={14}/> Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRouterPage;
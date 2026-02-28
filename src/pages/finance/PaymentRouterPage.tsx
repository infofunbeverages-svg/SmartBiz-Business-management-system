import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient'; 
import { ArrowRightLeft, Building2, Ticket, Loader2 } from 'lucide-react';

const PaymentRouterPage = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
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

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('full_name');
    if (data) setCustomers(data);
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

      const { data: payment, error: pError } = await supabase
        .from('customer_payments')
        .insert([payPayload])
        .select().single();

      if (pError) throw pError;

      const ledgerPayload: any = {
        customer_id: customerId,
        date: new Date().toISOString().split('T')[0],
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
      window.location.reload();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black uppercase text-slate-800 flex items-center gap-3 mb-8 italic">
          <ArrowRightLeft className="text-blue-600" size={32} />
          Payment <span className="text-blue-600">Router</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white">
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

            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white">
              <label className="text-[10px] font-black uppercase mb-2 block">Amount Received</label>
              <input ref={amountRef} type="number" className="w-full bg-transparent border-none text-4xl font-black outline-none placeholder:text-blue-300" placeholder="0.00" value={totalAmount || ''} onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-xl">
            <h3 className="text-sm font-black uppercase mb-8 italic flex items-center gap-2">
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

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex justify-between items-center mt-8 shadow-2xl">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Net Cash to Office</p>
                <h4 className="text-4xl font-black italic text-green-400">LKR {(totalAmount - splits.reduce((a, b) => a + b.amount, 0)).toLocaleString()}</h4>
              </div>
              <button onClick={handleSaveAll} disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-10 py-5 rounded-2xl font-black uppercase italic transition-all disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : 'Complete Routing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRouterPage;
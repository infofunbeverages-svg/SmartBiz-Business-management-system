// PaymentManager.tsx - Logic for Cheque Realization
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { logActivity } from '../../utils/activityLogger';

const PaymentManager = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returningPayment, setReturningPayment] = useState<any>(null);
  const [returnCharges, setReturnCharges] = useState(0);

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customer_payments')
      .select('*, customers(full_name)')
      .order('created_at', { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  const handleClear = async (payment: any) => {
    if (!window.confirm('Cheque passed? Mark as Cleared?')) return;
    try {
      await supabase.from('customer_payments').update({ status: 'Cleared' }).eq('id', payment.id);
      await supabase.from('customer_ledger')
        .update({ status: 'Cleared' })
        .eq('reference', payment.reference_no)
        .eq('customer_id', payment.customer_id)
        .eq('type', 'Payment');
      alert('Payment marked as Cleared!')
      await logActivity({ company_id: company?.id || '', module: 'FINANCE', action: 'PAYMENT_CLEARED', details: {} });
      fetchPayments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openReturnModal = (payment: any) => {
    setReturningPayment(payment);
    setReturnCharges(0);
    setShowReturnModal(true);
  };

  const handleReturn = async () => {
    if (!returningPayment) return;
    try {
      await supabase.from('customer_payments').update({ status: 'Returned' }).eq('id', returningPayment.id);
      await supabase.from('customer_ledger')
        .update({ status: 'Returned' })
        .eq('reference', returningPayment.reference_no)
        .eq('customer_id', returningPayment.customer_id)
        .eq('type', 'Payment');

      const today = new Date().toISOString().split('T')[0];
      await supabase.from('customer_ledger').insert([{
        customer_id: returningPayment.customer_id,
        date: today,
        type: 'Cheque Return',
        reference: `RET-${returningPayment.reference_no}`,
        description: `Cheque ${returningPayment.reference_no} returned - added to outstanding`,
        debit: returningPayment.amount,
        credit: 0,
        status: 'Cleared',
        payment_id: returningPayment.id
      }]);

      if (returnCharges > 0) {
        await supabase.from('customer_ledger').insert([{
          customer_id: returningPayment.customer_id,
          date: today,
          type: 'Return Charges',
          reference: `RC-${returningPayment.reference_no}`,
          description: `Return charges for Chq ${returningPayment.reference_no}`,
          debit: returnCharges,
          credit: 0,
          status: 'Cleared'
        }]);
      }

      alert('Cheque marked as Returned. Outstanding updated.');
      await logActivity({ company_id: company?.id || '', module: 'FINANCE', action: 'CHEQUE_RETURNED', details: {} });
      setShowReturnModal(false);
      setReturningPayment(null);
      fetchPayments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 bg-white rounded-[2rem] shadow-xl border border-gray-100">
      <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-800 uppercase tracking-tighter italic border-b pb-4">
        <Clock className="text-blue-600" /> Recent Payments & Cheques
      </h3>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-sm truncate">{p.customers?.full_name}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{p.reference_no} · {p.payment_method}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-blue-600 text-sm">LKR {p.amount.toLocaleString()}</p>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                  p.status === 'Cleared' ? 'bg-green-100 text-green-700' : 
                  p.status === 'Returned' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>{p.status}</span>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2">
              {p.status === 'Pending' && p.payment_method === 'CHEQUE' && (
                <button onClick={() => handleClear(p)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-xl text-[10px] font-black active:scale-90">
                  <CheckCircle size={12} /> OK
                </button>
              )}
              {p.status !== 'Returned' && p.payment_method === 'CHEQUE' && (
                <button onClick={() => openReturnModal(p)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-[10px] font-black active:scale-90">
                  <XCircle size={12} /> Return
                </button>
              )}
            </div>
          </div>
        ))}
        {payments.length === 0 && <div className="text-center py-10 text-slate-400 font-bold text-sm">No payments found</div>}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
              <th className="p-4 rounded-l-xl">Customer</th>
              <th className="p-4">Method</th>
              <th className="p-4">Ref/Chq No</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 rounded-r-xl text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                <td className="p-4 font-bold text-gray-700">{p.customers?.full_name}</td>
                <td className="p-4"><span className="p-1 px-3 bg-gray-100 rounded-full text-[10px] font-black">{p.payment_method}</span></td>
                <td className="p-4 font-mono text-sm">{p.reference_no}</td>
                <td className="p-4 text-right font-black text-blue-600">LKR {p.amount.toLocaleString()}</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    p.status === 'Cleared' ? 'bg-green-100 text-green-700' : 
                    p.status === 'Returned' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-4 flex justify-center gap-2">
                  {p.status === 'Pending' && p.payment_method === 'CHEQUE' && (
                    <button onClick={() => handleClear(p)} className="bg-green-600 text-white p-2 px-4 rounded-lg text-[10px] font-black flex items-center gap-1">
                      <CheckCircle size={14} /> OK
                    </button>
                  )}
                  {p.status !== 'Returned' && p.payment_method === 'CHEQUE' && (
                    <button onClick={() => openReturnModal(p)} className="bg-red-100 text-red-600 p-2 px-4 rounded-lg text-[10px] font-black flex items-center gap-1">
                      <XCircle size={14} /> RETURN
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Return Cheque Modal */}
      {showReturnModal && returningPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black uppercase text-red-600 mb-4 flex items-center gap-2">
              <XCircle size={24} /> Cheque Return
            </h3>
            <p className="text-sm font-bold text-slate-600 mb-4">
              Chq No: <span className="font-mono">{returningPayment.reference_no}</span> | LKR {returningPayment.amount?.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mb-4">මෙම payment එක outstanding එකට එකතු වෙයි. Return charges දැම්මොත් එයත් එකතු වෙයි.</p>
            <div className="space-y-3 mb-6">
              <label className="text-[10px] font-black uppercase text-slate-500 block">Return Charges (optional)</label>
              <input type="number" placeholder="0" className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={returnCharges || ''} onChange={e => setReturnCharges(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowReturnModal(false); setReturningPayment(null); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase">
                Cancel
              </button>
              <button onClick={handleReturn} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase">
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManager;
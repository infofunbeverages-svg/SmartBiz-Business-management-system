import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { Banknote, Calculator, UserCheck, Loader2, History, CheckCircle, X, Printer } from 'lucide-react';

export default function PayrollPage() {
  const { company } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [selected,  setSelected]  = useState<any>(null);
  const [tab,       setTab]       = useState<'process'|'history'>('process');
  const [history,   setHistory]   = useState<any[]>([]);

  // Salary inputs
  const [month,       setMonth]      = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  const [units,       setUnits]      = useState(0);
  const [allowance,   setAllowance]  = useState(0);
  const [deduction,   setDeduction]  = useState(0);
  const [advancePaid, setAdvancePaid]= useState(0);
  const [notes,       setNotes]      = useState('');

  useEffect(() => { if (company) fetchEmployees(); }, [company]);
  useEffect(() => { if (tab==='history' && company) fetchHistory(); }, [tab, company]);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*')
      .eq('company_id', company?.id).eq('status','Active').order('name');
    setEmployees(data || []);
    setLoading(false);
  };

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase.from('payroll_logs')
      .select('*, employees(name, designation)')
      .eq('company_id', company?.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setHistory(data || []);
    setLoading(false);
  };

  const pieceEarned  = units * (selected?.piece_rate ?? 0.40);
  const grossSalary  = (selected?.basic_salary || 0) + pieceEarned + allowance;
  const netSalary    = grossSalary - deduction - advancePaid;

  const handleProcess = async () => {
    if (!selected) return alert('කරුණාකර සේවකයෙකු select කරන්න!');
    if (!month)    return alert('Month select කරන්න!');
    if (!confirm(`${selected.name} ගේ ${month} පඩිය LKR ${netSalary.toLocaleString()} approve කරන්නද?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('payroll_logs').insert([{
        company_id:   company?.id,
        employee_id:  selected.id,
        month:        month + '-01',
        basic_salary: selected.basic_salary || 0,
        piece_rate:   selected.piece_rate   || 0.40,
        units_count:  units,
        piece_earned: pieceEarned,
        allowances:   allowance,
        deductions:   deduction,
        advance_paid: advancePaid,
        gross_salary: grossSalary,
        net_salary:   netSalary,
        notes:        notes,
        status:       'PAID'
      }]);
      if (error) throw error;

      alert(`✅ ${selected.name} ගේ ${month} salary process කළා!\nNet: LKR ${netSalary.toLocaleString()}`);
      // reset
      setSelected(null); setUnits(0); setAllowance(0); setDeduction(0); setAdvancePaid(0); setNotes('');
    } catch(e:any) { alert('Error: '+e.message); }
    finally { setSaving(false); }
  };

  const printSlip = (log: any) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Salary Slip</title>
      <style>body{font-family:monospace;padding:20px;max-width:400px;margin:0 auto}
      h2{text-align:center;border-bottom:2px solid #000;padding-bottom:8px}
      .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #ccc}
      .total{font-weight:bold;font-size:1.2em;border-top:2px solid #000;margin-top:8px}
      </style></head><body>
      <h2>SALARY SLIP</h2>
      <p style="text-align:center">${log.employees?.name} | ${log.month?.slice(0,7)}</p>
      <div class="row"><span>Basic Salary</span><span>LKR ${(log.basic_salary||0).toLocaleString()}</span></div>
      <div class="row"><span>Piece Work (${log.units_count} units × ${log.piece_rate})</span><span>LKR ${(log.piece_earned||0).toLocaleString()}</span></div>
      <div class="row"><span>Allowances</span><span>LKR ${(log.allowances||0).toLocaleString()}</span></div>
      <div class="row"><span>Deductions</span><span>- LKR ${(log.deductions||0).toLocaleString()}</span></div>
      <div class="row"><span>Advance Paid</span><span>- LKR ${(log.advance_paid||0).toLocaleString()}</span></div>
      <div class="row total"><span>NET SALARY</span><span>LKR ${(log.net_salary||0).toLocaleString()}</span></div>
      ${log.notes?`<p style="margin-top:12px;font-size:0.85em">Notes: ${log.notes}</p>`:''}
      <p style="text-align:center;margin-top:20px;font-size:0.8em">Status: ${log.status}</p>
      </body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800 flex items-center gap-3">
              <Banknote className="text-green-600" size={32}/>
              Payroll <span className="text-green-600">System</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Monthly Salary & Piece-Rate Processing</p>
          </div>
          <div className="flex gap-2">
            {(['process','history'] as const).map(t => (
              <button key={t} onClick={()=>setTab(t)}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition
                  ${tab===t?'bg-slate-900 text-white':'bg-white text-slate-500 border hover:border-slate-300'}`}>
                {t==='process'?'💰 Process':'📋 History'}
              </button>
            ))}
          </div>
        </div>

        {/* ── PROCESS TAB ── */}
        {tab==='process' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Employee Select */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border">
              <label className="text-[9px] font-black uppercase text-slate-400 mb-3 block tracking-widest">① Select Employee</label>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-200"/></div>
                ) : employees.map(emp => (
                  <button key={emp.id} onClick={()=>setSelected(emp)}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all text-left
                      ${selected?.id===emp.id?'bg-green-600 text-white shadow-lg':'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                    <div>
                      <p className="font-black text-xs uppercase">{emp.name}</p>
                      <p className={`text-[10px] ${selected?.id===emp.id?'text-green-100':'text-slate-400'}`}>{emp.designation}</p>
                    </div>
                    {selected?.id===emp.id && <UserCheck size={16}/>}
                  </button>
                ))}
              </div>
            </div>

            {/* Salary Form */}
            <div className="lg:col-span-2">
              {!selected ? (
                <div className="h-full min-h-[400px] border-4 border-dashed border-slate-100 rounded-3xl flex items-center justify-center flex-col text-slate-300">
                  <Calculator size={56} className="mb-4 opacity-20"/>
                  <p className="font-black uppercase tracking-widest text-sm">Select an employee</p>
                </div>
              ) : (
                <div className="bg-white p-7 rounded-3xl shadow-sm border">
                  {/* Employee info */}
                  <div className="flex justify-between items-start mb-6 pb-4 border-b">
                    <div>
                      <h2 className="text-xl font-black text-slate-800 uppercase italic">{selected.name}</h2>
                      <span className="text-[10px] font-black text-blue-500 uppercase">{selected.designation}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Basic</p>
                      <p className="font-black text-green-700 text-lg">LKR {(selected.basic_salary||0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Month */}
                  <div className="mb-5">
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">② Month</label>
                    <input type="month" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={month} onChange={e=>setMonth(e.target.value)}/>
                  </div>

                  {/* Inputs grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <label className="text-[9px] font-black uppercase text-orange-600 mb-1 block">
                        Units (LKR {selected.piece_rate||0.40}/unit)
                      </label>
                      <input type="number" className="w-full bg-transparent text-2xl font-black text-orange-700 outline-none"
                        value={units||''} onChange={e=>setUnits(parseInt(e.target.value)||0)} placeholder="0"/>
                      <p className="text-[10px] font-bold text-orange-400 mt-1">= LKR {pieceEarned.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <label className="text-[9px] font-black uppercase text-blue-600 mb-1 block">Allowances (Bonus/Food)</label>
                      <input type="number" className="w-full bg-transparent text-2xl font-black text-blue-700 outline-none"
                        value={allowance||''} onChange={e=>setAllowance(parseFloat(e.target.value)||0)} placeholder="0"/>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <label className="text-[9px] font-black uppercase text-red-600 mb-1 block">Deductions (Absence etc)</label>
                      <input type="number" className="w-full bg-transparent text-2xl font-black text-red-700 outline-none"
                        value={deduction||''} onChange={e=>setDeduction(parseFloat(e.target.value)||0)} placeholder="0"/>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                      <label className="text-[9px] font-black uppercase text-yellow-600 mb-1 block">Advance Paid</label>
                      <input type="number" className="w-full bg-transparent text-2xl font-black text-yellow-700 outline-none"
                        value={advancePaid||''} onChange={e=>setAdvancePaid(parseFloat(e.target.value)||0)} placeholder="0"/>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-5">
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Notes</label>
                    <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes..."/>
                  </div>

                  {/* Summary + Approve */}
                  <div className="bg-slate-900 rounded-3xl p-6 text-white">
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Gross</p>
                        <p className="font-black text-green-400 text-lg">LKR {grossSalary.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Deductions</p>
                        <p className="font-black text-red-400 text-lg">LKR {(deduction+advancePaid).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Net Pay</p>
                        <p className="font-black text-white text-2xl">LKR {netSalary.toLocaleString()}</p>
                      </div>
                    </div>
                    <button onClick={handleProcess} disabled={saving}
                      className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest transition flex items-center justify-center gap-2 disabled:opacity-50">
                      {saving?<Loader2 size={18} className="animate-spin"/>:<CheckCircle size={18}/>}
                      {saving?'Processing...':'Approve & Pay'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab==='history' && (
          <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-48"><Loader2 size={32} className="animate-spin text-gray-200"/></div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 text-gray-300">
                <History size={48} className="mx-auto mb-3 opacity-20"/>
                <p className="font-black uppercase text-sm">No payroll history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      {['Month','Employee','Basic','Units','Piece','Allowance','Deduction','Advance','Net Salary','Status',''].map(h=>(
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((log,i)=>(
                      <tr key={log.id} className={`border-b border-slate-50 hover:bg-green-50/30 transition ${i%2?'bg-slate-50/30':''}`}>
                        <td className="px-4 py-3 font-bold text-xs">{log.month?.slice(0,7)}</td>
                        <td className="px-4 py-3">
                          <p className="font-black text-xs uppercase">{log.employees?.name}</p>
                          <p className="text-[10px] text-slate-400">{log.employees?.designation}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-xs">{(log.basic_salary||0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-xs text-orange-600">{log.units_count||0}</td>
                        <td className="px-4 py-3 font-bold text-xs text-orange-600">{(log.piece_earned||0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-xs text-blue-600">{(log.allowances||0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-xs text-red-500">{(log.deductions||0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-xs text-yellow-600">{(log.advance_paid||0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-black text-sm text-green-700">{(log.net_salary||0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full
                            ${log.status==='PAID'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={()=>printSlip(log)} className="p-1.5 bg-slate-100 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition">
                            <Printer size={13}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

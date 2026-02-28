import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Banknote, Calculator, UserCheck, FileStack, Plus, Trash2 } from 'lucide-react';

const PayrollPage = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  
  // Salary Inputs
  const [bottleCount, setBottleCount] = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [deduction, setDeduction] = useState(0);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*');
    if (data) setEmployees(data);
  };

  const calculateNetSalary = () => {
    if (!selectedEmp) return 0;
    
    // බෝතල් වලට පඩි දෙන අයෙක් නම් (උදා: ලේබල් අලවන අය)
    const pieceWorkPay = bottleCount * 0.40;
    
    // Basic Salary එකයි, Piece pay එකයි දෙකම එකතු කරමු (එක්කෙනෙක්ට එකයි තියෙන්නේ සාමාන්‍යයෙන්)
    const base = selectedEmp.basic_salary || 0;
    return (base + pieceWorkPay + allowance) - deduction;
  };

  const handleProcessSalary = async () => {
    if (!selectedEmp) return alert("කරුණාකර සේවකයෙකු තෝරන්න!");
    
    setLoading(true);
    try {
      const netSalary = calculateNetSalary();
      
      // 1. පඩි විස්තරය සේව් කිරීම
      const { error } = await supabase.from('payroll_logs').insert([{
        employee_id: selectedEmp.id,
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
        base_salary: selectedEmp.basic_salary,
        bottles_count: bottleCount,
        allowances: allowance,
        deductions: deduction,
        net_salary: netSalary,
        status: 'PAID'
      }]);

      if (error) throw error;

      alert(`${selectedEmp.name} ගේ පඩිය සාර්ථකව සේව් කළා!`);
      // Reset form
      setSelectedEmp(null);
      setBottleCount(0);
      setAllowance(0);
      setDeduction(0);
      
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-left">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800 flex items-center gap-3">
            <Banknote className="text-green-600" size={32} />
            Payroll <span className="text-green-600">Processor</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Monthly Salary & Piece-Rate (LKR 0.40 per Label) Calculation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* සේවකයින් තේරීම */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block tracking-widest text-left">1. Select Member</label>
            <div className="space-y-2">
              {employees.map(emp => (
                <button 
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${selectedEmp?.id === emp.id ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <span className="font-black text-xs uppercase italic">{emp.name}</span>
                  <UserCheck size={16} className={selectedEmp?.id === emp.id ? 'opacity-100' : 'opacity-0'} />
                </button>
              ))}
            </div>
          </div>

          {/* පඩි විස්තර */}
          <div className="lg:col-span-2 space-y-6">
            {selectedEmp ? (
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-white animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-start mb-8">
                  <div className="text-left">
                    <h2 className="text-2xl font-black text-slate-800 uppercase italic leading-tight">{selectedEmp.name}</h2>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedEmp.designation}</span>
                  </div>
                  <div className="bg-green-50 px-4 py-2 rounded-xl">
                    <p className="text-[9px] font-black text-green-600 uppercase">Basic Salary</p>
                    <p className="font-black text-green-700">LKR {selectedEmp.basic_salary?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* බෝතල් ගණන - ලේබල් අලවන අයට විතරක් */}
                  <div className="p-5 bg-orange-50 rounded-[1.5rem] border border-orange-100">
                    <label className="text-[9px] font-black uppercase text-orange-600 mb-2 block text-left">Labels Applied (0.40 per bottle)</label>
                    <input 
                      type="number" 
                      className="w-full bg-transparent border-none text-2xl font-black text-orange-700 outline-none"
                      value={bottleCount || ''}
                      onChange={(e) => setBottleCount(parseInt(e.target.value) || 0)}
                      placeholder="Enter count"
                    />
                    <p className="text-[10px] font-bold text-orange-400 mt-1 italic">Earned: LKR {(bottleCount * 0.40).toLocaleString()}</p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block text-left">Other Allowances (Bonus/Food)</label>
                    <input 
                      type="number" 
                      className="w-full bg-transparent border-none text-2xl font-black text-slate-700 outline-none"
                      value={allowance || ''}
                      onChange={(e) => setAllowance(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="p-5 bg-red-50 rounded-[1.5rem] border border-red-100">
                    <label className="text-[9px] font-black uppercase text-red-600 mb-2 block text-left">Deductions (Advance/Absence)</label>
                    <input 
                      type="number" 
                      className="w-full bg-transparent border-none text-2xl font-black text-red-700 outline-none"
                      value={deduction || ''}
                      onChange={(e) => setDeduction(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Net Payable Salary</p>
                    <h4 className="text-5xl font-black italic text-green-400">
                      LKR {calculateNetSalary().toLocaleString()}
                    </h4>
                  </div>
                  <button 
                    onClick={handleProcessSalary}
                    disabled={loading}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white px-12 py-6 rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Approve & Pay'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] border-4 border-dashed border-slate-200 rounded-[3rem] flex items-center justify-center flex-col text-slate-300">
                <Calculator size={64} className="mb-4 opacity-20" />
                <p className="font-black uppercase italic tracking-widest">Select an employee to compute salary</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;
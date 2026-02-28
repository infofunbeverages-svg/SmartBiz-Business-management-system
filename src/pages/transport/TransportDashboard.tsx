import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Truck, Fuel, Wallet, Banknote, TrendingUp, Calendar, ArrowRight } from 'lucide-react';

const TransportDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalFuel: 0,
    totalHire: 0,
    totalAdvance: 0,
    netBalance: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('transport_log').select('*');

      if (error) throw error;

      if (data) {
        const fuel = data.reduce((acc, curr) => acc + (Number(curr.fuel_cost) || 0), 0);
        const hire = data.reduce((acc, curr) => acc + (Number(curr.hire_cost) || 0), 0);
        const advance = data.reduce((acc, curr) => acc + (Number(curr.advance_paid) || 0), 0);

        setStats({
          totalTrips: data.length,
          totalFuel: fuel,
          totalHire: hire,
          totalAdvance: advance,
          netBalance: hire - advance
        });
      }
    } catch (err) {
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-black italic text-slate-400 animate-pulse">LOADING FLEET ANALYTICS...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">
            Fleet <span className="text-blue-600">Overview</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-1 w-12 bg-blue-600 rounded-full"></span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Real-time Transport Analytics</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Total Trips */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white group hover:scale-105 transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-200">
                <Truck size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase italic">Active Trips</p>
            </div>
            <h3 className="text-4xl font-black italic text-slate-800">{stats.totalTrips}</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Completed Records</p>
          </div>

          {/* Fuel Expense */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white group hover:scale-105 transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-red-500 p-4 rounded-2xl text-white shadow-lg shadow-red-100">
                <Fuel size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase italic">Fuel Cost</p>
            </div>
            <h3 className="text-3xl font-black italic text-slate-800">LKR {stats.totalFuel.toLocaleString()}</h3>
            <p className="text-[9px] font-bold text-red-400 uppercase mt-1 italic">Total Diesel Outflow</p>
          </div>

          {/* Advance Paid */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white group hover:scale-105 transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-orange-500 p-4 rounded-2xl text-white shadow-lg shadow-orange-100">
                <Wallet size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase italic">Advances</p>
            </div>
            <h3 className="text-3xl font-black italic text-slate-800">LKR {stats.totalAdvance.toLocaleString()}</h3>
            <p className="text-[9px] font-bold text-orange-400 uppercase mt-1 italic">Pre-payments to Drivers</p>
          </div>

          {/* Net Balance */}
          <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl shadow-blue-900/20 border border-slate-800 group hover:scale-105 transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-500 p-4 rounded-2xl text-white shadow-lg shadow-emerald-900/20">
                <TrendingUp size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase italic text-emerald-500">Payable</p>
            </div>
            <h3 className="text-3xl font-black italic text-white">LKR {stats.netBalance.toLocaleString()}</h3>
            <p className="text-[9px] font-bold text-emerald-400/60 uppercase mt-1 italic">Net Hire To-be-paid</p>
          </div>

        </div>

        {/* Info Message */}
        <div className="mt-12 bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-full text-blue-600 shadow-sm"><Calendar size={20}/></div>
            <div>
              <p className="text-xs font-black text-blue-900 uppercase italic">Fleet Assignment Management</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">Monitoring Batta, Tankers and Heavy Load Lorries</p>
            </div>
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase italic flex items-center gap-2 hover:bg-blue-700">
            View Reports <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransportDashboard;
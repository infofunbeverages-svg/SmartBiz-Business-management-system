import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Activity, Plus, ChevronRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SalesDashboard = () => {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [loading, setLoading]           = useState(true);
  const [stats, setStats]               = useState({ totalSales: 0, totalProfit: 0, orderCount: 0, totalDiscount: 0 });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems]   = useState<any[]>([]);
  const [chartData, setChartData]           = useState<any[]>([]);
  const [range, setRange]               = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    if (company?.id) fetchDashboardData();
  }, [company?.id, range]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const now   = new Date();
      let fromDate = now.toISOString().split('T')[0];

      if (range === 'week') {
        const d = new Date(now); d.setDate(d.getDate() - 6);
        fromDate = d.toISOString().split('T')[0];
      } else if (range === 'month') {
        fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      }

      // Fetch invoices
      const { data: invData } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_date, total_amount, net_amount, customers(full_name)')
        .eq('company_id', company.id)
        .gte('invoice_date', fromDate)
        .order('invoice_date', { ascending: false });

      const invoices = invData || [];
      const totalSales    = invoices.reduce((a, i) => a + Number(i.net_amount || i.total_amount || 0), 0);
      const totalDiscount = invoices.reduce((a, i) => a + (Number(i.total_amount || 0) - Number(i.net_amount || i.total_amount || 0)), 0);

      setStats({ totalSales, totalProfit: 0, orderCount: invoices.length, totalDiscount });
      setRecentInvoices(invoices.slice(0, 6));

      // Chart data - group by date
      const grouped: Record<string, number> = {};
      invoices.forEach(inv => {
        const d = inv.invoice_date?.slice(0, 10) || '';
        grouped[d] = (grouped[d] || 0) + Number(inv.net_amount || inv.total_amount || 0);
      });
      const chart = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amount]) => ({
          label: new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
          amount: Math.round(amount),
        }));
      setChartData(chart);

      // Low stock
      const { data: stockData } = await supabase
        .from('inventory')
        .select('name, quantity')
        .eq('company_id', company.id)
        .lt('quantity', 11);
      setLowStockItems(stockData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase text-slate-400 italic">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-900">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase">Sales <span className="text-blue-600">Hub</span></h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 flex items-center gap-2">
            <Activity size={12} className="text-blue-600"/> Live Insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex gap-1 bg-white border rounded-xl p-1">
            {(['today', 'week', 'month'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition-all ${range === r ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                {r === 'today' ? 'Today' : r === 'week' ? '7 Days' : 'Month'}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/sales/invoice')}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs shadow hover:bg-blue-600 transition-all flex items-center gap-2">
            <Plus size={16}/> NEW INVOICE
          </button>
        </div>
      </div>

      {/* Low Stock Warning */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-2xl flex items-center justify-between cursor-pointer shadow" onClick={() => navigate('/inventory')}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><AlertTriangle size={20}/></div>
            <div>
              <h3 className="font-black text-sm">⚠️ Stock Warning!</h3>
              <p className="text-[10px] font-bold text-red-100">{lowStockItems.length} items below 11 units — {lowStockItems.map(i => i.name).slice(0, 3).join(', ')}{lowStockItems.length > 3 ? '...' : ''}</p>
            </div>
          </div>
          <ChevronRight />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow border">
          <DollarSign size={22} className="text-blue-600 mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
          <h2 className="text-2xl font-black italic">LKR {stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow border">
          <ShoppingCart size={22} className="text-purple-600 mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</p>
          <h2 className="text-2xl font-black italic">{stats.orderCount}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow border">
          <TrendingUp size={22} className="text-emerald-600 mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Invoice</p>
          <h2 className="text-2xl font-black italic text-emerald-600">
            LKR {stats.orderCount > 0 ? (stats.totalSales / stats.orderCount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
          </h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow border">
          <Calendar size={22} className="text-orange-500 mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Discount</p>
          <h2 className="text-2xl font-black italic text-orange-500">
            LKR {stats.totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow border">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-4">Sales Trend</h3>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 font-bold text-sm">
              No data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, 'Sales']} />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl shadow border p-6">
          <h3 className="text-xs font-black text-slate-900 uppercase mb-4">Recent Invoices</h3>
          {recentInvoices.length === 0 ? (
            <p className="text-gray-300 font-bold text-sm text-center mt-8">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer">
                  <div>
                    <p className="text-[11px] font-black uppercase truncate max-w-[120px]">{inv.customers?.full_name || 'Customer'}</p>
                    <p className="text-[9px] font-bold text-slate-400">#{inv.invoice_no} · {inv.invoice_date}</p>
                  </div>
                  <p className="text-xs font-black text-blue-600">LKR {Number(inv.net_amount || inv.total_amount || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default SalesDashboard;

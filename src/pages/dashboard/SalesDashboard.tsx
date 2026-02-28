import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  TrendingUp, ShoppingCart, DollarSign, AlertTriangle, 
  Package, Activity, Plus, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SalesDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSales: 0, totalProfit: 0, orderCount: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: salesData } = await supabase
        .from('sales_summary')
        .select('*')
        .eq('order_date', today);

      if (salesData) {
        const sales = salesData.reduce((acc, curr) => acc + (Number(curr.net_amount) || 0), 0);
        const profit = salesData.reduce((acc, curr) => acc + (Number(curr.total_profit) || 0), 0);
        
        setStats({ totalSales: sales, totalProfit: profit, orderCount: salesData.length });
        setRecentOrders(salesData.slice(0, 5));

        const hourlyData = salesData.map(item => ({
          time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          amount: item.net_amount
        }));
        setChartData(hourlyData);
      }

      const { data: stockData } = await supabase
        .from('inventory')
        .select('name, quantity')
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
        <p className="text-[10px] font-black uppercase text-slate-400 italic">Syncing...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-8 text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tighter italic uppercase">Sales <span className="text-blue-600">Hub</span></h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <Activity size={12} className="text-blue-600"/> Live Insights
          </p>
        </div>
        <button onClick={() => navigate('/orders/new')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3 italic">
          <Plus size={18}/> CREATE INVOICE
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-600 text-white p-5 rounded-[2rem] flex items-center justify-between shadow-xl cursor-pointer" onClick={() => navigate('/inventory')}>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl"><AlertTriangle size={24}/></div>
            <div>
              <h3 className="font-black text-sm uppercase">Stock Warning!</h3>
              <p className="text-[10px] font-bold text-red-100 uppercase">{lowStockItems.length} items low</p>
            </div>
          </div>
          <ChevronRight />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
          <DollarSign size={24} className="text-blue-600 mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
          <h2 className="text-3xl font-black italic">LKR {stats.totalSales.toLocaleString()}</h2>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
          <TrendingUp size={24} className="text-emerald-600 mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profit Status</p>
          <h2 className="text-3xl font-black italic text-emerald-600">{stats.totalProfit > 0 ? `LKR ${stats.totalProfit.toLocaleString()}` : "N/A"}</h2>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
          <ShoppingCart size={24} className="text-purple-600 mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</p>
          <h2 className="text-3xl font-black italic">{stats.orderCount}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-xl border border-white h-[400px]">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-8">Sales Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" hide />
              <Tooltip />
              <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="#dbeafe" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-[3rem] shadow-xl border border-white overflow-hidden p-6">
          <h3 className="text-xs font-black text-slate-900 uppercase italic mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <p className="text-[11px] font-black uppercase truncate w-24">{order.customer_name || 'Walking'}</p>
                  <p className="text-[9px] font-bold text-slate-400">#{order.order_no}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black italic">LKR {Number(order.net_amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
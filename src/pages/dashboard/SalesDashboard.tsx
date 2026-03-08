import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Plus, TrendingUp, Package, AlertTriangle, FileText, Users, ChevronRight, DollarSign, ShoppingCart, Tag } from 'lucide-react';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#14b8a6','#f97316'];

export default function SalesDashboard() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [loading, setLoading]     = useState(true);
  const [range, setRange]         = useState<'today'|'week'|'month'>('month');
  const [stats, setStats]         = useState({ revenue: 0, invoices: 0, discount: 0, avg: 0 });
  const [areaData, setAreaData]   = useState<any[]>([]);
  const [pieData, setPieData]     = useState<any[]>([]);
  const [activePie, setActivePie] = useState(0);
  const [recent, setRecent]       = useState<any[]>([]);
  const [lowStock, setLowStock]   = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  useEffect(() => { if (company?.id) load(); }, [company?.id, range]);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    let from = now.toISOString().split('T')[0];
    if (range === 'week') { const d = new Date(now); d.setDate(d.getDate()-6); from = d.toISOString().split('T')[0]; }
    else if (range === 'month') from = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

    const { data: invs } = await supabase
      .from('invoices')
      .select('id, invoice_no, date, total_amount, net_amount, customers(full_name)')
      .eq('company_id', company.id)
      .gte('date', from)
      .order('date', { ascending: false });

    const inv = invs || [];
    const revenue  = inv.reduce((a,i) => a + Number(i.net_amount||i.total_amount||0), 0);
    const discount = inv.reduce((a,i) => a + Math.max(0, Number(i.total_amount||0) - Number(i.net_amount||i.total_amount||0)), 0);
    setStats({ revenue, invoices: inv.length, discount, avg: inv.length ? revenue/inv.length : 0 });
    setRecent(inv.slice(0,5));

    // Area chart
    const grouped: Record<string,number> = {};
    inv.forEach(i => { const d = i.date?.slice(0,10)||''; if(d) grouped[d] = (grouped[d]||0)+Number(i.net_amount||i.total_amount||0); });
    setAreaData(Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b))
      .map(([date, amt]) => ({ label: new Date(date).toLocaleDateString('en-GB',{month:'short',day:'numeric'}), amt: Math.round(amt) })));

    // Items pie
    const ids = inv.map(i=>i.id);
    if (ids.length) {
      const { data: items } = await supabase
        .from('invoice_items').select('total, inventory:inventory_id(name)')
        .in('invoice_id', ids).eq('is_free', false);
      const map: Record<string,number> = {};
      (items||[]).forEach((it:any) => { const n = it.inventory?.name||'Other'; map[n]=(map[n]||0)+Number(it.total||0); });
      setPieData(Object.entries(map).sort(([,a],[,b])=>b-a).slice(0,8).map(([name,value])=>({name,value:Math.round(value)})));
    }

    // Top customers
    const custMap: Record<string,number> = {};
    inv.forEach(i => { const n = i.customers?.full_name||'Unknown'; custMap[n]=(custMap[n]||0)+Number(i.net_amount||i.total_amount||0); });
    setTopCustomers(Object.entries(custMap).sort(([,a],[,b])=>b-a).slice(0,5).map(([name,value])=>({name,value})));

    // Low stock
    const { data: st } = await supabase.from('inventory').select('name,quantity').eq('company_id',company.id).lt('quantity',11);
    setLowStock(st||[]);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen p-3 lg:p-6 space-y-3 lg:space-y-5 pb-24 lg:pb-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-2 lg:flex-row lg:justify-between lg:items-center">
        <div>
          <h1 className="text-xl lg:text-3xl font-black tracking-tight text-gray-900">
            Sales <span className="text-indigo-600">Hub</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Live Intelligence Dashboard</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range Tabs */}
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {(['today','week','month'] as const).map(r => (
              <button key={r} onClick={()=>setRange(r)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                  range===r ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-700'
                }`}>
                {r==='today'?'Today':r==='week'?'7 Days':'Month'}
              </button>
            ))}
          </div>
          <button onClick={()=>navigate('/sales/invoice')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[11px] uppercase shadow-md transition-all">
            <Plus size={14}/> New Invoice
          </button>
        </div>
      </div>

      {/* ── LOW STOCK ALERT ── */}
      {lowStock.length > 0 && (
        <div onClick={()=>navigate('/inventory')}
          className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl cursor-pointer hover:bg-red-100 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600"/>
            </div>
            <div>
              <p className="font-black text-sm">⚠️ Low Stock Alert — {lowStock.length} items</p>
              <p className="text-[10px] font-bold text-red-400">{lowStock.map(i=>i.name).slice(0,4).join(' · ')}</p>
            </div>
          </div>
          <ChevronRight size={18}/>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Revenue', value:`LKR ${(stats.revenue/1000).toFixed(1)}K`, sub:`${stats.invoices} invoices`, Icon:DollarSign, accent:'indigo' },
          { label:'Avg Invoice', value:`LKR ${Math.round(stats.avg).toLocaleString()}`, sub:'per transaction', Icon:ShoppingCart, accent:'violet' },
          { label:'Total Discount', value:`LKR ${Math.round(stats.discount).toLocaleString()}`, sub:'given away', Icon:Tag, accent:'amber' },
          { label:'Stock Alerts', value:String(lowStock.length), sub: lowStock.length ? 'items need restock' : 'All good!', Icon:Package, accent: lowStock.length?'red':'emerald' },
        ].map(({ label, value, sub, Icon, accent }) => (
          <div key={label} className="bg-white rounded-2xl p-3 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-${accent}-50`}>
              <Icon size={18} className={`text-${accent}-600`}/>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <p className={`text-xl font-black text-${accent}-600 mt-1`}>{value}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* Area Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 lg:p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-black text-gray-800">Sales Trend</p>
              <p className="text-[10px] text-gray-400 font-semibold">{range==='today'?'Today':range==='week'?'Last 7 days':'This month'}</p>
            </div>
            <TrendingUp size={16} className="text-indigo-400"/>
          </div>
          {areaData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-200">
              <Package size={28} className="mb-2"/><p className="font-bold text-sm">No data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:9,fill:'#94a3b8',fontWeight:700}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',fontSize:11,fontWeight:700}}
                  formatter={(v:any)=>[`LKR ${Number(v).toLocaleString()}`,'Sales']}/>
                <Area type="monotone" dataKey="amt" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad)"
                  dot={{fill:'#6366f1',r:3,strokeWidth:0}} activeDot={{r:5,fill:'#6366f1'}}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 lg:p-5">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm font-black text-gray-800">Item-wise Sales</p>
              <p className="text-[10px] text-gray-400 font-semibold">Revenue by product</p>
            </div>
            <Package size={16} className="text-violet-400"/>
          </div>
          {pieData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-200">
              <Package size={28} className="mb-2"/><p className="font-bold text-sm">No data</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                    dataKey="value" activeIndex={activePie}
                    onMouseEnter={(_,i)=>setActivePie(i)}
                    activeShape={(props:any) => {
                      const {cx,cy,innerRadius,outerRadius,startAngle,endAngle,fill,payload,percent} = props;
                      return (
                        <g>
                          <text x={cx} y={cy-8} textAnchor="middle" fill="#1e293b" style={{fontSize:10,fontWeight:900}}>
                            {(payload.name||'').slice(0,13)}
                          </text>
                          <text x={cx} y={cy+8} textAnchor="middle" fill={fill} style={{fontSize:10,fontWeight:900}}>
                            {(percent*100).toFixed(0)}%
                          </text>
                          <circle cx={cx} cy={cy} r={innerRadius-1} fill="white"/>
                          <path d={`M${cx},${cy}`} fill="none"/>
                        </g>
                      );
                    }}
                  >
                    {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} stroke="none"/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="w-full space-y-1.5 mt-1 max-h-28 overflow-y-auto">
                {pieData.map((item,i)=>(
                  <div key={i} className="flex items-center gap-2 cursor-pointer" onMouseEnter={()=>setActivePie(i)}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                    <span className="text-[10px] font-bold text-gray-600 flex-1 truncate">{item.name}</span>
                    <span className="text-[10px] font-black text-gray-500">LKR {(item.value/1000).toFixed(1)}K</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 lg:p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-black text-gray-800">Top Customers</p>
            <Users size={15} className="text-cyan-500"/>
          </div>
          {topCustomers.length === 0 ? (
            <p className="text-gray-200 font-bold text-sm text-center mt-8">No data</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c,i)=>{
                const pct = (c.value/topCustomers[0].value)*100;
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-black text-gray-600 truncate max-w-[130px]">{c.name}</span>
                      <span className="text-[10px] font-black text-indigo-600">LKR {Math.round(c.value).toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{width:`${pct}%`, background:`linear-gradient(90deg,#6366f1,#8b5cf6)`}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 lg:p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-black text-gray-800">Recent Invoices</p>
            <FileText size={15} className="text-emerald-500"/>
          </div>
          {recent.length === 0 ? (
            <p className="text-gray-200 font-bold text-sm text-center mt-8">No invoices</p>
          ) : (
            <div className="space-y-2">
              {recent.map(inv=>(
                <div key={inv.id} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl hover:bg-indigo-50 transition cursor-pointer">
                  <div>
                    <p className="text-[11px] font-black text-gray-700 truncate max-w-[130px]">{inv.customers?.full_name||'Customer'}</p>
                    <p className="text-[9px] text-gray-400 font-bold">#{inv.invoice_no}</p>
                  </div>
                  <p className="text-[11px] font-black text-indigo-600">LKR {Number(inv.net_amount||inv.total_amount||0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 lg:p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-black text-gray-800">
              {lowStock.length ? '⚠️ Low Stock' : '✅ Stock OK'}
            </p>
            <AlertTriangle size={15} className={lowStock.length?'text-red-400':'text-emerald-400'}/>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-emerald-500 font-bold text-sm text-center mt-8">All items stocked!</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0,6).map((item,i)=>(
                <div key={i} className="flex justify-between items-center p-2.5 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition"
                  onClick={()=>navigate('/inventory')}>
                  <span className="text-[10px] font-black text-red-700 truncate max-w-[140px]">{item.name}</span>
                  <span className="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-full">{item.quantity} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

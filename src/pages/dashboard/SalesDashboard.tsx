import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Plus, TrendingUp, Package, AlertTriangle, FileText, Users, ArrowUpRight } from 'lucide-react';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#14b8a6','#f97316'];

const renderDonutLabel = ({ cx, cy, name, value, percent }: any) => null;

const ActiveDonutShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 14} textAnchor="middle" fill="#fff" style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>
        {(payload.name || '').slice(0, 14)}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fill="#a5b4fc" style={{ fontSize: 10, fontWeight: 700 }}>
        LKR {Number(value).toLocaleString()}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fill="#6366f1" style={{ fontSize: 10, fontWeight: 900 }}>
        {(percent * 100).toFixed(1)}%
      </text>
      <path d={`M ${cx},${cy} m 0,${-innerRadius - 4} a ${innerRadius + 4},${innerRadius + 4} 0 1,0 0.01,0`} fill="none" />
      <circle cx={cx} cy={cy} r={innerRadius - 2} fill="#0f172a" />
      <path
        d={`M${cx + (outerRadius + 4) * Math.cos(-startAngle * Math.PI / 180)},${cy + (outerRadius + 4) * Math.sin(-startAngle * Math.PI / 180)}`}
        fill={fill}
      />
    </g>
  );
};

export default function SalesDashboard() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [loading, setLoading]     = useState(true);
  const [range, setRange]         = useState<'today'|'week'|'month'>('month');
  const [stats, setStats]         = useState({ revenue: 0, invoices: 0, discount: 0, avg: 0 });
  const [areaData, setAreaData]   = useState<any[]>([]);
  const [barData, setBarData]     = useState<any[]>([]);
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
    const area = Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b))
      .map(([date, amt]) => ({ label: new Date(date).toLocaleDateString('en-GB',{month:'short',day:'numeric'}), amt: Math.round(amt) }));
    setAreaData(area);

    // Bar - last 7 distinct dates
    setBarData(area.slice(-7));

    // Items pie
    const ids = inv.map(i=>i.id);
    if (ids.length) {
      const { data: items } = await supabase
        .from('invoice_items')
        .select('total, inventory:inventory_id(name)')
        .in('invoice_id', ids)
        .eq('is_free', false);
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
    <div className="min-h-screen flex items-center justify-center" style={{background:'#070b14'}}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p style={{color:'#6366f1',fontSize:11,fontWeight:900,letterSpacing:4}}>LOADING</p>
      </div>
    </div>
  );

  const maxBar = Math.max(...barData.map(d=>d.amt), 1);

  return (
    <div style={{ background: '#070b14', minHeight: '100vh', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: '#e2e8f0', padding: '24px' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#6366f1', boxShadow:'0 0 10px #6366f1' }}/>
            <span style={{ fontSize:11, fontWeight:800, color:'#6366f1', letterSpacing:3, textTransform:'uppercase' }}>CRM Dashboard</span>
            <span style={{ fontSize:10, color:'#334155', fontWeight:700, letterSpacing:2 }}>• LIVE</span>
          </div>
          <h1 style={{ fontSize:28, fontWeight:900, letterSpacing:-1, lineHeight:1, color:'#f1f5f9', margin:0 }}>
            Sales <span style={{ color:'#6366f1' }}>Intelligence</span>
          </h1>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', background:'#0f172a', borderRadius:12, padding:4, border:'1px solid #1e293b' }}>
            {(['today','week','month'] as const).map(r => (
              <button key={r} onClick={()=>setRange(r)} style={{
                padding:'6px 14px', borderRadius:9, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1,
                background: range===r ? '#6366f1' : 'transparent',
                color: range===r ? '#fff' : '#475569', border:'none', cursor:'pointer', transition:'all .2s'
              }}>{r==='today'?'Today':r==='week'?'7D':'Month'}</button>
            ))}
          </div>
          <button onClick={()=>navigate('/sales/invoice')} style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 18px',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:12, border:'none',
            color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer', letterSpacing:1,
            boxShadow:'0 4px 20px rgba(99,102,241,0.4)'
          }}>
            <Plus size={14}/> NEW INVOICE
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Revenue', value:`LKR ${(stats.revenue/1000).toFixed(1)}K`, sub: `${stats.invoices} invoices`, color:'#6366f1', icon:'💰' },
          { label:'Avg Invoice', value:`LKR ${Math.round(stats.avg).toLocaleString()}`, sub:'per transaction', color:'#8b5cf6', icon:'📊' },
          { label:'Discounts Given', value:`LKR ${Math.round(stats.discount).toLocaleString()}`, sub:'total savings', color:'#f59e0b', icon:'🏷️' },
          { label:'Stock Alerts', value:lowStock.length, sub: lowStock.length ? lowStock[0]?.name : 'All good', color: lowStock.length ? '#ef4444' : '#10b981', icon: lowStock.length ? '⚠️' : '✅' },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} style={{ background:'#0f172a', borderRadius:16, padding:'18px 20px', border:'1px solid #1e293b', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-10, right:-10, fontSize:40, opacity:0.07 }}>{icon}</div>
            <p style={{ fontSize:10, fontWeight:800, color:'#475569', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>{label}</p>
            <p style={{ fontSize:22, fontWeight:900, color, margin:'0 0 4px', letterSpacing:-0.5 }}>{value}</p>
            <p style={{ fontSize:10, color:'#334155', fontWeight:600 }}>{sub}</p>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color}44,${color})` }}/>
          </div>
        ))}
      </div>

      {/* ── MAIN CHARTS ROW ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Area Chart */}
        <div style={{ background:'#0f172a', borderRadius:20, padding:'20px 20px 12px', border:'1px solid #1e293b' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:900, color:'#6366f1', letterSpacing:2, textTransform:'uppercase' }}>Sales Trend</p>
              <p style={{ fontSize:10, color:'#334155', marginTop:2 }}>Revenue over time</p>
            </div>
            <TrendingUp size={16} color="#6366f1"/>
          </div>
          {areaData.length === 0 ? (
            <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e293b', fontWeight:700, fontSize:13 }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:9,fill:'#475569',fontWeight:700}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:'#475569'}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:'#1e293b',border:'none',borderRadius:10,fontSize:11,fontWeight:700,color:'#e2e8f0'}}
                  formatter={(v:any)=>[`LKR ${Number(v).toLocaleString()}`,'Sales']}/>
                <Area type="monotone" dataKey="amt" stroke="#6366f1" strokeWidth={2} fill="url(#grad)" dot={{fill:'#6366f1',r:3,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut Chart */}
        <div style={{ background:'#0f172a', borderRadius:20, padding:'20px', border:'1px solid #1e293b' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:900, color:'#8b5cf6', letterSpacing:2, textTransform:'uppercase' }}>Item-wise Sales</p>
              <p style={{ fontSize:10, color:'#334155', marginTop:2 }}>Revenue by product</p>
            </div>
            <Package size={16} color="#8b5cf6"/>
          </div>
          {pieData.length === 0 ? (
            <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e293b', fontWeight:700, fontSize:13 }}>No data</div>
          ) : (
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ flex:'0 0 160px' }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      dataKey="value" activeIndex={activePie}
                      activeShape={(props:any) => {
                        const { cx,cy,innerRadius,outerRadius,startAngle,endAngle,fill,payload,value,percent } = props;
                        return (
                          <g>
                            <text x={cx} y={cy-8} textAnchor="middle" fill="#e2e8f0" style={{fontSize:9,fontWeight:900}}>{(payload.name||'').slice(0,12)}</text>
                            <text x={cx} y={cy+7} textAnchor="middle" fill={fill} style={{fontSize:9,fontWeight:900}}>{(percent*100).toFixed(0)}%</text>
                            <path d={`M${cx},${cy}`} fill="none"/>
                            <circle cx={cx} cy={cy} r={innerRadius-1} fill="#070b14"/>
                            <path d={`M${cx + (outerRadius+6) * Math.cos((-startAngle*Math.PI/180))} ${cy}`} fill="none"/>
                          </g>
                        );
                      }}
                      onMouseEnter={(_,i)=>setActivePie(i)}
                    >
                      {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} stroke="none"/>)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5, maxHeight:160, overflowY:'auto' }}>
                {pieData.map((item,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', opacity: activePie===i ? 1 : 0.6, transition:'opacity .2s' }}
                    onMouseEnter={()=>setActivePie(i)}>
                    <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:COLORS[i%COLORS.length] }}/>
                    <span style={{ fontSize:9, fontWeight:700, color:'#94a3b8', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</span>
                    <span style={{ fontSize:9, fontWeight:900, color:COLORS[i%COLORS.length] }}>LKR {(item.value/1000).toFixed(1)}K</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>

        {/* Bar Chart - Top customers */}
        <div style={{ background:'#0f172a', borderRadius:20, padding:'20px', border:'1px solid #1e293b' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:900, color:'#06b6d4', letterSpacing:2, textTransform:'uppercase' }}>Top Customers</p>
            <Users size={14} color="#06b6d4"/>
          </div>
          {topCustomers.length === 0 ? (
            <p style={{ color:'#1e293b', fontWeight:700, fontSize:12, textAlign:'center', marginTop:40 }}>No data</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {topCustomers.map((c,i)=>{
                const pct = (c.value / topCustomers[0].value) * 100;
                return (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:'#94a3b8' }}>{c.name.slice(0,18)}</span>
                      <span style={{ fontSize:10, fontWeight:900, color:'#06b6d4' }}>LKR {Math.round(c.value).toLocaleString()}</span>
                    </div>
                    <div style={{ height:4, borderRadius:4, background:'#1e293b', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#06b6d4,#6366f1)', borderRadius:4, transition:'width .5s' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div style={{ background:'#0f172a', borderRadius:20, padding:'20px', border:'1px solid #1e293b' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:900, color:'#10b981', letterSpacing:2, textTransform:'uppercase' }}>Recent Invoices</p>
            <FileText size={14} color="#10b981"/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {recent.length === 0 ? (
              <p style={{ color:'#1e293b', fontWeight:700, fontSize:12, textAlign:'center', marginTop:40 }}>No invoices</p>
            ) : recent.map(inv=>(
              <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#0a1628', borderRadius:10, border:'1px solid #1e293b' }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, color:'#e2e8f0', marginBottom:1 }}>{(inv.customers?.full_name||'Customer').slice(0,16)}</p>
                  <p style={{ fontSize:9, color:'#334155', fontWeight:600 }}>#{inv.invoice_no}</p>
                </div>
                <span style={{ fontSize:10, fontWeight:900, color:'#10b981' }}>LKR {Number(inv.net_amount||inv.total_amount||0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div style={{ background:'#0f172a', borderRadius:20, padding:'20px', border:'1px solid #1e293b' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:900, color: lowStock.length ? '#ef4444' : '#10b981', letterSpacing:2, textTransform:'uppercase' }}>
              {lowStock.length ? '⚠️ Low Stock' : '✅ Stock OK'}
            </p>
            <AlertTriangle size={14} color={lowStock.length ? '#ef4444' : '#10b981'}/>
          </div>
          {lowStock.length === 0 ? (
            <p style={{ color:'#10b981', fontWeight:700, fontSize:12, textAlign:'center', marginTop:40 }}>All items stocked</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {lowStock.slice(0,6).map((item,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', background:'#1a0a0a', borderRadius:10, border:'1px solid #2d1515', cursor:'pointer' }}
                  onClick={()=>navigate('/inventory')}>
                  <span style={{ fontSize:10, fontWeight:800, color:'#fca5a5' }}>{item.name.slice(0,18)}</span>
                  <span style={{ fontSize:10, fontWeight:900, color:'#ef4444', background:'#2d1515', padding:'2px 8px', borderRadius:6 }}>{item.quantity} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, XCircle, Clock, Printer, FileText, CheckCircle, RefreshCw, Plus } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';

// ─── Draft Print Template ──────────────────────────────────────────────────
const DraftPrintTemplate = ({ draft, items, customer, company }: any) => {
  const validItems = (items || []).filter((i: any) => i.inventory_id);
  const totalNet   = validItems.reduce((a: number, i: any) => a + Number(i.total || 0), 0);
  const totalCases = validItems.reduce((a: number, i: any) => a + Number(i.cases || 0), 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', padding: '6mm', maxWidth: '210mm' }}>

      {/* Watermark */}
      <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
        <span style={{
          display: 'inline-block', border: '2px solid #999', color: '#999',
          padding: '1mm 4mm', fontSize: '10px', fontWeight: '900',
          letterSpacing: '4px', transform: 'rotate(-2deg)'
        }}>DRAFT — NOT A TAX INVOICE</span>
      </div>

      {/* Company Header */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {company?.name || 'COMPANY NAME'}
        </div>
        {company?.address && <div style={{ fontSize: '9px' }}>{company.address}</div>}
        {company?.phone  && <div style={{ fontSize: '9px' }}>Tel: {company.phone}</div>}
      </div>

      <hr style={{ borderTop: '2px solid #000', marginBottom: '2mm' }} />

      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '3px', borderBottom: '2px solid #000', paddingBottom: '2px' }}>
          DRAFT ORDER
        </span>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3mm', fontSize: '10.5px' }}>
        <div style={{ lineHeight: '1.8' }}>
          <div><strong>DRAFT NO:</strong> {draft.draft_no}</div>
          <div><strong>TO:</strong> MR. {(customer?.full_name || '').toUpperCase()}</div>
          <div><strong>ADDR:</strong> {customer?.address || 'N/A'}</div>
        </div>
        <div style={{ textAlign: 'right', lineHeight: '1.8' }}>
          <div><strong>DATE:</strong> {draft.draft_date ? new Date(draft.draft_date).toLocaleDateString('en-GB') : ''}</div>
          <div><strong>VEHICLE:</strong> {draft.vehicle_no || 'N/A'}</div>
          <div><strong>DRIVER:</strong> {draft.driver_name || 'N/A'}</div>
          {draft.dispatch_no && <div><strong>DISPATCH:</strong> {draft.dispatch_no}</div>}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid #000', borderTop: '1.5px solid #000' }}>
            <th style={{ padding: '3px 4px', textAlign: 'left',   fontWeight: '900' }}>DESCRIPTION</th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontWeight: '900', width: '40px' }}>CS</th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontWeight: '900', width: '35px' }}>BT</th>
            <th style={{ padding: '3px 4px', textAlign: 'right',  fontWeight: '900', width: '65px' }}>RATE</th>
            <th style={{ padding: '3px 4px', textAlign: 'right',  fontWeight: '900', width: '55px' }}>DISC</th>
            <th style={{ padding: '3px 4px', textAlign: 'right',  fontWeight: '900', width: '75px' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {validItems.map((item: any, idx: number) => (
            <tr key={idx} style={{ borderBottom: '0.5px dotted #ccc' }}>
              <td style={{ padding: '2.5px 4px' }}>{(item.inventory?.name || item.name || '').toUpperCase()}{item.is_free ? ' (FREE)' : ''}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>{item.cases || ''}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>{item.qty_bottles > 0 ? item.qty_bottles : ''}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right' }}>{item.is_free ? '' : Number(item.unit_price).toFixed(2)}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right' }}>{item.item_discount_per > 0 ? `${Number(item.item_discount_per).toFixed(1)}%` : ''}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right', fontWeight: '700' }}>{item.is_free ? '0.00' : Number(item.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3mm' }}>
        <div style={{ fontSize: '9px', fontWeight: '700' }}>TOTAL CASES: {totalCases}</div>
        <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: '900' }}>
          NET TOTAL: LKR {totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <hr style={{ borderTop: '1px solid #000', marginBottom: '3mm' }} />

      {/* Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8mm' }}>
        {['PREPARED BY', 'CHECKED BY', 'APPROVED BY'].map(label => (
          <div key={label} style={{ flex: 1, borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center', fontSize: '9px', fontWeight: '700' }}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '6mm', fontSize: '9px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
        *** THIS IS A DRAFT — SUBJECT TO CHANGE — NOT A VALID TAX INVOICE ***
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AgencyOrdersPage = () => {
  const { company } = useCompany();
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState<'agency' | 'drafts'>('drafts');
  const [orders, setOrders]             = useState<any[]>([]);
  const [drafts, setDrafts]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [printDraft, setPrintDraft]     = useState<any>(null);
  const [printItems, setPrintItems]     = useState<any[]>([]);
  const [printCustomer, setPrintCustomer] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (company?.id) { fetchAgencyOrders(); fetchDrafts(); } }, [company?.id]);

  const fetchAgencyOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .eq('order_type', 'AGENCY')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const fetchDrafts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('draft_invoices')
      .select('*, customers(full_name, address, phone)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });
    setDrafts(data || []);
    setLoading(false);
  };

  const approveOrder = async (id: string) => {
    await supabase.from('orders').update({ status: 'Processing', is_approved: true }).eq('id', id);
    alert('Order Approved!');
    fetchAgencyOrders();
  };

  const handlePrintDraft = async (draft: any) => {
    const { data: items } = await supabase
      .from('draft_invoice_items')
      .select('*, inventory:inventory_id(name, bottles_per_case)')
      .eq('draft_id', draft.id);
    setPrintDraft(draft);
    setPrintItems(items || []);
    setPrintCustomer(draft.customers);
    setTimeout(() => window.print(), 300);
  };

  const deleteDraft = async (id: string) => {
    if (!confirm('Delete this draft?')) return;
    await supabase.from('draft_invoice_items').delete().eq('draft_id', id);
    await supabase.from('draft_invoices').delete().eq('id', id);
    fetchDrafts();
  };

  const pendingDrafts    = drafts.filter(d => d.status === 'Draft');
  const convertedDrafts  = drafts.filter(d => d.status === 'Converted');

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Orders & Drafts</h1>
          <p className="text-sm text-gray-500 font-medium">Agency orders and draft invoices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/sales/agencies/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-black text-xs uppercase hover:bg-orange-700">
            <ShoppingBag size={14} /> + New Order
          </button>
          <button onClick={() => { fetchAgencyOrders(); fetchDrafts(); }}
            className="p-2 bg-white border rounded-xl hover:bg-gray-50">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${activeTab === 'drafts' ? 'bg-amber-500 text-white shadow' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText size={14} />
          📝 Drafts
          {pendingDrafts.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'drafts' ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-700'}`}>
              {pendingDrafts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('agency')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${activeTab === 'agency' ? 'bg-orange-500 text-white shadow' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}
        >
          <ShoppingBag size={14} />
          Agency Orders
          {orders.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'agency' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-700'}`}>
              {orders.length}
            </span>
          )}
        </button>
      </div>

      {/* ── DRAFTS TAB ──────────────────────────────────────────── */}
      {activeTab === 'drafts' && (
        <div className="space-y-4">

          {/* Pending Drafts */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <Clock size={15} className="text-amber-500" />
              <span className="font-black text-sm uppercase text-amber-600">Pending Drafts</span>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">{pendingDrafts.length}</span>
            </div>
            {pendingDrafts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-bold text-sm">No pending drafts</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase border-b">
                    <th className="p-3 text-left">Draft No</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Vehicle / Driver</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDrafts.map(d => (
                    <tr key={d.id} className="border-b hover:bg-amber-50 transition-colors">
                      <td className="p-3 font-black text-amber-600">📝 {d.draft_no}</td>
                      <td className="p-3 font-bold uppercase">{d.customers?.full_name}</td>
                      <td className="p-3 text-gray-500 font-bold">{d.draft_date}</td>
                      <td className="p-3">
                        <div className="text-xs font-bold">{d.vehicle_no || '—'}</div>
                        <div className="text-[10px] text-gray-400">{d.driver_name || ''}</div>
                      </td>
                      <td className="p-3 text-right font-black">LKR {Number(d.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => handlePrintDraft(d)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg font-bold text-[10px] uppercase transition-all"
                          >
                            <Printer size={12} /> Print
                          </button>
                          <button
                            onClick={() => deleteDraft(d.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Converted Drafts */}
          {convertedDrafts.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b flex items-center gap-2">
                <CheckCircle size={15} className="text-green-500" />
                <span className="font-black text-sm uppercase text-green-600">Converted to Invoice</span>
                <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">{convertedDrafts.length}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase border-b">
                    <th className="p-3 text-left">Draft No</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {convertedDrafts.map(d => (
                    <tr key={d.id} className="border-b hover:bg-green-50">
                      <td className="p-3 font-bold text-green-600 line-through">📝 {d.draft_no}</td>
                      <td className="p-3 font-bold uppercase text-gray-400">{d.customers?.full_name}</td>
                      <td className="p-3 text-gray-400">{d.draft_date}</td>
                      <td className="p-3 text-right text-gray-400">LKR {Number(d.total_amount).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => handlePrintDraft(d)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-[10px]">
                          <Printer size={12} />
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

      {/* ── AGENCY ORDERS TAB ───────────────────────────────────── */}
      {activeTab === 'agency' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-bold">No agency orders pending.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase border-b">
                  <th className="p-3 text-left">Order ID</th>
                  <th className="p-3 text-left">Distributor</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b hover:bg-orange-50">
                    <td className="p-3 font-bold">#{o.order_no || o.id.slice(0,6)}</td>
                    <td className="p-3 font-black uppercase text-xs">{o.customers?.name}</td>
                    <td className="p-3 text-gray-500">{o.order_date}</td>
                    <td className="p-3 text-right font-bold">LKR {Number(o.net_amount).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => approveOrder(o.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-green-700 uppercase">
                          ✅ Approve
                        </button>
                        <button className="text-gray-300 hover:text-red-500"><XCircle size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── HIDDEN PRINT AREA ───────────────────────────────────── */}
      {printDraft && (
        <div className="hidden print:block">
          <DraftPrintTemplate
            draft={printDraft}
            items={printItems}
            customer={printCustomer}
            company={company}
          />
        </div>
      )}

    </div>
  );
};

export default AgencyOrdersPage;

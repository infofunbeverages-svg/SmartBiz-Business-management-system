import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import { Save, Loader2, Plus, Trash2, ArrowLeft, ShoppingBag, Printer } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// ── Item Dropdown (same pattern as SalesInvoice) ─────────────────────────────
const ItemDropdown = ({ stock, value, onChange, onEnter }: any) => {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? stock.filter((s: any) => s.name?.toLowerCase().includes(query.toLowerCase()))
    : stock;

  const selectedName = stock.find((s: any) => s.id === value)?.name || '';

  useEffect(() => {
    if (open && listRef.current) {
      const li = listRef.current.children[cursor] as HTMLElement;
      li?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor, open]);

  const pick = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
    setCursor(0);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="item-dropdown-input w-full p-2 bg-gray-50 rounded-lg font-bold text-sm outline-none border border-transparent focus:border-blue-400"
        value={open ? query : selectedName}
        placeholder="Select item..."
        onFocus={() => { setOpen(true); setQuery(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => { setQuery(e.target.value); setCursor(0); }}
        onKeyDown={e => {
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
          if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
          if (e.key === 'Enter')     { e.preventDefault(); if (filtered[cursor]) { pick(filtered[cursor].id); onEnter?.(); } }
          if (e.key === 'Escape')    setOpen(false);
        }}
      />
      {open && filtered.length > 0 && (
        <ul ref={listRef} className="absolute z-50 w-full bg-white border rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1">
          {filtered.map((s: any, i: number) => (
            <li key={s.id}
              className={`px-3 py-2 cursor-pointer text-xs font-bold ${i === cursor ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
              onMouseDown={() => pick(s.id)}
            >
              {s.name}
              <span className={`ml-2 text-[10px] ${i === cursor ? 'text-blue-200' : 'text-gray-400'}`}>
                Stock: {s.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Draft Print Template ──────────────────────────────────────────────────────
const DraftPrintTemplate = ({ order, items, customer, company }: any) => {
  const validItems = (items || []).filter((i: any) => i.inventory_id);
  const totalNet   = validItems.reduce((a: number, i: any) => a + Number(i.total || 0), 0);
  const totalCases = validItems.reduce((a: number, i: any) => a + Number(i.cases || 0), 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', padding: '6mm' }}>
      {/* Watermark */}
      <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
        <span style={{ display: 'inline-block', border: '2px solid #bbb', color: '#bbb', padding: '1mm 5mm', fontSize: '11px', fontWeight: '900', letterSpacing: '3px' }}>
          DRAFT ORDER — NOT A TAX INVOICE
        </span>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>{company?.name}</div>
        {company?.address && <div style={{ fontSize: '9px' }}>{company.address}</div>}
        {company?.phone   && <div style={{ fontSize: '9px' }}>Tel: {company.phone}</div>}
      </div>
      <hr style={{ borderTop: '2px solid #000', marginBottom: '2mm' }} />
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '3px', borderBottom: '2px solid #000', paddingBottom: '2px' }}>AGENCY DRAFT ORDER</span>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3mm', fontSize: '10.5px' }}>
        <div style={{ lineHeight: '1.8' }}>
          <div><strong>ORDER NO:</strong> {order.order_no || order.draft_no}</div>
          <div><strong>TO:</strong> {(customer?.full_name || '').toUpperCase()}</div>
          <div><strong>AREA:</strong> {order.area || customer?.sales_area || 'N/A'}</div>
          <div><strong>ADDR:</strong> {customer?.address || 'N/A'}</div>
        </div>
        <div style={{ textAlign: 'right', lineHeight: '1.8' }}>
          <div><strong>DATE:</strong> {order.order_date || order.draft_date ? new Date(order.order_date || order.draft_date).toLocaleDateString('en-GB') : ''}</div>
          <div><strong>VEHICLE:</strong> {order.vehicle_no || 'N/A'}</div>
          <div><strong>DRIVER:</strong>  {order.driver_name || 'N/A'}</div>
        </div>
      </div>

      {/* Items */}
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
              <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>{Number(item.qty_bottles) > 0 ? item.qty_bottles : ''}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right' }}>{item.is_free ? '' : Number(item.unit_price).toFixed(2)}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right' }}>{Number(item.item_discount_per) > 0 ? `${Number(item.item_discount_per).toFixed(1)}%` : ''}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right', fontWeight: '700' }}>{item.is_free ? '0.00' : Number(item.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3mm' }}>
        <div style={{ fontSize: '9px', fontWeight: '700' }}>TOTAL CASES: {totalCases}</div>
        <div style={{ fontSize: '16px', fontWeight: '900' }}>
          NET TOTAL: LKR {totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <hr style={{ borderTop: '1px solid #000', marginBottom: '3mm' }} />

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8mm' }}>
        {['PREPARED BY', 'CHECKED BY', 'APPROVED BY'].map(l => (
          <div key={l} style={{ flex: 1, borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center', fontSize: '9px', fontWeight: '700' }}>{l}</div>
        ))}
      </div>
      <div style={{ marginTop: '5mm', fontSize: '8.5px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
        *** DRAFT ORDER — SUBJECT TO CHANGE — NOT A VALID TAX INVOICE ***
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AgencyOrderNew = () => {
  const { company } = useCompany();
  const navigate = useNavigate();

  const [stock, setStock]               = useState<any[]>([]);
  const [customers, setCustomers]       = useState<any[]>([]);
  const [isSaving, setIsSaving]         = useState(false);
  const [isPrinting, setIsPrinting]     = useState(false);
  const [savedOrder, setSavedOrder]     = useState<any>(null);
  const [savedItems, setSavedItems]     = useState<any[]>([]);

  // Area dropdown
  const [areaQuery, setAreaQuery]       = useState('');
  const [areaOpen, setAreaOpen]         = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [areaCursor, setAreaCursor]     = useState(0);
  const areaListRef  = useRef<HTMLUListElement>(null);

  // Customer dropdown
  const [custQuery, setCustQuery]       = useState('');
  const [custOpen, setCustOpen]         = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [custCursor, setCustCursor]     = useState(0);
  const custListRef  = useRef<HTMLUListElement>(null);

  const customerRef  = useRef<HTMLInputElement>(null);
  const vehicleRef   = useRef<HTMLInputElement>(null);
  const driverRef    = useRef<HTMLInputElement>(null);
  const casesRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const bottlesRefs  = useRef<(HTMLInputElement | null)[]>([]);
  const discRefs     = useRef<(HTMLInputElement | null)[]>([]);
  const freeRefs     = useRef<(HTMLInputElement | null)[]>([]);

  const [orderData, setOrderData] = useState({
    order_no:    `AGO-${Date.now().toString().slice(-6)}`,
    order_date:  new Date().toISOString().split('T')[0],
    vehicle_no:  '',
    driver_name: '',
    notes:       '',
  });

  const [items, setItems] = useState([
    { inventory_id: '', cases: 0, qty_bottles: 0, units_per_case: 12, unit_price: 0, item_discount_per: 0, is_free: false, total: 0 }
  ]);

  // Areas derived from customers
  const allAreas = [...new Set(customers.map((c: any) => c.sales_area).filter(Boolean))].sort();
  const filteredAreas = areaQuery
    ? allAreas.filter(a => a.toLowerCase().includes(areaQuery.toLowerCase()))
    : allAreas;

  // Customers filtered by area
  const areaCustomers = selectedArea
    ? customers.filter((c: any) => c.sales_area === selectedArea)
    : customers;
  const filteredCustomers = custQuery
    ? areaCustomers.filter((c: any) => c.full_name?.toLowerCase().includes(custQuery.toLowerCase()))
    : areaCustomers;

  useEffect(() => {
    if (areaOpen && areaListRef.current) {
      const li = areaListRef.current.children[areaCursor] as HTMLElement;
      li?.scrollIntoView({ block: 'nearest' });
    }
  }, [areaCursor, areaOpen]);

  useEffect(() => {
    if (custOpen && custListRef.current) {
      const li = custListRef.current.children[custCursor] as HTMLElement;
      li?.scrollIntoView({ block: 'nearest' });
    }
  }, [custCursor, custOpen]);

  useEffect(() => {
    if (company?.id) fetchData();
  }, [company?.id]);

  const fetchData = async () => {
    const [{ data: stockData }, { data: custData }] = await Promise.all([
      supabase.from('inventory').select('id, name, price, special_price, bottles_per_case, quantity').eq('company_id', company.id).order('name'),
      supabase.from('customers').select('*').eq('company_id', company.id).order('full_name'),
    ]);
    setStock(stockData || []);
    setCustomers(custData || []);
  };

  const pickArea = (area: string) => {
    setSelectedArea(area);
    setAreaQuery('');
    setAreaOpen(false);
    setAreaCursor(0);
    setCustomerDetails(null);
    setTimeout(() => customerRef.current?.focus(), 50);
  };

  const pickCustomer = (c: any) => {
    setCustomerDetails(c);
    setCustQuery('');
    setCustOpen(false);
    setCustCursor(0);
    const disc = Number(c.default_discount || 0);
    setItems([{ inventory_id: '', cases: 0, qty_bottles: 0, units_per_case: 12, unit_price: 0, item_discount_per: disc, is_free: false, total: 0 }]);
    setTimeout(() => vehicleRef.current?.focus(), 50);
  };

  const calcTotal = (item: any) => {
    const upc   = Number(item.units_per_case) || 12;
    const units = (Number(item.cases || 0) * upc) + Number(item.qty_bottles || 0);
    const gross = (units / upc) * Number(item.unit_price || 0);
    return item.is_free ? 0 : gross - (gross * (Number(item.item_discount_per || 0) / 100));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'inventory_id') {
      const prod = stock.find(s => s.id === value);
      if (prod) {
        const disc = Number(newItems[index].item_discount_per || 0);
        newItems[index].unit_price     = (disc > 40 && prod.special_price) ? prod.special_price : prod.price || 0;
        newItems[index].units_per_case = prod.bottles_per_case || 12;
      }
    }
    if (field === 'item_discount_per') {
      const disc = parseFloat(value) || 0;
      const prod = stock.find(s => s.id === newItems[index].inventory_id);
      if (prod) newItems[index].unit_price = (disc > 40 && prod.special_price) ? prod.special_price : prod.price || 0;
    }
    newItems[index].total = calcTotal(newItems[index]);
    setItems(newItems);
  };

  const addNewRow = useCallback(() => {
    const disc = customerDetails ? Number(customerDetails.default_discount || 0) : 0;
    setItems(prev => [...prev, { inventory_id: '', cases: 0, qty_bottles: 0, units_per_case: 12, unit_price: 0, item_discount_per: disc, is_free: false, total: 0 }]);
    setTimeout(() => {
      const d = document.querySelectorAll<HTMLElement>('.item-dropdown-input');
      d[d.length - 1]?.focus();
    }, 50);
  }, [customerDetails]);

  const totalAmount = items.reduce((a, i) => a + Number(i.total || 0), 0);
  const totalCases  = items.reduce((a, i) => a + Number(i.cases || 0), 0);

  const handleSave = async () => {
    if (!customerDetails) { alert('Please select a customer!'); return; }
    if (items.every(i => !i.inventory_id)) { alert('Please add at least one item!'); return; }
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Save to draft_invoices table
      const { data: draft, error: de } = await supabase
        .from('draft_invoices')
        .insert([{
          company_id:   company.id,
          customer_id:  customerDetails.id,
          draft_no:     orderData.order_no,
          vehicle_no:   orderData.vehicle_no,
          driver_name:  orderData.driver_name,
          dispatch_no:  '',
          draft_date:   orderData.order_date,
          total_amount: totalAmount,
          notes:        orderData.notes,
          status:       'Draft',
        }])
        .select().single();
      if (de) throw de;

      const draftItems = items.filter(i => i.inventory_id).map(i => ({
        draft_id:          draft.id,
        company_id:        company.id,
        inventory_id:      i.inventory_id,
        cases:             Number(i.cases || 0),
        qty_bottles:       Number(i.qty_bottles || 0),
        units_per_case:    Number(i.units_per_case || 12),
        unit_price:        Number(i.unit_price || 0),
        item_discount_per: Number(i.item_discount_per || 0),
        is_free:           !!i.is_free,
        total:             Number(i.total || 0),
      }));
      await supabase.from('draft_invoice_items').insert(draftItems);

      setSavedOrder({ ...draft, area: selectedArea });
      setSavedItems(draftItems.map(di => ({
        ...di,
        inventory: stock.find(s => s.id === di.inventory_id),
        name: stock.find(s => s.id === di.inventory_id)?.name || '',
      })));
      alert(`✅ Agency Order ${orderData.order_no} saved as Draft!`);
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally { setIsSaving(false); }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => { window.print(); setIsPrinting(false); }, 300);
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 no-print">
          <Link to="/sales/agencies" className="p-2 bg-white rounded-xl border hover:bg-gray-50">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">NEW AGENCY ORDER</h1>
              <p className="text-xs text-gray-500 font-bold">Saved as draft → Admin converts to invoice</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            {savedOrder && (
              <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase">
                <Printer size={14} /> Print Draft
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow border p-6 mb-4 no-print">

          {/* Area + Customer + Vehicle + Driver + Date */}
          <div className="grid grid-cols-2 gap-4 mb-4">

            {/* Area */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Area *</label>
              <div className="relative">
                <input
                  className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-orange-400"
                  placeholder="Type or select area..."
                  value={areaOpen ? areaQuery : selectedArea}
                  onFocus={() => { setAreaOpen(true); setAreaQuery(''); }}
                  onBlur={() => setTimeout(() => setAreaOpen(false), 150)}
                  onChange={e => { setAreaQuery(e.target.value); setAreaCursor(0); }}
                  onKeyDown={e => {
                    if (!areaOpen) return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); setAreaCursor(c => Math.min(c+1, filteredAreas.length-1)); }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); setAreaCursor(c => Math.max(c-1, 0)); }
                    if (e.key === 'Enter')     { e.preventDefault(); if (filteredAreas[areaCursor]) pickArea(filteredAreas[areaCursor]); }
                    if (e.key === 'Escape')    setAreaOpen(false);
                  }}
                />
                {areaOpen && filteredAreas.length > 0 && (
                  <ul ref={areaListRef} className="absolute z-50 w-full bg-white border rounded-xl shadow-xl max-h-44 overflow-y-auto mt-1">
                    {filteredAreas.map((a, i) => (
                      <li key={a}
                        className={`px-3 py-2 cursor-pointer font-bold text-sm ${i === areaCursor ? 'bg-orange-500 text-white' : 'hover:bg-gray-50'}`}
                        onMouseDown={() => pickArea(a)}
                      >{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Customer */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Customer *</label>
              <div className="relative">
                <input
                  ref={customerRef}
                  className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-orange-400"
                  placeholder="Select customer..."
                  value={custOpen ? custQuery : (customerDetails?.full_name || '')}
                  onFocus={() => { setCustOpen(true); setCustQuery(''); }}
                  onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                  onChange={e => { setCustQuery(e.target.value); setCustCursor(0); }}
                  onKeyDown={e => {
                    if (!custOpen) return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); setCustCursor(c => Math.min(c+1, filteredCustomers.length-1)); }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); setCustCursor(c => Math.max(c-1, 0)); }
                    if (e.key === 'Enter')     { e.preventDefault(); if (filteredCustomers[custCursor]) pickCustomer(filteredCustomers[custCursor]); }
                    if (e.key === 'Escape')    setCustOpen(false);
                  }}
                />
                {custOpen && filteredCustomers.length > 0 && (
                  <ul ref={custListRef} className="absolute z-50 w-full bg-white border rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1">
                    {filteredCustomers.map((c, i) => (
                      <li key={c.id}
                        className={`px-3 py-2 cursor-pointer text-sm ${i === custCursor ? 'bg-orange-500 text-white' : 'hover:bg-gray-50'}`}
                        onMouseDown={() => pickCustomer(c)}
                      >
                        <span className="font-black">{c.full_name}</span>
                        {c.default_discount > 0 && <span className={`ml-2 text-[10px] font-bold ${i === custCursor ? 'text-orange-200' : 'text-gray-400'}`}>Disc: {c.default_discount}%</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {customerDetails?.default_discount > 0 && (
                <p className="text-[10px] text-orange-500 font-bold mt-1">Default discount: {customerDetails.default_discount}%</p>
              )}
            </div>

            {/* Vehicle */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Vehicle No</label>
              <input
                ref={vehicleRef}
                className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-orange-400"
                placeholder="AB-1234"
                value={orderData.vehicle_no}
                onChange={e => setOrderData({ ...orderData, vehicle_no: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') driverRef.current?.focus(); }}
              />
            </div>

            {/* Driver */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Driver Name</label>
              <input
                ref={driverRef}
                className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-orange-400"
                placeholder="Driver name"
                value={orderData.driver_name}
                onChange={e => setOrderData({ ...orderData, driver_name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') document.querySelector<HTMLElement>('.item-dropdown-input')?.focus(); }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Order Date</label>
              <input type="date" className="w-full p-3 bg-gray-50 rounded-xl font-bold"
                value={orderData.order_date} onChange={e => setOrderData({ ...orderData, order_date: e.target.value })} />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Notes</label>
              <input className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-orange-400"
                placeholder="Optional notes..."
                value={orderData.notes} onChange={e => setOrderData({ ...orderData, notes: e.target.value })} />
            </div>
          </div>

          {/* Items Table */}
          <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Order Items</div>
          <div className="overflow-x-auto">
            <table className="w-full mb-4">
              <thead>
                <tr className="bg-gray-900 text-white text-[10px] uppercase">
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-center w-20">CS</th>
                  <th className="p-3 text-center w-20">BT</th>
                  <th className="p-3 text-right w-28">Price</th>
                  <th className="p-3 text-center w-20">Disc %</th>
                  <th className="p-3 text-center w-16">Free</th>
                  <th className="p-3 text-right w-28">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">
                      <ItemDropdown
                        stock={stock}
                        value={item.inventory_id}
                        onChange={val => updateItem(i, 'inventory_id', val)}
                        onEnter={() => casesRefs.current[i]?.focus()}
                      />
                    </td>
                    <td className="p-2">
                      <input type="number" min="0"
                        ref={el => { casesRefs.current[i] = el; }}
                        className="w-full p-2 bg-blue-50 text-center font-bold rounded-lg outline-none border border-transparent focus:border-blue-400"
                        value={item.cases || ''}
                        onChange={e => updateItem(i, 'cases', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') bottlesRefs.current[i]?.focus(); }}
                      />
                    </td>
                    <td className="p-2">
                      <input type="number" min="0"
                        ref={el => { bottlesRefs.current[i] = el; }}
                        className="w-full p-2 bg-gray-50 text-center rounded-lg outline-none border border-transparent focus:border-blue-400"
                        value={item.qty_bottles || ''}
                        onChange={e => updateItem(i, 'qty_bottles', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') discRefs.current[i]?.focus(); }}
                      />
                    </td>
                    <td className="p-2 text-right font-black text-blue-700 text-sm">
                      {item.unit_price ? Number(item.unit_price).toFixed(2) : ''}
                    </td>
                    <td className="p-2">
                      <input type="number" min="0" max="100" step="0.01"
                        ref={el => { discRefs.current[i] = el; }}
                        className={`w-full p-2 text-center font-bold rounded-lg border outline-none ${Number(item.item_discount_per||0) > 40 ? 'bg-red-50 border-red-300 text-red-700' : 'bg-amber-50 border-amber-200'}`}
                        value={item.item_discount_per || ''}
                        onChange={e => updateItem(i, 'item_discount_per', parseFloat(e.target.value) || 0)}
                        onKeyDown={e => { if (e.key === 'Enter') freeRefs.current[i]?.focus(); }}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox"
                        ref={el => { freeRefs.current[i] = el; }}
                        checked={!!item.is_free}
                        onChange={e => updateItem(i, 'is_free', e.target.checked)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (i === items.length - 1) addNewRow();
                            else document.querySelectorAll<HTMLElement>('.item-dropdown-input')[i+1]?.focus();
                          }
                        }}
                      />
                    </td>
                    <td className="p-2 text-right font-black text-orange-600">{Number(item.total).toFixed(2)}</td>
                    <td className="p-2">
                      <button onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                        <Trash2 size={15} className="text-red-300 hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center bg-gray-900 p-5 rounded-2xl text-white">
            <div className="flex gap-6">
              <div><p className="text-[10px] text-gray-400">TOTAL CASES</p><p className="text-xl font-bold">{totalCases}</p></div>
              <div><p className="text-[10px] text-gray-400">ORDER VALUE</p><p className="text-xl font-bold">LKR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={addNewRow} className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-xl font-bold text-xs uppercase">
                + Item
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !!savedOrder}
                className="flex items-center gap-2 px-8 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl font-black text-xs uppercase"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {savedOrder ? 'Saved! ✅' : 'Save Draft Order'}
              </button>
              {savedOrder && (
                <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-xs uppercase">
                  <Printer size={15} /> Print
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Print Area */}
      {savedOrder && (
        <div className="hidden print:block">
          <DraftPrintTemplate
            order={{ ...savedOrder, area: selectedArea }}
            items={savedItems}
            customer={customerDetails}
            company={company}
          />
        </div>
      )}
    </div>
  );
};

export default AgencyOrderNew;

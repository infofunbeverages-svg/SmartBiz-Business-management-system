import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Trash2, Save, Loader2, Search, List, Edit } from 'lucide-react';
import { useCompany } from '../../utils/useCompany';
import { logActivity } from '../../utils/activityLogger';
import { useLocation } from 'react-router-dom';
import InvoiceTemplate from '../../components/common/InvoiceTemplate';

const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const format = (n: number) => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
  };
  let str = '';
  if (num >= 100000) { str += format(Math.floor(num / 100000)) + 'Lakh '; num %= 100000; }
  if (num >= 1000) { str += format(Math.floor(num / 1000)) + 'Thousand '; num %= 1000; }
  if (num >= 100) { str += format(Math.floor(num / 100)) + 'Hundred '; num %= 100; }
  if (num > 0) str += (str !== '' ? 'and ' : '') + format(num);
  return str.toUpperCase().trim() + ' RUPEES ONLY';
};

// ─── Item dropdown with arrow-key + Enter navigation ───────────────────────
interface ItemDropdownProps {
  stock: any[];
  value: string;
  onChange: (id: string) => void;
  onEnter: () => void;
}

const ItemDropdown = ({ stock, value, onChange, onEnter }: ItemDropdownProps) => {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const [cursor, setCursor] = useState(0);
  const listRef             = useRef<HTMLUListElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  const selectedName = stock.find(s => s.id === value)?.name || '';
  const filtered = query.length > 0
    ? stock.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : stock;

  useEffect(() => {
    if (open && listRef.current) {
      const li = listRef.current.children[cursor] as HTMLElement;
      li?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor, open]);

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
    onEnter();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); setCursor(0); return; }
    if (e.key === 'ArrowDown') { setCursor(c => Math.min(c + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setCursor(c => Math.max(c - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter') { if (filtered[cursor]) select(filtered[cursor].id); e.preventDefault(); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        className="item-dropdown-input w-full p-2 bg-gray-50 rounded-lg font-bold outline-none border border-transparent focus:border-blue-400"
        placeholder="Type to search..."
        value={open ? query : selectedName}
        onFocus={() => { setOpen(true); setQuery(''); setCursor(0); }}
        onChange={e => { setQuery(e.target.value); setCursor(0); }}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto"
        >
          {filtered.map((s, idx) => (
            <li
              key={s.id}
              className={`px-3 py-2 cursor-pointer text-sm font-bold flex justify-between ${idx === cursor ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
              onMouseDown={() => select(s.id)}
              onMouseEnter={() => setCursor(idx)}
            >
              <span>{s.name}</span>
              <span className={`text-xs ${idx === cursor ? 'text-blue-200' : 'text-gray-400'}`}>{s.quantity} btl</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


// ─── Area → Customer two-step dropdown ───────────────────────────────────────
const AreaCustomerDropdown = ({ customers, value, onChange, onEnter }: CustomerDropdownProps) => {
  const [areaQuery, setAreaQuery] = useState('');
  const [custQuery, setCustQuery] = useState('');
  const [areaOpen, setAreaOpen]   = useState(false);
  const [custOpen, setCustOpen]   = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [areaCursor, setAreaCursor] = useState(0);
  const [custCursor, setCustCursor] = useState(0);
  const areaListRef  = useRef<HTMLUListElement>(null);
  const custListRef  = useRef<HTMLUListElement>(null);
  const areaInputRef = useRef<HTMLInputElement>(null);
  const custInputRef = useRef<HTMLInputElement>(null);

  const selectedCust = customers.find((c: any) => c.id === value);

  const allAreas = Array.from(new Set(
    customers.map((c: any) => c.sales_area).filter(Boolean)
  )).sort() as string[];

  const filteredAreas = areaQuery
    ? allAreas.filter((a: string) => a.toLowerCase().includes(areaQuery.toLowerCase()))
    : allAreas;

  const areaCustomers = selectedArea ? customers.filter((c: any) => c.sales_area === selectedArea) : customers;
  const filteredCusts = custQuery
    ? areaCustomers.filter((c: any) => c.full_name.toLowerCase().includes(custQuery.toLowerCase()))
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

  const pickArea = (area: string) => {
    setSelectedArea(area);
    setAreaOpen(false);
    setAreaQuery('');
    setAreaCursor(0);
    setCustCursor(0);
    setTimeout(() => { setCustOpen(true); custInputRef.current?.focus(); }, 50);
  };

  const pickCust = (cust: any) => {
    onChange(cust);
    setCustOpen(false);
    setCustQuery('');
    setCustCursor(0);
    setTimeout(() => onEnter(), 50);
  };

  const resetArea = () => {
    setSelectedArea('');
    setAreaQuery('');
    setCustQuery('');
    onChange(null);
    setTimeout(() => { setAreaOpen(true); areaInputRef.current?.focus(); }, 50);
  };

  const handleAreaKey = (e: React.KeyboardEvent) => {
    if (!areaOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) { setAreaOpen(true); setAreaCursor(0); return; }
    if (e.key === 'ArrowDown') { setAreaCursor(c => Math.min(c + 1, filteredAreas.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp')  { setAreaCursor(c => Math.max(c - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter')    { if (filteredAreas[areaCursor]) pickArea(filteredAreas[areaCursor]); e.preventDefault(); }
    else if (e.key === 'Escape')   setAreaOpen(false);
  };

  const handleCustKey = (e: React.KeyboardEvent) => {
    if (!custOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) { setCustOpen(true); setCustCursor(0); return; }
    if (e.key === 'ArrowDown') { setCustCursor(c => Math.min(c + 1, filteredCusts.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp')  { setCustCursor(c => Math.max(c - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter')    { if (filteredCusts[custCursor]) pickCust(filteredCusts[custCursor]); e.preventDefault(); }
    else if (e.key === 'Escape')   setCustOpen(false);
  };

  return (
    <div className="w-full space-y-2">
      {/* Step 1: Area */}
      <div className="relative">
        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">① Area</div>
        <input
          ref={areaInputRef}
          className={`w-full p-3 rounded-xl font-bold outline-none border-2 text-sm ${selectedArea ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-gray-50 border-transparent focus:border-blue-400'}`}
          placeholder="Type or select area..."
          value={areaOpen ? areaQuery : (selectedArea || '')}
          onFocus={() => { setAreaOpen(true); setAreaQuery(''); setAreaCursor(0); }}
          onChange={e => { setAreaQuery(e.target.value); setAreaCursor(0); setAreaOpen(true); }}
          onKeyDown={handleAreaKey}
          onBlur={() => setTimeout(() => setAreaOpen(false), 150)}
        />
        {selectedArea && !areaOpen && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 font-black text-sm" onMouseDown={e => { e.preventDefault(); resetArea(); }}>✕</button>
        )}
        {areaOpen && filteredAreas.length > 0 && (
          <ul ref={areaListRef} className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
            {filteredAreas.map((area: string, idx: number) => {
              const cnt = customers.filter((c: any) => c.sales_area === area).length;
              return (
                <li key={area} className={`px-4 py-2.5 cursor-pointer text-sm font-bold flex justify-between items-center border-b border-gray-50 last:border-0 ${idx === areaCursor ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                  onMouseDown={() => pickArea(area)} onMouseEnter={() => setAreaCursor(idx)}>
                  <span>📍 {area}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${idx === areaCursor ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>{cnt}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Step 2: Customer */}
      {selectedArea && (
        <div className="relative">
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
            ② Customer <span className="text-blue-500 normal-case font-bold">({filteredCusts.length} in {selectedArea})</span>
          </div>
          <input
            ref={custInputRef}
            className={`customer-area-input w-full p-3 rounded-xl font-bold outline-none border-2 text-sm ${selectedCust ? 'bg-green-50 border-green-400 text-green-800' : 'bg-gray-50 border-blue-200 focus:border-blue-400'}`}
            placeholder="Type or select customer..."
            value={custOpen ? custQuery : (selectedCust?.full_name || '')}
            onFocus={() => { setCustOpen(true); setCustQuery(''); setCustCursor(0); }}
            onChange={e => { setCustQuery(e.target.value); setCustCursor(0); setCustOpen(true); }}
            onKeyDown={handleCustKey}
            onBlur={() => setTimeout(() => setCustOpen(false), 150)}
          />
          {custOpen && filteredCusts.length > 0 && (
            <ul ref={custListRef} className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
              {filteredCusts.map((c: any, idx: number) => (
                <li key={c.id} className={`px-4 py-2.5 cursor-pointer text-sm font-bold border-b border-gray-50 last:border-0 ${idx === custCursor ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                  onMouseDown={() => pickCust(c)} onMouseEnter={() => setCustCursor(idx)}>
                  <div className="flex justify-between items-center">
                    <span>{c.full_name}</span>
                    <div className="flex gap-1">
                      {c.default_discount > 0 && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${idx === custCursor ? 'bg-blue-500 text-white' : 'bg-amber-100 text-amber-600'}`}>{c.default_discount}%</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${idx === custCursor ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{c.payment_type || 'Cash'}</span>
                    </div>
                  </div>
                  {c.phone && <div className={`text-[10px] font-normal mt-0.5 ${idx === custCursor ? 'text-blue-200' : 'text-gray-400'}`}>📞 {c.phone}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Customer search dropdown ────────────────────────────────────────────────
interface CustomerDropdownProps {
  customers: any[];
  value: string;
  onChange: (cust: any) => void;
  onEnter: () => void;
}

const CustomerDropdown = ({ customers, value, onChange, onEnter }: CustomerDropdownProps) => {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const [cursor, setCursor] = useState(0);
  const listRef             = useRef<HTMLUListElement>(null);

  const selectedName = customers.find(c => c.id === value)?.full_name || '';
  const filtered = query.length > 0
    ? customers.filter(c => c.full_name.toLowerCase().includes(query.toLowerCase()) || (c.sales_area || '').toLowerCase().includes(query.toLowerCase()))
    : customers;

  useEffect(() => {
    if (open && listRef.current) {
      const li = listRef.current.children[cursor] as HTMLElement;
      li?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor, open]);

  const select = (cust: any) => {
    onChange(cust);
    setOpen(false);
    setQuery('');
    onEnter();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); setCursor(0); return; }
    if (e.key === 'ArrowDown') { setCursor(c => Math.min(c + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setCursor(c => Math.max(c - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter') { if (filtered[cursor]) select(filtered[cursor]); e.preventDefault(); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative w-full">
      <input
        className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-blue-400"
        placeholder="Customer search..."
        value={open ? query : selectedName}
        onFocus={() => { setOpen(true); setQuery(''); setCursor(0); }}
        onChange={e => { setQuery(e.target.value); setCursor(0); }}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
        >
          {filtered.map((c, idx) => (
            <li
              key={c.id}
              className={`px-3 py-2 cursor-pointer text-sm font-bold flex justify-between ${idx === cursor ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
              onMouseDown={() => select(c)}
              onMouseEnter={() => setCursor(idx)}
            >
              <span>{c.full_name}</span>
              <span className={`text-xs ${idx === cursor ? 'text-blue-200' : 'text-gray-400'}`}>{c.sales_area}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const SalesInvoice = () => {
  const { company } = useCompany();
  const location = useLocation() as any;
  const lastLoadedInvoiceId = useRef<string | null>(null);
  const invoiceIdFromRoute = location?.state?.invoiceId || new URLSearchParams(location?.search || '').get('edit');

  const vehicleRef  = useRef<HTMLInputElement>(null);
  const driverRef   = useRef<HTMLInputElement>(null);
  const dispatchRef = useRef<HTMLInputElement>(null);
  const casesRefs   = useRef<(HTMLInputElement | null)[]>([]);
  const bottlesRefs = useRef<(HTMLInputElement | null)[]>([]);
  const priceRefs   = useRef<(HTMLInputElement | null)[]>([]);
  const discRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const freeRefs    = useRef<(HTMLInputElement | null)[]>([]);

  const [customers, setCustomers]               = useState<any[]>([]);
  const [stock, setStock]                       = useState<any[]>([]);
  const [customerDetails, setCustomerDetails]   = useState<any>(null);
  const [vehicleNo, setVehicleNo]               = useState('');
  const [driverName, setDriverName]             = useState('');
  const [dispatchNo, setDispatchNo]             = useState('');
  const [invoiceDate, setInvoiceDate]           = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo]               = useState('Loading...');
  const [isSaving, setIsSaving]                 = useState(false);
  const [orientation, setOrientation]           = useState<'portrait'|'landscape'>('portrait');
  const [items, setItems]                       = useState([{ inventory_id: '', cases: '' as any, qty_bottles: '' as any, units_per_case: 12, unit_price: 0, mrp_price: 0, special_price: 0, item_discount_per: 0, is_free: false, total: 0 }]);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [draftList, setDraftList]               = useState<any[]>([]);
  const [showDrafts, setShowDrafts]             = useState(false);
  const [searchQuery, setSearchQuery]           = useState('');
  const [searchResults, setSearchResults]       = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices]     = useState<any[]>([]);

  const LOGO_URL = "https://ozbeyvqaxerstipdehkb.supabase.co/storage/v1/object/public/company-assets/wvwrmark%20logo%20(1).jpg";

  useEffect(() => { if (company) fetchData(); }, [company]);

  useEffect(() => {
    const invoiceId = invoiceIdFromRoute;
    if (!invoiceId || !company?.id) return;
    if (lastLoadedInvoiceId.current === invoiceId) return;
    lastLoadedInvoiceId.current = invoiceId;
    (async () => {
      await fetchData();
      const { data, error } = await supabase.from('invoices').select('*, customers(*)').eq('company_id', company.id).eq('id', invoiceId).single();
      if (error) { alert('Error loading invoice: ' + error.message); return; }
      await loadInvoiceForEdit(data);
    })().catch(err => { lastLoadedInvoiceId.current = null; alert('Error: ' + String(err)); });
  }, [company?.id, invoiceIdFromRoute]);

  const fetchData = async () => {
    try {
      const { data: custData } = await supabase.from('customers').select('*').eq('company_id', company?.id).order('full_name');
      setCustomers(custData || []);
      const { data: stockData } = await supabase.from('inventory').select('*').eq('company_id', company?.id).order('name', { ascending: true });
      setStock(stockData || []);
      if (!editingInvoiceId) generateNextInvoiceNo();
      fetchRecentInvoices();
    fetchDrafts();
    } catch (err) { console.error('fetchData error:', err); }
  };

  const fetchRecentInvoices = async () => {
    const { data } = await supabase.from('invoices').select('*, customers(full_name, address)').eq('company_id', company?.id).order('created_at', { ascending: false }).limit(10);
    setRecentInvoices(data || []);
  };

  const fetchDrafts = async () => {
    const { data } = await supabase
      .from('draft_invoices')
      .select('*, customers(full_name)')
      .eq('company_id', company?.id)
      .eq('status', 'Draft')
      .order('created_at', { ascending: false })
      .limit(20);
    setDraftList(data || []);
  };

  const getFreshInvoiceNo = async (): Promise<string> => {
    // Get MAX invoice number from DB - most reliable approach
    const { data } = await supabase
      .from('invoices')
      .select('invoice_no')
      .eq('company_id', company?.id)
      .ilike('invoice_no', 'INV-%');
    if (data && data.length > 0) {
      const maxNum = data.reduce((max, d) => {
        const parts = d.invoice_no?.split('-') || [];
        const num = parts.length > 1 ? parseInt(parts[parts.length - 1]) || 0 : 0;
        return num > max ? num : max;
      }, 0);
      return `INV-${(maxNum + 1).toString().padStart(5, '0')}`;
    }
    return 'INV-00001';
  };

  const generateNextInvoiceNo = async () => {
    const next = await getFreshInvoiceNo();
    setInvoiceNo(next);
  };

  const searchInvoices = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from('invoices').select('*, customers(*)').eq('company_id', company?.id).ilike('invoice_no', `%${query}%`).limit(5);
    setSearchResults(data || []);
  };

  const loadInvoiceForEdit = async (inv: any) => {
    setIsSaving(true);
    try {
      const { data: invItems, error } = await supabase.from('invoice_items').select(`*, inventory:inventory_id ( bottles_per_case )`).eq('invoice_id', inv.id);
      if (error) throw error;
      const loadedItems = (invItems || []).map(item => ({
        inventory_id:      item.inventory_id,
        cases:             item.quantity || 0,
        qty_bottles:       item.qty_bottles || 0,
        units_per_case:    item.inventory?.bottles_per_case || 12,
        unit_price:        Number(item.unit_price) || 0,
        mrp_price:         Number(item.unit_price) || 0,
        special_price:     0,
        item_discount_per: Number(item.item_discount_per) || 0,
        is_free:           !!item.is_free || Number(item.total) === 0,
        total:             Number(item.total) || 0
      }));
      setEditingInvoiceId(inv.id);
      setInvoiceNo(inv.invoice_no);
      setInvoiceDate(inv.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setVehicleNo(inv.vehicle_no || '');
      setDriverName(inv.driver_name || '');
      setDispatchNo(inv.dispatch_no || '');
      let cust = customers.find(c => c.id === inv.customer_id);
      if (!cust && inv.customer_id) {
        const { data: cd } = await supabase.from('customers').select('*').eq('id', inv.customer_id).single();
        cust = cd || null;
      }
      setCustomerDetails(cust || null);
      setItems(loadedItems.length > 0 ? loadedItems : [{ inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, mrp_price: 0, special_price: 0, item_discount_per: 0, is_free: false, total: 0 }]);
      setSearchResults([]);
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert("Error loading invoice: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingInvoiceId(null);
    setItems([{ inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, mrp_price: 0, special_price: 0, item_discount_per: 0, is_free: false, total: 0 }]);
    setVehicleNo(''); setDriverName(''); setDispatchNo('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setCustomerDetails(null); setSearchQuery(''); setSearchResults([]);
    sessionStorage.removeItem('_activeDraftId');
    fetchData();
    generateNextInvoiceNo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateLineTotal = (line: any) => {
    const upc = Number(line.units_per_case) || 12;
    const totalUnits = (Number(line.cases || 0) * upc) + Number(line.qty_bottles || 0);
    const gross = (totalUnits / upc) * Number(line.unit_price || 0);
    return line.is_free ? 0 : gross - (gross * (Number(line.item_discount_per || 0) / 100));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'inventory_id') {
      const prod = stock.find(s => s.id === value);
      if (prod) {
        newItems[index].mrp_price     = prod.price || 0;
        newItems[index].special_price = prod.special_price || 0;
        newItems[index].units_per_case = prod.bottles_per_case || 12;
        // Auto pick price based on discount
        const disc = Number(newItems[index].item_discount_per || 0);
        newItems[index].unit_price = (disc > 40 && prod.special_price)
          ? prod.special_price
          : prod.price || 0;
      }
    }

    // Discount change → auto switch price
    if (field === 'item_discount_per') {
      const disc = parseFloat(value) || 0;
      const mrp  = newItems[index].mrp_price || newItems[index].unit_price;
      const sp   = newItems[index].special_price || 0;
      if (disc > 40 && sp) {
        newItems[index].unit_price = sp;
      } else if (disc <= 40 && mrp) {
        newItems[index].unit_price = mrp;
      }
    }

    newItems[index].total = calculateLineTotal(newItems[index]);
    setItems(newItems);
  };

  const addNewRow = useCallback(() => {
    const disc = customerDetails ? Number(customerDetails.default_discount ?? 0) : 0;
    setItems(prev => [...prev, { inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, mrp_price: 0, special_price: 0, item_discount_per: disc, is_free: false, total: 0 }]);
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLElement>('.item-dropdown-input');
      (inputs[inputs.length - 1] as HTMLElement)?.focus();
    }, 50);
  }, [customerDetails]);

  const applyCustomerDiscountToAllLines = (discountPer: number) => {
    setItems(prev => prev.map(it => ({ ...it, item_discount_per: discountPer, total: calculateLineTotal({ ...it, item_discount_per: discountPer }) })));
  };

  const clearAllItems = () => {
    if (!window.confirm('Clear all item lines?')) return;
    setItems([{ inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, mrp_price: 0, special_price: 0, item_discount_per: 0, is_free: false, total: 0 }]);
  };

  const markAllFree = (flag: boolean) => {
    if (!window.confirm(flag ? 'Mark ALL items as FREE?' : 'Remove FREE status from ALL items?')) return;
    setItems(prev => prev.map(it => { const l = { ...it, is_free: flag }; return { ...l, total: calculateLineTotal(l) }; }));
  };

  const duplicateLastRow = () => {
    if (items.length === 0) return;
    setItems(prev => [...prev, { ...prev[prev.length - 1] }]);
  };

  const loadLastInvoiceItemsForCustomer = async () => {
    if (!customerDetails?.id) { alert('Please select a customer first.'); return; }
    if (items.some(it => it.inventory_id) && !window.confirm('Replace current item list with last invoice items?')) return;
    setIsSaving(true);
    try {
      const { data: lastInv } = await supabase.from('invoices').select('id').eq('company_id', company?.id).eq('customer_id', customerDetails.id).order('created_at', { ascending: false }).limit(1).single();
      if (!lastInv) { alert('No previous invoice found for this customer.'); return; }
      const { data: invItems, error } = await supabase.from('invoice_items').select(`*, inventory:inventory_id ( bottles_per_case )`).eq('invoice_id', lastInv.id);
      if (error) throw error;
      const loadedItems = (invItems || []).map(item => ({
        inventory_id:      item.inventory_id,
        cases:             item.quantity || 0,
        qty_bottles:       item.qty_bottles || 0,
        units_per_case:    item.inventory?.bottles_per_case || 12,
        unit_price:        Number(item.unit_price) || 0,
        mrp_price:         Number(item.unit_price) || 0,
        special_price:     0,
        item_discount_per: Number(item.item_discount_per) || 0,
        is_free:           !!item.is_free,
        total:             Number(item.total) || 0
      }));
      setItems(loadedItems.length > 0 ? loadedItems : items);
    } catch (err: any) {
      alert('Error loading last invoice: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!customerDetails) { alert('Please select a customer first!'); return; }
    if (isSaving) return;
    setIsSaving(true);
    try {
      const draftNo = `DRF-${Date.now().toString().slice(-6)}`;
      const totalAmt = items.reduce((a, i) => a + Number(i.total || 0), 0);
      const { data: draft, error: de } = await supabase
        .from('draft_invoices')
        .insert([{ company_id: company?.id, customer_id: customerDetails.id, draft_no: draftNo,
          vehicle_no: vehicleNo, driver_name: driverName, dispatch_no: dispatchNo,
          draft_date: invoiceDate, total_amount: totalAmt, status: 'Draft' }])
        .select().single();
      if (de) throw de;
      const draftItems = items.filter(i => i.inventory_id).map(i => ({
        draft_id: draft.id, company_id: company?.id, inventory_id: i.inventory_id,
        cases: Number(i.cases||0), qty_bottles: Number(i.qty_bottles||0),
        units_per_case: Number(i.units_per_case||12), unit_price: Number(i.unit_price||0),
        item_discount_per: Number(i.item_discount_per||0), is_free: !!i.is_free, total: Number(i.total||0),
      }));
      await supabase.from('draft_invoice_items').insert(draftItems);
      alert(`✅ Draft ${draftNo} saved!`);
      fetchDrafts();
      setShowDrafts(true);
    } catch (err: any) {
      alert('Draft save failed: ' + err.message);
    } finally { setIsSaving(false); }
  };

  const loadDraftForEdit = async (draft: any) => {
    setIsSaving(true);
    try {
      const { data: di } = await supabase
        .from('draft_invoice_items')
        .select('*, inventory:inventory_id(bottles_per_case)')
        .eq('draft_id', draft.id);
      const loadedItems = (di || []).map((item: any) => ({
        inventory_id: item.inventory_id, cases: item.cases || 0, qty_bottles: item.qty_bottles || 0,
        units_per_case: item.inventory?.bottles_per_case || 12, unit_price: Number(item.unit_price) || 0,
        mrp_price: Number(item.unit_price) || 0, special_price: 0,
        item_discount_per: Number(item.item_discount_per) || 0, is_free: !!item.is_free, total: Number(item.total) || 0,
      }));
      let cust = customers.find(c => c.id === draft.customer_id);
      if (!cust) { const { data: cd } = await supabase.from('customers').select('*').eq('id', draft.customer_id).single(); cust = cd; }
      setCustomerDetails(cust || null);
      setVehicleNo(draft.vehicle_no || '');
      setDriverName(draft.driver_name || '');
      setDispatchNo(draft.dispatch_no || '');
      setInvoiceDate(draft.draft_date || new Date().toISOString().split('T')[0]);
      setItems(loadedItems.length > 0 ? loadedItems : [{ inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, mrp_price: 0, special_price: 0, item_discount_per: 0, is_free: false, total: 0 }]);
      setShowDrafts(false);
      sessionStorage.setItem('_activeDraftId', draft.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) { alert('Error loading draft: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handleSaveInvoice = async () => {
    if (!customerDetails || items.every(i => !i.inventory_id)) {
      alert("Please select a customer and at least one item");
      return;
    }
    for (const item of items) {
      if (!item.inventory_id) continue;
      const { data: sd } = await supabase.from('inventory').select('quantity, name').eq('id', item.inventory_id).single();
      const deduct = (Number(item.cases || 0) * Number(item.units_per_case)) + Number(item.qty_bottles || 0);
      if ((sd?.quantity || 0) < deduct) {
        const msg = `Stock අඩුයි! ${sd?.name || 'Item'} - ඕනේ ${deduct} btl, තියෙන්නේ ${sd?.quantity || 0} btl.\n\nNegative stock කරලා save කරන්නද?`;
        if (!window.confirm(msg)) return;
      }
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      const originalInvoiceNo = invoiceNo;
      const freshInvoiceNo = editingInvoiceId ? invoiceNo : await getFreshInvoiceNo();
      setInvoiceNo(freshInvoiceNo);

      const itemsForRPC = items.filter(i => i.inventory_id).map(i => ({
        inventory_id:      i.inventory_id,
        cases:             Number(i.cases || 0),
        qty_bottles:       Number(i.qty_bottles || 0),
        unit_price:        Number(i.unit_price || 0),
        item_discount_per: Number(i.item_discount_per || 0),
        is_free:           !!i.is_free,
        total:             Number(i.total || 0)
      }));

      const { error } = await supabase.rpc('create_invoice_and_deduct_stock', {
        p_company_id:  company?.id,
        p_customer_id: customerDetails.id,
        p_invoice_no:  freshInvoiceNo,
        p_vehicle_no:  vehicleNo,
        p_driver_name: driverName,
        p_dispatch_no: dispatchNo,
        p_date:        invoiceDate,
        p_items:       itemsForRPC,
        p_invoice_id:  editingInvoiceId || null
      });
      if (error) throw error;

      await supabase.from('customer_ledger').delete().eq('customer_id', customerDetails.id).eq('type', 'Invoice').eq('reference', editingInvoiceId ? originalInvoiceNo : freshInvoiceNo);
      const { error: ledgerError } = await supabase.from('customer_ledger').insert([{
        company_id:  company?.id,
        customer_id: customerDetails.id,
        date:        invoiceDate,
        type:        'Invoice',
        reference:   freshInvoiceNo,
        description: `Invoice ${freshInvoiceNo} | ${invoiceDate} | LKR ${totalNet.toLocaleString()}`,
        debit:       totalNet,
        credit:      0,
        status:      'Open'
      }]);
      if (ledgerError) console.warn('Ledger insert warn:', ledgerError.message);

      const activeDraftId = sessionStorage.getItem('_activeDraftId');
      if (activeDraftId) {
        await supabase.from('draft_invoices').update({ status: 'Converted' }).eq('id', activeDraftId);
        sessionStorage.removeItem('_activeDraftId');
      }
      await logActivity({ company_id: company?.id || '', module: 'SALES', action: editingInvoiceId ? 'INVOICE_UPDATED' : 'INVOICE_CREATED', details: { invoice_no: freshInvoiceNo, customer: customerDetails?.full_name, total: totalNet } });
      alert(`✅ Invoice ${freshInvoiceNo} ${editingInvoiceId ? 'updated' : 'saved'} successfully!`);
      window.print();
      resetForm();
      fetchRecentInvoices();
    } catch (err: any) {
      console.error('Save error:', err);
      alert("Save failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const totalNet            = items.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalCases          = items.reduce((acc, i) => acc + Number(i.cases || 0), 0);
  const totalFreeCases      = items.reduce((acc, i) => acc + (i.is_free ? Number(i.cases || 0) : 0), 0);
  const totalDiscountAmount = items.reduce((acc, i) => {
    const upc = Number(i.units_per_case) || 12;
    const totalUnits = (Number(i.cases || 0) * upc) + Number(i.qty_bottles || 0);
    const gross = (totalUnits / upc) * Number(i.unit_price || 0);
    return acc + (gross - Number(i.total || 0));
  }, 0);

  // Items with product names for print template
  const itemsWithNames = items.map(item => ({
    ...item,
    name: stock.find(s => s.id === item.inventory_id)?.name || ''
  }));

  return (
    <div className="p-4 bg-gray-50 min-h-screen print:bg-white print:p-0">
      {/* Dynamic @page orientation */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 ${orientation}; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}} />

      {/* SEARCH */}
      <div className="max-w-6xl mx-auto no-print bg-white p-6 rounded-[2rem] shadow-sm border mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black flex items-center gap-2"><Search size={18}/> SEARCH INVOICE</h2>
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search INV-XXXXX"
              className="w-full p-3 bg-gray-100 rounded-xl font-bold outline-none"
              value={searchQuery}
              onChange={(e) => searchInvoices(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-xl mt-2 z-50 border">
                {searchResults.map(inv => (
                  <div key={inv.id} onClick={() => loadInvoiceForEdit(inv)} className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between border-b">
                    <span className="font-bold">{inv.invoice_no}</span>
                    <span className="text-xs uppercase">{inv.customers?.full_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN FORM */}
      <div className="max-w-6xl mx-auto no-print bg-white p-8 rounded-[2rem] shadow-xl border mb-6">
        <div className="flex justify-between items-center border-b pb-6 mb-6">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="Logo" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-2xl font-black">{editingInvoiceId ? 'EDIT' : 'NEW'} INVOICE</h1>
              <p className="font-bold text-blue-600">{invoiceNo}</p>
              {editingInvoiceId && (
                <button onClick={resetForm} className="mt-1 text-xs font-bold text-red-500 hover:text-red-700 uppercase">
                  ✕ Cancel Edit
                </button>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400">NET TOTAL</p>
            <h2 className="text-3xl font-black text-blue-600">LKR {totalNet.toLocaleString()}</h2>
          </div>
        </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="col-span-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Customer</label>
            <AreaCustomerDropdown
              customers={customers}
              value={customerDetails?.id || ''}
              onChange={cust => {
                setCustomerDetails(cust);
                const disc = cust ? Number(cust.default_discount ?? 0) : 0;
                if (disc > 0) applyCustomerDiscountToAllLines(disc);
              }}
              onEnter={() => vehicleRef.current?.focus()}
            />
            {customerDetails?.default_discount > 0 && (
              <p className="text-[10px] font-bold text-amber-600 mt-1">Default discount: {customerDetails.default_discount}%</p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Vehicle No</label>
            <input
              ref={vehicleRef}
              className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-blue-400"
              placeholder="AB-1234"
              value={vehicleNo}
              onChange={e => setVehicleNo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); driverRef.current?.focus(); } }}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Driver Name</label>
            <input
              ref={driverRef}
              className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-blue-400"
              placeholder="Driver name"
              value={driverName}
              onChange={e => setDriverName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); dispatchRef.current?.focus(); } }}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Dispatch No</label>
            <input
              ref={dispatchRef}
              className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none border border-transparent focus:border-blue-400"
              placeholder="DSP-XXXXX"
              value={dispatchNo}
              onChange={e => setDispatchNo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.querySelector<HTMLElement>('.item-dropdown-input')?.focus(); } }}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
            <input type="date" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
          <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Item List</div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
            <button onClick={clearAllItems} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Clear Lines</button>
            <button onClick={duplicateLastRow} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Duplicate Last</button>
            <button onClick={() => markAllFree(true)} className="px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700">All Free</button>
            <button onClick={() => markAllFree(false)} className="px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700">Remove Free</button>
            <button onClick={loadLastInvoiceItemsForCustomer} className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-black" disabled={isSaving}>Use Last Invoice</button>
          </div>
        </div>

        {/* Items - Mobile Cards */}
        <div className="lg:hidden space-y-2 mb-4">
          {items.map((item, i) => (
            <div key={i} className={`rounded-2xl p-3 border ${item.is_free ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 shadow-sm'}`}>
              {/* Row 1: Item + Delete */}
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <ItemDropdown stock={stock} value={item.inventory_id}
                    onChange={val => updateItem(i, 'inventory_id', val)}
                    onEnter={() => casesRefs.current[i]?.focus()} />
                </div>
                <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="p-2 text-red-400 bg-red-50 rounded-xl self-start">
                  <Trash2 size={14}/>
                </button>
              </div>
              {/* Row 2: CS | BT | Price | Disc | Free */}
              <div className="grid grid-cols-5 gap-1.5">
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase mb-1">CS</p>
                  <input type="number" ref={el => { casesRefs.current[i] = el; }}
                    className="w-full p-2 bg-blue-50 text-center font-black rounded-lg outline-none text-sm"
                    value={item.cases} onChange={e => updateItem(i, 'cases', e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); bottlesRefs.current[i]?.focus(); }}} />
                </div>
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase mb-1">BT</p>
                  <input type="number" ref={el => { bottlesRefs.current[i] = el; }}
                    className="w-full p-2 bg-gray-50 text-center font-bold rounded-lg outline-none text-sm"
                    value={item.qty_bottles} onChange={e => updateItem(i, 'qty_bottles', e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); priceRefs.current[i]?.focus(); }}} />
                </div>
                <div>
                  <p className="text-[7px] font-black text-blue-400 uppercase mb-1">Price</p>
                  <input type="number" step="0.01" ref={el => { priceRefs.current[i] = el; }}
                    className={`w-full p-2 text-center font-black rounded-lg outline-none text-sm ${item.special_price > 0 && item.unit_price === item.special_price ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-800'}`}
                    value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value)||0)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); discRefs.current[i]?.focus(); }}} placeholder="0" />
                </div>
                <div>
                  <p className="text-[7px] font-black text-amber-500 uppercase mb-1">Disc%</p>
                  <input type="number" step="0.01" ref={el => { discRefs.current[i] = el; }}
                    className={`w-full p-2 text-center font-bold rounded-lg outline-none text-sm ${Number(item.item_discount_per||0) > 40 ? 'bg-red-50 text-red-700' : 'bg-amber-50'}`}
                    value={item.item_discount_per || ''} onChange={e => updateItem(i, 'item_discount_per', parseFloat(e.target.value)||0)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); freeRefs.current[i]?.focus(); }}} />
                </div>
                <div>
                  <p className="text-[7px] font-black text-emerald-500 uppercase mb-1">Free</p>
                  <div className="flex items-center justify-center h-9">
                    <input type="checkbox" ref={el => { freeRefs.current[i] = el; }}
                      checked={!!item.is_free} onChange={e => updateItem(i, 'is_free', e.target.checked)}
                      className="w-5 h-5 accent-emerald-600"
                      onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); if (i===items.length-1){addNewRow();}else{document.querySelectorAll<HTMLElement>('.item-dropdown-input')[i+1]?.focus();} }}} />
                  </div>
                </div>
              </div>
              {/* Row 3: Total */}
              <div className="flex justify-between items-center mt-1.5">
                {item.special_price > 0 && item.unit_price === item.special_price && <span className="text-[8px] text-orange-500 font-black">🔥 SPECIAL</span>}
                <span className="ml-auto font-black text-blue-600 text-sm">LKR {Number(item.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Items - Desktop Table */}
        <table className="hidden lg:table w-full mb-6">
          <thead>
            <tr className="bg-gray-900 text-white text-[10px] uppercase">
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-center">CS</th>
              <th className="p-3 text-center">BT</th>
              <th className="p-3 text-right text-gray-500">MRP</th>
              <th className="p-3 text-right text-blue-300">Price ✏️</th>
              <th className="p-3 text-center">Disc %</th>
              <th className="p-3 text-center">Free</th>
              <th className="p-3 text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="p-2 w-1/3">
                  <ItemDropdown stock={stock} value={item.inventory_id}
                    onChange={val => updateItem(i, 'inventory_id', val)}
                    onEnter={() => casesRefs.current[i]?.focus()} />
                </td>
                <td className="p-2">
                  <input type="number" ref={el => { casesRefs.current[i] = el; }}
                    className="w-full p-2 bg-blue-50 text-center font-bold rounded-lg outline-none border border-transparent focus:border-blue-400"
                    value={item.cases} onChange={e => updateItem(i, 'cases', e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); bottlesRefs.current[i]?.focus(); }}} />
                </td>
                <td className="p-2">
                  <input type="number" ref={el => { bottlesRefs.current[i] = el; }}
                    className="w-full p-2 bg-gray-50 text-center rounded-lg outline-none border border-transparent focus:border-blue-400"
                    value={item.qty_bottles} onChange={e => updateItem(i, 'qty_bottles', e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); priceRefs.current[i]?.focus(); }}} />
                </td>
                <td className="p-2 text-right text-xs text-gray-300 font-bold">
                  {item.mrp_price > 0 ? Number(item.mrp_price).toFixed(2) : ''}
                </td>
                <td className="p-2">
                  <input type="number" step="0.01" min="0" ref={el => { priceRefs.current[i] = el; }}
                    className={`w-full p-2 text-right font-black rounded-lg outline-none border transition-colors ${item.special_price > 0 && item.unit_price === item.special_price ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-blue-50 border-blue-200 text-blue-800 focus:border-blue-500'}`}
                    value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value)||0)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); discRefs.current[i]?.focus(); }}} placeholder="0.00" />
                  {item.special_price > 0 && item.unit_price === item.special_price && (
                    <p className="text-[8px] text-orange-500 font-black text-right">🔥 SPECIAL</p>
                  )}
                </td>
                <td className="p-2">
                  <input type="number" step="0.01" min="0" max="100" ref={el => { discRefs.current[i] = el; }}
                    className={`w-full p-2 text-center font-bold rounded-lg border outline-none ${Number(item.item_discount_per||0) > 40 ? 'bg-red-50 border-red-300 text-red-700' : 'bg-amber-50 border-amber-200 focus:border-amber-400'}`}
                    value={item.item_discount_per || ''} onChange={e => updateItem(i, 'item_discount_per', parseFloat(e.target.value)||0)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); freeRefs.current[i]?.focus(); }}} />
                </td>
                <td className="p-2 text-center">
                  <input type="checkbox" ref={el => { freeRefs.current[i] = el; }}
                    checked={!!item.is_free} onChange={e => updateItem(i, 'is_free', e.target.checked)}
                    onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); if (i===items.length-1){addNewRow();}else{document.querySelectorAll<HTMLElement>('.item-dropdown-input')[i+1]?.focus();} }}} />
                </td>
                <td className="p-2 text-right font-bold text-blue-600">{Number(item.total).toFixed(2)}</td>
                <td className="p-2">
                  <button onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                    <Trash2 size={16} className="text-red-300"/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl text-white">
          <div className="flex gap-8">
            <div><p className="text-[10px] text-gray-400">TOTAL CASES</p><p className="text-xl font-bold">{totalCases}</p></div>
            <div><p className="text-[10px] text-gray-400">FREE CASES</p><p className="text-xl font-bold">{totalFreeCases}</p></div>
            <div><p className="text-[10px] text-gray-400">DISCOUNT</p><p className="text-xl font-bold">LKR {totalDiscountAmount.toFixed(2)}</p></div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Portrait / Landscape toggle */}
            <div className="flex bg-gray-700 rounded-xl p-1 gap-1">
              <button
                onClick={() => setOrientation('portrait')}
                title="Portrait"
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${orientation==='portrait' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-white'}`}>
                <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><rect x="0" y="0" width="10" height="14" rx="1.5" opacity="0.3"/><rect x="1" y="1" width="8" height="12" rx="1"/></svg>
                Portrait
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                title="Landscape"
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${orientation==='landscape' ? 'bg-white text-gray-900 shadow' : 'text-gray-400 hover:text-white'}`}>
                <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="0" width="14" height="10" rx="1.5" opacity="0.3"/><rect x="1" y="1" width="12" height="8" rx="1"/></svg>
                Landscape
              </button>
            </div>
            <button onClick={addNewRow} className="bg-gray-700 px-6 py-3 rounded-xl font-bold text-xs uppercase">+ Item</button>
            <button onClick={handleSaveDraft} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 uppercase text-white">
              📝 Save Draft
            </button>
            <button onClick={handleSaveInvoice} disabled={isSaving} className="bg-blue-600 px-10 py-3 rounded-xl font-bold text-xs flex items-center gap-2 uppercase">
              {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
              {editingInvoiceId ? "Update & Print" : "Save & Print"}
            </button>
          </div>
        </div>
      </div>

      {/* RECENT INVOICES */}
      <div className="max-w-6xl mx-auto no-print bg-white p-6 rounded-[2rem] border shadow-sm">
        <h3 className="font-black mb-4 flex items-center gap-2 uppercase"><List size={18} /> Recent Invoices</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 uppercase text-[10px] border-b">
              <th className="p-3 text-left">No</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {recentInvoices.map(inv => (
              <tr key={inv.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-bold text-blue-600">#{inv.invoice_no}</td>
                <td className="p-3 uppercase font-bold">{inv.customers?.full_name}</td>
                <td className="p-3 text-right font-bold">LKR {inv.total_amount?.toLocaleString()}</td>
                <td className="p-3 text-center">
                  <button onClick={() => loadInvoiceForEdit(inv)} className="p-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs flex items-center gap-1 mx-auto">
                    <Edit size={14}/> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DRAFTS PANEL */}
      <div className="max-w-6xl mx-auto no-print bg-white p-6 rounded-[2rem] border shadow-sm mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-black flex items-center gap-2 text-sm uppercase text-amber-600">
            📝 Draft Invoices
            {draftList.length > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">{draftList.length}</span>}
          </h3>
          <button onClick={() => setShowDrafts(!showDrafts)} className="text-xs font-bold text-gray-400 hover:text-gray-700">
            {showDrafts ? '▲ Hide' : '▼ Show'}
          </button>
        </div>
        {showDrafts && (draftList.length === 0 ? (
          <p className="text-gray-400 text-sm">No drafts saved.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-[10px] uppercase border-b">
              <th className="p-2 text-left">Draft No</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-center">Action</th>
            </tr></thead>
            <tbody>
              {draftList.map(d => (
                <tr key={d.id} className="border-b hover:bg-amber-50">
                  <td className="p-2 font-bold text-amber-600">📝 {d.draft_no}</td>
                  <td className="p-2 font-bold uppercase">{d.customers?.full_name}</td>
                  <td className="p-2 text-gray-500 font-bold">{d.draft_date}</td>
                  <td className="p-2 text-right font-bold">LKR {Number(d.total_amount).toLocaleString()}</td>
                  <td className="p-2 text-center">
                    <button onClick={() => loadDraftForEdit(d)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] uppercase">
                      Load → Convert
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>

      {/* ── PRINT AREA - screen hide, print වෙද්දී show ── */}
      <div className="hidden print:block">
        <InvoiceTemplate
          invoiceNo={invoiceNo}
          invoiceDate={invoiceDate}
          vehicleNo={vehicleNo}
          driverName={driverName}
          dispatchNo={dispatchNo}
          customerDetails={customerDetails}
          items={itemsWithNames}
          company={company}
          logoUrl={LOGO_URL}
        />
      </div>

    </div>
  );
};

export default SalesInvoice;

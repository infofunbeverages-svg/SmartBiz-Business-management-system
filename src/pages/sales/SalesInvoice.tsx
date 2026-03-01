import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Trash2, Save, Loader2, Search, List, Edit } from 'lucide-react';
import { useCompany } from '../../utils/useCompany';
import { useLocation } from 'react-router-dom';

// අගය වචනයෙන් ලියන Function එක
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

const SalesInvoice = () => {
  const { company } = useCompany();
  const location = useLocation() as any;
  const lastLoadedInvoiceId = useRef<string | null>(null);
  const invoiceIdFromRoute = location?.state?.invoiceId || new URLSearchParams(location?.search || '').get('edit');
  const [customers, setCustomers] = useState<any[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [stock, setStock] = useState<any[]>([]);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [dispatchNo, setDispatchNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]); 
  const [invoiceNo, setInvoiceNo] = useState('Loading...'); 
  const [isSaving, setIsSaving] = useState(false); 
  const [items, setItems] = useState([{ inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, item_discount_per: 0, is_free: false, total: 0 }]);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]); 

  const LOGO_URL = "https://ozbeyvqaxerstipdehkb.supabase.co/storage/v1/object/public/company-assets/wvwrmark%20logo%20(1).jpg";

  useEffect(() => { if (company) fetchData(); }, [company]);

  useEffect(() => {
    const invoiceId = invoiceIdFromRoute;
    if (!invoiceId || !company?.id) return;
    if (lastLoadedInvoiceId.current === invoiceId) return;
    lastLoadedInvoiceId.current = invoiceId;

    (async () => {
      await fetchData();
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(*)')
        .eq('company_id', company.id)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      await loadInvoiceForEdit(data);
    })().catch((err: any) => {
      alert('Error loading invoice: ' + (err?.message || String(err)));
      lastLoadedInvoiceId.current = null;
    });
  }, [company?.id, invoiceIdFromRoute]);

  const fetchData = async () => {
    const { data: custData } = await supabase.from('customers').select('*').eq('company_id', company?.id).order('full_name');
    const uniqueAreas = Array.from(new Set(custData?.map(c => c.sales_area).filter(Boolean))) as string[];
    setAreas(uniqueAreas.sort());
    setCustomers(custData || []);

    const { data: stockData } = await supabase.from('inventory').select('*').eq('company_id', company?.id).order('name', { ascending: true });
    setStock(stockData || []);
    if (!editingInvoiceId) generateNextInvoiceNo();
    fetchRecentInvoices(); 
  };

  const fetchRecentInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, customers(full_name, address)')
      .eq('company_id', company?.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentInvoices(data || []);
  };

  const generateNextInvoiceNo = async () => {
    const { data } = await supabase.from('invoices').select('invoice_no').eq('company_id', company?.id).order('invoice_no', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const lastNo = data[0].invoice_no;
      const parts = lastNo.split('-');
      const numericPart = parts.length > 1 ? parseInt(parts[1]) : 0;
      setInvoiceNo(`INV-${(numericPart + 1).toString().padStart(5, '0')}`);
    } else { setInvoiceNo('INV-00001'); }
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
      const { data: invItems, error } = await supabase
        .from('invoice_items')
        .select(`*, inventory:inventory_id ( bottles_per_case )`)
        .eq('invoice_id', inv.id);

      if (error) throw error;

      const loadedItems = (invItems || []).map(item => ({
        inventory_id: item.inventory_id,
        cases: item.quantity || 0,
        qty_bottles: item.qty_bottles || 0,
        units_per_case: item.inventory?.bottles_per_case || 12,
        unit_price: Number(item.unit_price) || 0,
        item_discount_per: Number(item.item_discount_per) || 0,
        is_free: !!item.is_free || Number(item.total) === 0,
        total: Number(item.total) || 0
      }));

      setEditingInvoiceId(inv.id);
      setInvoiceNo(inv.invoice_no);
      setInvoiceDate(inv.created_at.split('T')[0]);
      setVehicleNo(inv.vehicle_no || '');
      setDriverName(inv.driver_name || '');
      setDispatchNo(inv.dispatch_no || '');
      
      let cust = customers.find(c => c.id === inv.customer_id);
      if (!cust && inv.customer_id) {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', inv.customer_id)
          .single();
        cust = custData || null;
      }
      setCustomerDetails(cust || null);
      if (cust?.sales_area) setSelectedArea(cust.sales_area);

      setItems(loadedItems.length > 0 ? loadedItems : [{ inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, item_discount_per: 0, is_free: false, total: 0 }]);
      setSearchResults([]);
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) { 
      alert("Error: " + err.message);
    } finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setEditingInvoiceId(null);
    setItems([{ inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, item_discount_per: 0, is_free: false, total: 0 }]);
    setVehicleNo(''); setDriverName(''); setDispatchNo(''); setCustomerDetails(null);
    setSearchQuery(''); setSearchResults([]);
    fetchData();
  };

  const calculateLineTotal = (line: any) => {
    const upc = Number(line.units_per_case) || 12;
    const totalUnits = (Number(line.cases || 0) * upc) + Number(line.qty_bottles || 0);
    const gross = (totalUnits / upc) * Number(line.unit_price || 0);
    return line.is_free
      ? 0
      : gross - (gross * (Number(line.item_discount_per || 0) / 100));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items] as any[];
    newItems[index][field] = value;

    if (field === 'inventory_id') {
      const prod = stock.find(s => s.id === value);
      if (prod) {
        newItems[index].unit_price = prod.price || 0;
        newItems[index].units_per_case = prod.bottles_per_case || 12;
      }
    }

    newItems[index].total = calculateLineTotal(newItems[index]);
    setItems(newItems);
  };

  // Customer/Area select කරද්දී ඒ customer ගේ default discount එක සියලු lines ට auto යෙදෙනවා (edit කරන්න පුළුවන්)
  const applyCustomerDiscountToAllLines = (discountPer: number) => {
    setItems(prev => prev.map(it => ({
      ...it,
      item_discount_per: discountPer,
      total: calculateLineTotal({ ...it, item_discount_per: discountPer })
    })));
  };

  const getDefaultDiscountForNewItems = () => {
    const d = customerDetails?.default_discount;
    return Number(d) || 0;
  };

  const clearAllItems = () => {
    if (!window.confirm('Clear all item lines?')) return;
    setItems([{
      inventory_id: '',
      cases: '',
      qty_bottles: '',
      units_per_case: 12,
      unit_price: 0,
      item_discount_per: 0,
      is_free: false,
      total: 0
    }]);
  };

  const markAllFree = (flag: boolean) => {
    if (!window.confirm(flag ? 'Mark ALL items as FREE?' : 'Remove FREE status from ALL items?')) return;
    const updated = items.map(it => {
      const line = { ...it, is_free: flag };
      return { ...line, total: calculateLineTotal(line) };
    });
    setItems(updated);
  };

  const duplicateLastRow = () => {
    if (items.length === 0) return;
    const last = items[items.length - 1];
    setItems([...items, { ...last }]);
  };

  const loadLastInvoiceItemsForCustomer = async () => {
    if (!customerDetails?.id) {
      alert('Please select a customer first.');
      return;
    }
    if (items.some(it => it.inventory_id) && !window.confirm('Replace current item list with last invoice items?')) {
      return;
    }

    setIsSaving(true);
    try {
      const { data: lastInv } = await supabase
        .from('invoices')
        .select('id')
        .eq('company_id', company?.id)
        .eq('customer_id', customerDetails.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastInv) {
        alert('No previous invoice found for this customer.');
        return;
      }

      const { data: invItems, error } = await supabase
        .from('invoice_items')
        .select(`*, inventory:inventory_id ( bottles_per_case )`)
        .eq('invoice_id', lastInv.id);

      if (error) throw error;

      const loadedItems = (invItems || []).map(item => ({
        inventory_id: item.inventory_id,
        cases: item.quantity || 0,
        qty_bottles: item.qty_bottles || 0,
        units_per_case: item.inventory?.bottles_per_case || 12,
        unit_price: Number(item.unit_price) || 0,
        item_discount_per: Number(item.item_discount_per) || 0,
        is_free: !!item.is_free,
        total: Number(item.total) || 0
      }));

      setItems(loadedItems.length > 0 ? loadedItems : items);
    } catch (err: any) {
      alert('Error loading last invoice: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!customerDetails || items[0].inventory_id === '') return alert("Check Items/Customer");
    setIsSaving(true);
    try {
      if (editingInvoiceId) {
        // 1. UPDATE INVOICE + INVENTORY (DB SIDE RPC)
        await supabase.rpc('update_invoice_stock', {
          p_invoice_id: editingInvoiceId, p_company_id: company?.id, p_customer_id: customerDetails.id,
          p_invoice_no: invoiceNo, p_total_net: totalNet, p_vehicle_no: vehicleNo,
          p_driver_name: driverName, p_dispatch_no: dispatchNo, p_invoice_date: invoiceDate,
          p_items: items.filter(i => i.inventory_id !== '').map(i => ({
            inventory_id: i.inventory_id,
            cases: Number(i.cases || 0),
            qty_bottles: Number(i.qty_bottles || 0),
            unit_price: Number(i.unit_price || 0),
            item_discount_per: Number(i.item_discount_per || 0),
            total: Number(i.total || 0),
            is_free: !!i.is_free
          }))
        });

        // 2. REFRESH CUSTOMER LEDGER FOR THIS INVOICE
        await supabase
          .from('customer_ledger')
          .delete()
          .eq('customer_id', customerDetails.id)
          .eq('type', 'Invoice')
          .eq('reference', invoiceNo);

        await supabase.from('customer_ledger').insert([{
          customer_id: customerDetails.id,
          date: invoiceDate,
          type: 'Invoice',
          reference: invoiceNo,
          description: `Invoice ${invoiceNo} | ${invoiceDate} | LKR ${totalNet.toLocaleString()}`,
          debit: totalNet,
          credit: 0,
          status: 'Open'
        }]);
      } else {
        const { data: invData } = await supabase.from('invoices').insert([{ 
          invoice_no: invoiceNo, customer_id: customerDetails.id, company_id: company?.id, 
          total_amount: totalNet, vehicle_no: vehicleNo, driver_name: driverName, created_at: invoiceDate 
        }]).select().single();

        for (const item of items) {
          if (item.inventory_id) {
            await supabase.from('invoice_items').insert([{
              invoice_id: invData.id,
              inventory_id: item.inventory_id,
              quantity: Number(item.cases || 0),
              qty_bottles: Number(item.qty_bottles || 0),
              unit_price: item.unit_price,
              item_discount_per: item.item_discount_per,
              total: item.total,
              is_free: !!item.is_free,
              company_id: company?.id
            }]);
            // 1. STOCK MOVEMENT (BOTTLES LEVEL)
            const { data: prod } = await supabase.from('inventory').select('quantity').eq('id', item.inventory_id).single();
            const deduct = (Number(item.cases || 0) * Number(item.units_per_case)) + Number(item.qty_bottles || 0);

            await supabase.from('stock_movements').insert([{
              inventory_id: item.inventory_id,
              quantity: -deduct,
              type: 'SALE',
              sub_type: 'INVOICE',
              note: invoiceNo,
              is_free: !!item.is_free
            }]);

            // 2. UPDATE LIVE INVENTORY BALANCE
            await supabase.from('inventory').update({ quantity: (prod?.quantity || 0) - deduct }).eq('id', item.inventory_id);
          }
        }

        // 3. CUSTOMER LEDGER ENTRY (OUTSTANDING)
        await supabase.from('customer_ledger').insert([{
          customer_id: customerDetails.id,
          date: invoiceDate,
          type: 'Invoice',
          reference: invoiceNo,
          description: `Invoice ${invoiceNo} | ${invoiceDate} | LKR ${totalNet.toLocaleString()}`,
          debit: totalNet,
          credit: 0,
          status: 'Open'
        }]);
      }
      alert("Success!");
      window.print();
      resetForm();
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const totalNet = items.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalCases = items.reduce((acc, i) => acc + Number(i.cases || 0), 0);
  const totalFreeCases = items.reduce((acc, i) => acc + (i.is_free ? Number(i.cases || 0) : 0), 0);
  // Print එකට: හරි gross එකෙන් total discount (cases + bottles හරියට)
  const totalDiscountAmount = items.reduce((acc, i) => {
    const upc = Number(i.units_per_case) || 12;
    const totalUnits = (Number(i.cases || 0) * upc) + Number(i.qty_bottles || 0);
    const gross = (totalUnits / upc) * Number(i.unit_price || 0);
    return acc + (gross - Number(i.total || 0));
  }, 0);

  // One-time helper to sync old invoices to stock & ledger (if needed)
  const syncOldInvoicesToStock = async () => {
    if (!window.confirm('Run stock sync for old invoices? Do this ONLY once.')) return;
    setIsSaving(true);
    try {
      const { data: invs } = await supabase
        .from('invoices')
        .select('id, invoice_no')
        .eq('company_id', company?.id);

      for (const inv of invs || []) {
        const { data: itemsData } = await supabase
          .from('invoice_items')
          .select('inventory_id, quantity, qty_bottles, inventory:inventory_id ( bottles_per_case )')
          .eq('invoice_id', inv.id);

        for (const it of itemsData || []) {
          if (!it.inventory_id) continue;

          const { data: existing } = await supabase
            .from('stock_movements')
            .select('id')
            .eq('inventory_id', it.inventory_id)
            .eq('type', 'SALE')
            .eq('sub_type', 'INVOICE')
            .eq('note', inv.invoice_no)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const bpc = (it as any).inventory?.bottles_per_case || 12;
          const deduct = (Number(it.quantity || 0) * bpc) + Number(it.qty_bottles || 0);

          const { data: prod } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('id', it.inventory_id)
            .single();

          await supabase.from('stock_movements').insert([{
            inventory_id: it.inventory_id,
            quantity: -deduct,
            type: 'SALE',
            sub_type: 'INVOICE',
            note: inv.invoice_no
          }]);

          await supabase
            .from('inventory')
            .update({ quantity: (prod?.quantity || 0) - deduct })
            .eq('id', it.inventory_id);
        }
      }
      alert('Old invoices synced to stock.');
    } catch (err: any) {
      alert('Sync error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen print:bg-white print:p-0">
      {/* 1. SEARCH SECTION */}
      <div className="max-w-6xl mx-auto no-print bg-white p-6 rounded-[2rem] shadow-sm border mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black flex items-center gap-2"><Search size={18}/> SEARCH INVOICE</h2>
          <div className="relative w-full max-w-md">
            <input type="text" placeholder="Search INV-XXXXX" className="w-full p-3 bg-gray-100 rounded-xl font-bold outline-none" value={searchQuery} onChange={(e) => searchInvoices(e.target.value)} />
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

      {/* 2. MAIN INVOICE FORM */}
      <div className="max-w-6xl mx-auto no-print bg-white p-8 rounded-[2rem] shadow-xl border mb-6">
        <div className="flex justify-between items-center border-b pb-6 mb-6">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="Logo" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-2xl font-black">{editingInvoiceId ? 'EDIT' : 'NEW'} INVOICE</h1>
              <p className="font-bold text-blue-600">{invoiceNo}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400">NET TOTAL</p>
            <h2 className="text-3xl font-black text-blue-600">LKR {totalNet.toLocaleString()}</h2>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Area</label>
            <select className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none" value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
              <option value="">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Customer</label>
            <select
              className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none"
              value={customerDetails?.id || ''}
              onChange={(e) => {
                const cust = customers.find(c => c.id === e.target.value) || null;
                setCustomerDetails(cust);
                const disc = cust ? (Number(cust.default_discount ?? 0) || 0) : 0;
                if (disc > 0) applyCustomerDiscountToAllLines(disc);
              }}
            >
              <option value="">Select Customer</option>
              {(selectedArea ? customers.filter(c => c.sales_area === selectedArea) : customers).map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
            {customerDetails && customerDetails.default_discount != null && Number(customerDetails.default_discount) > 0 && (
              <p className="text-[10px] font-bold text-amber-600 mt-1">Default discount: {Number(customerDetails.default_discount)}% (line එකට edit කරන්න පුළුවන්)</p>
            )}
          </div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Vehicle</label><input className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Date</label><input type="date" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
        </div>

        {/* Item Toolbar (4 Buttons) */}
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
          <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
            Item List
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
            <button
              onClick={clearAllItems}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Clear Lines
            </button>
            <button
              onClick={duplicateLastRow}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Duplicate Last
            </button>
            <button
              onClick={() => markAllFree(true)}
              className="px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
            >
              All Free
            </button>
            <button
              onClick={() => markAllFree(false)}
              className="px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700"
            >
              Remove Free
            </button>
            <button
              onClick={loadLastInvoiceItemsForCustomer}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-black"
              disabled={isSaving}
            >
              Use Last Invoice
            </button>
          </div>
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr className="bg-gray-900 text-white text-[10px] uppercase">
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-center">CS</th>
              <th className="p-3 text-center">BT</th>
              <th className="p-3 text-right">Price</th>
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
                  <select className="w-full p-2 bg-gray-50 rounded-lg font-bold" value={item.inventory_id} onChange={(e) => updateItem(i, 'inventory_id', e.target.value)}>
                    <option value="">Select Item</option>
                    {stock.map(s => <option key={s.id} value={s.id}>{s.name} ({s.quantity})</option>)}
                  </select>
                </td>
                <td className="p-2"><input type="number" className="w-full p-2 bg-blue-50 text-center font-bold rounded-lg" value={item.cases} onChange={e => updateItem(i, 'cases', e.target.value)} /></td>
                <td className="p-2"><input type="number" className="w-full p-2 bg-gray-50 text-center rounded-lg" value={item.qty_bottles} onChange={e => updateItem(i, 'qty_bottles', e.target.value)} /></td>
                <td className="p-2 text-right font-bold">{item.unit_price}</td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="w-full p-2 bg-amber-50 text-center font-bold rounded-lg border border-amber-200"
                    value={item.item_discount_per || ''}
                    onChange={e => updateItem(i, 'item_discount_per', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!item.is_free}
                    onChange={e => updateItem(i, 'is_free', e.target.checked)}
                  />
                </td>
                <td className="p-2 text-right font-bold text-blue-600">{Number(item.total).toFixed(2)}</td>
                <td className="p-2"><button onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 size={16} className="text-red-300"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl text-white">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] text-gray-400">TOTAL CASES</p>
              <p className="text-xl font-bold">{totalCases}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">FREE CASES</p>
              <p className="text-xl font-bold">{totalFreeCases}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setItems([...items, { inventory_id: '', cases: '', qty_bottles: '', units_per_case: 12, unit_price: 0, item_discount_per: getDefaultDiscountForNewItems(), is_free: false, total: 0 }])} className="bg-gray-700 px-6 py-3 rounded-xl font-bold text-xs uppercase">+ Item</button>
            <button onClick={handleSaveInvoice} disabled={isSaving} className="bg-blue-600 px-10 py-3 rounded-xl font-bold text-xs flex items-center gap-2 uppercase">
              {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {editingInvoiceId ? "Update & Print" : "Save & Print"}
            </button>
          </div>
        </div>
      </div>

      {/* 3. RECENT INVOICES LIST */}
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
                  <button onClick={() => loadInvoiceForEdit(inv)} className="p-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs flex items-center gap-1 mx-auto"><Edit size={14}/> Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-right">
          <button
            onClick={syncOldInvoicesToStock}
            className="inline-flex items-center px-4 py-2 text-[10px] font-black uppercase rounded-xl bg-gray-900 text-white hover:bg-black"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
            Sync Old Invoices to Stock
          </button>
        </div>
      </div>

      {/* 4. NEW PRINT TEMPLATE (UPDATED TO MATCH IMAGE) */}
      <div className="hidden print:block w-full text-black font-sans p-4" style={{ fontSize: '12px' }}>
        {/* Header Section */}
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
                <img src={LOGO_URL} className="w-16 h-16 object-contain" />
                <div>
                    <h1 className="text-2xl font-black m-0 leading-tight">EVERMARK LANKA</h1>
                    <p className="text-[10px] font-bold m-0 uppercase">Nehinna, Dodangoda, Kalutara South</p>
                </div>
            </div>
            <div className="text-right leading-tight">
                <p className="text-[10px] font-bold">TEL: 0712315315</p>
                <p className="text-[10px] font-bold">EMAIL: info.funbeverages@gmail.com</p>
            </div>
        </div>

        <div className="border-y border-black py-1 mb-4">
            <h2 className="text-center text-xl font-black tracking-widest m-0">SALES INVOICE</h2>
        </div>

        {/* Invoice Info Bar */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-1 mb-4 font-bold uppercase text-[11px]">
            <div className="flex justify-between border-b border-dotted border-gray-400"><span>INV: {invoiceNo}</span><span>DATE: {invoiceDate.split('-').reverse().join('/')}</span></div>
            <div className="flex justify-between border-b border-dotted border-gray-400"><span>VEHICLE: {vehicleNo || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-dotted border-gray-400"><span>TO: {customerDetails?.full_name || 'CASH CUSTOMER'}</span><span>DRIVER: {driverName || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-dotted border-gray-400"><span>ADDR: {customerDetails?.address || 'N/A'}</span></div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-2">
            <thead>
                <tr className="border-y border-black font-black text-[11px]">
                    <th className="text-left py-1">DESCRIPTION</th>
                    <th className="text-center">CS</th>
                    <th className="text-center">BT</th>
                    <th className="text-right">RATE</th>
                    <th className="text-right">DISC</th>
                    <th className="text-right">TOTAL</th>
                </tr>
            </thead>
            <tbody className="font-bold text-[11px]">
                {items.map((it, idx) => {
                    const prod = stock.find(s => s.id === it.inventory_id);
                    if (!prod) return null;
                    return (
                        <tr key={idx} className="border-b border-dotted border-gray-300">
                            <td className="py-1 uppercase">{prod.name} {it.is_free ? '(FREE)' : ''}</td>
                            <td className="text-center">{it.cases || 0}</td>
                            <td className="text-center">{it.qty_bottles || 0}</td>
                            <td className="text-right">{Number(it.unit_price).toFixed(2)}</td>
                            <td className="text-right">{it.is_free ? '0.0%' : (it.item_discount_per || '0.0') + '%'}</td>
                            <td className="text-right">{Number(it.total).toFixed(2)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>

        {/* Summary Section */}
        <div className="border-t border-black pt-1 mb-6">
            <div className="flex justify-between font-black text-[10px] mb-2">
                <div className="flex gap-4">
                  <span>WORDS: {numberToWords(Math.round(totalNet))}</span>
                </div>
                <div className="flex gap-4">
                  <span>TOTAL CASES: {totalCases}</span>
                  <span className="border-l border-black pl-4">TOTAL DISCOUNT: {totalDiscountAmount.toFixed(2)}</span>
                </div>
            </div>
            
            <div className="flex justify-end items-center gap-4">
                <span className="text-2xl font-black">NET TOTAL: LKR {totalNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
        </div>

        <p className="text-[9px] font-bold mb-8">PAYMENT SHOULD BE MADE WITHIN THE CREDIT PERIOD INDICATED ABOVE, ALL THE CHEQUES SHOULD BE DRAWN IN FAVOUR OF EVERMARK LANKA.</p>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-10 mt-12 text-center font-bold text-[10px]">
            <div className="border-t border-black pt-1">CHECKED BY</div>
            <div className="border-t border-black pt-1">GOODS ISSUED BY</div>
            <div className="border-t border-black pt-1">APPROVED BY</div>
        </div>

        <div className="flex justify-between items-end mt-12">
            <div className="w-1/2 text-[9px] font-bold">
                <p className="mb-1">CUSTOMER NAME: ................................................. NIC NO: ...........................</p>
                <p className="italic">We received above goods in good order & condition</p>
            </div>
            <div className="w-1/3 border-t border-black text-center font-bold text-[10px]">
                CUSTOMER SIGNATURE
            </div>
        </div>

        <div className="mt-6 border border-black p-2 text-[9px] font-bold leading-tight">
            <p>NOTE: POST DATED CHEQUES ARE SUBJECT TO REALIZATION. IF YOUR FIND ANY DISCREPANCY IN THE BALANCE VERIFY WITHIN 7 DAYS.</p>
            <p className="mt-1">***ONLY 1% ACCEPTING MARKET RETURNS FROM MONTHLY TURN OVER AND, WE ARE NOT ACCEPTING SODA 350ML, 750ML AS MARKET RETURNS GOODS***</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-[10px] font-bold">
            <div className="border border-black p-1 px-2">TRANSPORTER NAME : ..............................................</div>
            <div className="border border-black p-1 px-2">ID NO : ..............................................</div>
            <div className="border border-black p-1 px-2">SIGNATURE : ..............................................</div>
            <div className="border border-black p-1 px-2">PHONE NO : ..............................................</div>
        </div>

      </div>
    </div>
  );
};

export default SalesInvoice;
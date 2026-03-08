import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useCompany } from '../../utils/useCompany';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet, Printer, Download, RefreshCcw, ChevronRight,
  Package, Truck, ShoppingCart, Users, BarChart2, RotateCcw, Loader2
} from 'lucide-react';

// ── Report definitions ────────────────────────────────────────────────────────
const GROUPS = [
  {
    id: 'INVENTORY', label: 'Inventory', icon: Package, color: 'blue',
    reports: [
      { id: 'inventory_stock',  label: 'Inventory Stock'          },
      { id: 'stock_movement',   label: 'Stock Movement'           },
      { id: 'grn_list',         label: 'GRN List'                 },
      { id: 'raw_material_grn', label: 'Raw Material GRN'         },
      { id: 'supplier_goods',   label: 'Supplier Wise Received'   },
    ]
  },
  {
    id: 'RETURNS', label: 'Returns & Damages', icon: RotateCcw, color: 'red',
    reports: [
      { id: 'market_return',  label: 'Market Return'  },
      { id: 'goods_return',   label: 'Goods Return'   },
      { id: 'damage_return',  label: 'Damage Return'  },
      { id: 'sample_report',  label: 'Sample Report'  },
    ]
  },
  {
    id: 'SALES', label: 'Sales', icon: ShoppingCart, color: 'green',
    reports: [
      { id: 'invoice_list',      label: 'Invoice List'          },
      { id: 'sales_report',      label: 'Sales Report'          },
      { id: 'item_wise_sales',   label: 'Item Wise Sales Report'},
      { id: 'free_issue',        label: 'Free Issue Report'     },
      { id: 'discount_report',   label: 'Discount Report'       },
    ]
  },
  {
    id: 'CUSTOMERS', label: 'Customers', icon: Users, color: 'purple',
    reports: [
      { id: 'customer_ledger',  label: 'Customer Wise Ledger'      },
      { id: 'outstanding',      label: 'All Customer Outstanding'  },
      { id: 'payment_returns',  label: 'Payment & Returns Report'  },
    ]
  },
  {
    id: 'TRANSPORT', label: 'Transport', icon: Truck, color: 'orange',
    reports: [
      { id: 'transport_payment', label: 'Transport Payment Report' },
    ]
  },
];

const COLORS: Record<string, any> = {
  blue:   { sidebar: 'bg-blue-50 text-blue-700 border-blue-300',   active: 'bg-blue-600 text-white',   badge: 'bg-blue-100 text-blue-700',   header: 'bg-blue-50 border-blue-200 text-blue-800'   },
  red:    { sidebar: 'bg-red-50 text-red-700 border-red-300',      active: 'bg-red-600 text-white',    badge: 'bg-red-100 text-red-700',     header: 'bg-red-50 border-red-200 text-red-800'     },
  green:  { sidebar: 'bg-green-50 text-green-700 border-green-300',active: 'bg-green-600 text-white',  badge: 'bg-green-100 text-green-700', header: 'bg-green-50 border-green-200 text-green-800'},
  purple: { sidebar: 'bg-purple-50 text-purple-700 border-purple-300',active:'bg-purple-600 text-white',badge:'bg-purple-100 text-purple-700',header:'bg-purple-50 border-purple-200 text-purple-800'},
  orange: { sidebar: 'bg-orange-50 text-orange-700 border-orange-300',active:'bg-orange-600 text-white',badge:'bg-orange-100 text-orange-700',header:'bg-orange-50 border-orange-200 text-orange-800'},
};

const today      = new Date().toISOString().split('T')[0];
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

export default function ReportsPage() {
  const { company } = useCompany();

  const [activeGroup,    setActiveGroup]    = useState('INVENTORY');
  const [activeReport,   setActiveReport]   = useState('inventory_stock');
  const [dateStart,      setDateStart]      = useState(monthStart);
  const [dateEnd,        setDateEnd]        = useState(today);
  const [custFilter,     setCustFilter]     = useState('');
  const [suppFilter,     setSuppFilter]     = useState('');
  const [data,           setData]           = useState<any[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [customers,      setCustomers]      = useState<any[]>([]);
  const [suppliers,      setSuppliers]      = useState<any[]>([]);
  const [filtersLoaded,  setFiltersLoaded]  = useState(false);
  const [hasRun,         setHasRun]         = useState(false);

  const cg = GROUPS.find(g => g.id === activeGroup)!;
  const cr = cg.reports.find(r => r.id === activeReport)!;
  const cl = COLORS[cg.color];

  const loadFilters = async () => {
    if (filtersLoaded || !company) return;
    const [c, s] = await Promise.all([
      supabase.from('customers').select('id, full_name').eq('company_id', company.id).order('full_name'),
      supabase.from('suppliers').select('id, name').eq('company_id', company.id).order('name'),
    ]);
    setCustomers(c.data || []);
    setSuppliers(s.data || []);
    setFiltersLoaded(true);
  };

  const fetchReport = useCallback(async () => {
    if (!company) return;
    await loadFilters();
    setLoading(true);
    setHasRun(true);
    const cid = company.id;
    const ds  = dateStart + 'T00:00:00';
    const de  = dateEnd   + 'T23:59:59';

    try {
      let rows: any[] = [];

      // ── INVENTORY ──────────────────────────────────────────────────────────
      if (activeReport === 'inventory_stock') {
        const { data: d } = await supabase.from('inventory').select('name, sku, bottles_per_case, quantity, price').eq('company_id', cid).order('name');
        rows = (d || []).map((i, n) => ({
          '#':            n + 1,
          'Product':      i.name,
          'SKU':          i.sku || '-',
          'BPC':          i.bottles_per_case || 12,
          'Cases':        Math.floor((i.quantity || 0) / (i.bottles_per_case || 12)),
          'Bottles':      (i.quantity || 0) % (i.bottles_per_case || 12),
          'Total Bottles':i.quantity || 0,
          'Price/CS':     i.price || 0,
          'Stock Value':  Math.round(((i.quantity || 0) / (i.bottles_per_case || 12)) * (i.price || 0)),
        }));
      }

      else if (activeReport === 'stock_movement') {
        const { data: d } = await supabase.from('stock_movements')
          .select('created_at, type, quantity, notes, inventory:product_id(name, bottles_per_case), customers:customer_id(full_name)')
          .eq('company_id', cid).gte('created_at', ds).lte('created_at', de).order('created_at', { ascending: false });
        rows = (d || []).map((i, n) => ({
          '#':         n + 1,
          'Date':      i.created_at?.split('T')[0],
          'Product':   i.inventory?.name || '-',
          'Type':      i.type || '-',
          'Customer':  i.customers?.full_name || '-',
          'Cases':     Math.floor(Math.abs(i.quantity || 0) / (i.inventory?.bottles_per_case || 12)),
          'Bottles':   Math.abs(i.quantity || 0) % (i.inventory?.bottles_per_case || 12),
          'Qty (Btl)': i.quantity || 0,
          'Notes':     i.notes || '-',
        }));
      }

      else if (activeReport === 'grn_list') {
        const { data: d } = await supabase.from('grn_master')
          .select('grn_date, grn_no, bill_no, total_amount, suppliers(name)')
          .eq('company_id', cid).gte('grn_date', dateStart).lte('grn_date', dateEnd).order('grn_date', { ascending: false });
        rows = (d || []).map((g, n) => ({
          '#':        n + 1,
          'Date':     g.grn_date,
          'GRN No':   g.grn_no,
          'Supplier': g.suppliers?.name || '-',
          'Bill No':  g.bill_no || '-',
          'Total':    g.total_amount || 0,
        }));
      }

      else if (activeReport === 'raw_material_grn') {
        const { data: d } = await supabase.from('raw_material_grn_master')
          .select('grn_date, grn_no, bill_no, total_amount, suppliers(name)')
          .eq('company_id', cid).gte('grn_date', dateStart).lte('grn_date', dateEnd).order('grn_date', { ascending: false });
        rows = (d || []).map((g, n) => ({
          '#':        n + 1,
          'Date':     g.grn_date,
          'GRN No':   g.grn_no,
          'Supplier': g.suppliers?.name || '-',
          'Bill No':  g.bill_no || '-',
          'Total':    g.total_amount || 0,
        }));
      }

      else if (activeReport === 'supplier_goods') {
        let q = supabase.from('grn_master')
          .select('grn_date, grn_no, suppliers(name), grn_items(quantity, unit_price, total_price, inventory:product_id(name))')
          .eq('company_id', cid).gte('grn_date', dateStart).lte('grn_date', dateEnd);
        if (suppFilter) q = q.eq('supplier_id', suppFilter);
        const { data: d } = await q.order('grn_date', { ascending: false });
        let n = 0;
        rows = (d || []).flatMap(g =>
          (g.grn_items || []).map((item: any) => {
            const bpc = item.inventory?.bottles_per_case || 12;
            const qty = item.quantity || 0;
            return {
              '#':          ++n,
              'Date':       g.grn_date,
              'GRN No':     g.grn_no,
              'Supplier':   g.suppliers?.name || '-',
              'Product':    item.inventory?.name || '-',
              'Cases':      Math.floor(qty / bpc),
              'Bottles':    qty % bpc,
              'Qty (Btl)':  qty,
              'Unit Price': item.unit_price || 0,
              'Subtotal':   item.total_price || Math.round((qty / bpc) * (item.unit_price || 0)),
            };
          })
        );
      }

      // ── RETURNS ────────────────────────────────────────────────────────────
      else if (['market_return','goods_return','damage_return','sample_report'].includes(activeReport)) {
        const typeMap: Record<string, string> = {
          market_return: 'MARKET_RETURN', goods_return: 'RETURN',
          damage_return: 'DAMAGE_RETURN', sample_report: 'SAMPLE',
        };
        const { data: d } = await supabase.from('stock_movements')
          .select('created_at, quantity, notes, inventory:product_id(name, bottles_per_case), customers:customer_id(full_name)')
          .eq('company_id', cid).eq('type', typeMap[activeReport])
          .gte('created_at', ds).lte('created_at', de).order('created_at', { ascending: false });
        rows = (d || []).map((i, n) => ({
          '#':         n + 1,
          'Date':      i.created_at?.split('T')[0],
          'Product':   i.inventory?.name || '-',
          'Customer':  i.customers?.full_name || '-',
          'Cases':     Math.floor(Math.abs(i.quantity || 0) / (i.inventory?.bottles_per_case || 12)),
          'Bottles':   Math.abs(i.quantity || 0) % (i.inventory?.bottles_per_case || 12),
          'Qty (Btl)': Math.abs(i.quantity || 0),
          'Notes':     i.notes || '-',
        }));
      }

      // ── SALES ──────────────────────────────────────────────────────────────
      else if (activeReport === 'invoice_list') {
        const { data: d } = await supabase.from('invoices')
          .select('date, invoice_no, vehicle_no, total_amount, net_amount, customers(full_name, sales_area)')
          .eq('company_id', cid).gte('date', dateStart).lte('date', dateEnd).order('date', { ascending: false });
        rows = (d || []).map((i, n) => ({
          '#':          n + 1,
          'Date':       i.date || '-',
          'Invoice No': i.invoice_no,
          'Customer':   i.customers?.full_name || '-',
          'Area':       i.customers?.sales_area || '-',
          'Vehicle':    i.vehicle_no || '-',
          'Amount':     i.total_amount || 0,
          'Net Amount': i.net_amount || i.total_amount || 0,
        }));
      }

      else if (activeReport === 'sales_report') {
        const { data: invs } = await supabase.from('invoices')
          .select('id, date, invoice_no, vehicle_no, customers(full_name, sales_area)')
          .eq('company_id', cid).gte('date', dateStart).lte('date', dateEnd);
        const invIds = (invs||[]).map(i => i.id);
        if (invIds.length === 0) { rows = []; }
        else {
          // quantity=cases, qty_bottles=loose, join inventory for actual bpc
          const { data: items } = await supabase.from('invoice_items')
            .select('invoice_id, quantity, qty_bottles, unit_price, total, inventory:inventory_id(name, bottles_per_case)')
            .in('invoice_id', invIds).neq('is_free', true);
          const invMap: Record<string,any> = {};
          (invs||[]).forEach(i => { invMap[i.id] = i; });
          let n = 0;
          rows = (items||[]).map((item: any) => {
            const inv = invMap[item.invoice_id] || {};
            const bpc = item.inventory?.bottles_per_case || 12;
            const cs  = item.quantity || 0;
            const bt  = item.qty_bottles || 0;
            return {
              '#':           ++n,
              'Date':        inv.date || '-',
              'Invoice No':  inv.invoice_no || '-',
              'Customer':    inv.customers?.full_name || '-',
              'Area':        inv.customers?.sales_area || '-',
              'Vehicle':     inv.vehicle_no || '-',
              'Product':     item.inventory?.name || '-',
              'BPC':         bpc,
              'Cases':       cs,
              'Bottles':     bt,
              'Total Btl':   cs * bpc + bt,
              'Unit Price':  item.unit_price || 0,
              'Total (LKR)': item.total || 0,
            };
          });
        }
      }

      else if (activeReport === 'item_wise_sales') {
        // Product wise totals for date range
        const { data: invs } = await supabase.from('invoices')
          .select('id').eq('company_id', cid).gte('date', dateStart).lte('date', dateEnd);
        const invIds = (invs||[]).map(i => i.id);
        if (invIds.length === 0) { rows = []; }
        else {
          const { data: items } = await supabase.from('invoice_items')
            .select('quantity, qty_bottles, unit_price, total, inventory:inventory_id(name, bottles_per_case)')
            .in('invoice_id', invIds).neq('is_free', true);
          // Group by product
          const productMap: Record<string, any> = {};
          (items||[]).forEach((item: any) => {
            const name = item.inventory?.name || 'Unknown';
            const bpc  = item.inventory?.bottles_per_case || 12;
            const cs   = item.quantity || 0;
            const bt   = item.qty_bottles || 0;
            if (!productMap[name]) productMap[name] = { name, bpc, totalCS: 0, totalBT: 0, totalBtl: 0, totalAmt: 0 };
            productMap[name].totalCS   += cs;
            productMap[name].totalBT   += bt;
            productMap[name].totalBtl  += cs * bpc + bt;
            productMap[name].totalAmt  += item.total || 0;
          });
          rows = Object.values(productMap)
            .sort((a,b) => b.totalAmt - a.totalAmt)
            .map((p, n) => ({
              '#':           n + 1,
              'Product':     p.name,
              'BPC':         p.bpc,
              'Cases':       p.totalCS,
              'Bottles':     p.totalBT,
              'Total Btl':   p.totalBtl,
              'Total (LKR)': Math.round(p.totalAmt),
            }));
        }
      }

      else if (activeReport === 'free_issue') {
        const { data: invs } = await supabase.from('invoices')
          .select('id, date, invoice_no, customers(full_name)')
          .eq('company_id', cid).gte('date', dateStart).lte('date', dateEnd);
        const invIds = (invs||[]).map((i:any) => i.id);
        if (invIds.length === 0) { rows = []; }
        else {
          const invMap: Record<string,any> = {};
          (invs||[]).forEach((i:any) => { invMap[i.id] = i; });
          const { data: d } = await supabase.from('invoice_items')
            .select('invoice_id, quantity, qty_bottles, inventory:inventory_id(name, bottles_per_case)')
            .in('invoice_id', invIds).eq('is_free', true);
          rows = (d || []).map((i: any, idx: number) => {
            const inv = invMap[i.invoice_id] || {};
            const bpc = i.inventory?.bottles_per_case || 12;
            const cs  = i.quantity || 0;
            const bt  = i.qty_bottles || 0;
            return {
              '#':         idx + 1,
              'Date':      inv.date || '-',
              'Invoice No':inv.invoice_no || '-',
              'Customer':  inv.customers?.full_name || '-',
              'Product':   i.inventory?.name || '-',
              'BPC':       bpc,
              'Cases':     cs,
              'Bottles':   bt,
              'Total Btl': cs * bpc + bt,
            };
          });
        }
      }

      else if (activeReport === 'discount_report') {
        const { data: invs } = await supabase.from('invoices')
          .select('id, date, invoice_no, customers(full_name, sales_area)')
          .eq('company_id', cid).gte('date', dateStart).lte('date', dateEnd);
        const invIds = (invs||[]).map(i => i.id);
        if (invIds.length === 0) { rows = []; }
        else {
          const { data: items } = await supabase.from('invoice_items')
            .select('invoice_id, quantity, qty_bottles, unit_price, item_discount_per, item_discount_amt, total, inventory:inventory_id(name, bottles_per_case)')
            .in('invoice_id', invIds).neq('is_free', true).gt('item_discount_per', 0);
          const invMap: Record<string,any> = {};
          (invs||[]).forEach(i => { invMap[i.id] = i; });
          let n = 0;
          rows = (items||[]).map((item: any) => {
            const inv  = invMap[item.invoice_id] || {};
            const bpc  = item.inventory?.bottles_per_case || 12;
            const cs   = item.quantity || 0;
            const bt   = item.qty_bottles || 0;
            // item_discount_amt column exists in DB - use directly
            const discAmt = item.item_discount_amt || Math.round((item.unit_price||0) * (cs + bt/bpc) * (item.item_discount_per||0) / 100);
            return {
              '#':           ++n,
              'Date':        inv.date || '-',
              'Invoice No':  inv.invoice_no || '-',
              'Customer':    inv.customers?.full_name || '-',
              'Area':        inv.customers?.sales_area || '-',
              'Product':     item.inventory?.name || '-',
              'BPC':         bpc,
              'Cases':       cs,
              'Bottles':     bt,
              'Unit Price':  item.unit_price || 0,
              'Discount %':  item.item_discount_per || 0,
              'Disc Amount': discAmt,
              'Net Total':   item.total || 0,
            };
          });
        }
      }

      // ── CUSTOMERS ──────────────────────────────────────────────────────────
      else if (activeReport === 'customer_ledger') {
        let q = supabase.from('customer_ledger')
          .select('date, type, reference, description, debit, credit, status, customers(full_name)')
          .gte('date', dateStart).lte('date', dateEnd);
        if (custFilter) q = q.eq('customer_id', custFilter);
        else {
          // Get customer IDs for this company
          const { data: cc } = await supabase.from('customers').select('id').eq('company_id', cid);
          const ids = (cc || []).map((c: any) => c.id);
          if (ids.length > 0) q = q.in('customer_id', ids);
        }
        const { data: d } = await q.order('date', { ascending: false });
        rows = (d || []).map((l, n) => ({
          '#':           n + 1,
          'Date':        l.date,
          'Customer':    l.customers?.full_name || '-',
          'Type':        l.type || '-',
          'Reference':   l.reference || '-',
          'Description': l.description || '-',
          'Debit':       l.debit  > 0 ? l.debit  : '-',
          'Credit':      l.credit > 0 ? l.credit : '-',
          'Status':      l.status || '-',
        }));
      }

      else if (activeReport === 'outstanding') {
        const { data: custs } = await supabase.from('customers').select('id, full_name, sales_area, phone').eq('company_id', cid).order('full_name');
        const ids = (custs || []).map((c: any) => c.id);
        const { data: ledger } = ids.length > 0
          ? await supabase.from('customer_ledger').select('customer_id, debit, credit').in('customer_id', ids)
          : { data: [] };
        const bal: Record<string, number> = {};
        (ledger || []).forEach((l: any) => { bal[l.customer_id] = (bal[l.customer_id] || 0) + Number(l.debit || 0) - Number(l.credit || 0); });
        rows = (custs || [])
          .map(c => ({ ...c, balance: bal[c.id] || 0 }))
          .filter(c => Math.abs(c.balance) > 0)
          .sort((a, b) => b.balance - a.balance)
          .map((c, n) => ({
            '#':           n + 1,
            'Customer':    c.full_name,
            'Area':        c.sales_area || '-',
            'Phone':       c.phone || '-',
            'Outstanding': Math.round(Math.abs(c.balance)),
            'Status':      c.balance > 0 ? 'Due' : 'Credit',
          }));
      }

      else if (activeReport === 'payment_returns') {
        const { data: d } = await supabase.from('customer_payments')
          .select('created_at, payment_type, reference_no, amount, status, customers(full_name)')
          .eq('company_id', cid).gte('created_at', ds).lte('created_at', de).order('created_at', { ascending: false });
        rows = (d || []).map((p, n) => ({
          '#':          n + 1,
          'Date':       p.created_at?.split('T')[0],
          'Customer':   p.customers?.full_name || '-',
          'Type':       p.payment_type || '-',
          'Reference':  p.reference_no || '-',
          'Amount':     p.amount || 0,
          'Status':     p.status || '-',
        }));
      }

      // ── TRANSPORT ──────────────────────────────────────────────────────────
      else if (activeReport === 'transport_payment') {
        const { data: d } = await supabase.from('transport_log')
          .select('trip_date, total_distance, rate_per_km, fuel_cost, hire_cost, advance_paid, description, transport_vehicles(vehicle_no), transport_drivers(driver_name)')
          .eq('company_id', cid).gte('trip_date', dateStart).lte('trip_date', dateEnd).order('trip_date', { ascending: false });
        rows = (d || []).map((t, n) => ({
          '#':             n + 1,
          'Date':          t.trip_date,
          'Vehicle':       t.transport_vehicles?.vehicle_no || '-',
          'Driver':        t.transport_drivers?.driver_name || '-',
          'Distance (km)': t.total_distance || 0,
          'Rate/km':       t.rate_per_km || 0,
          'Fuel Cost':     t.fuel_cost || 0,
          'Hire Cost':     t.hire_cost || 0,
          'Advance Paid':  t.advance_paid || 0,
          'Description':   t.description || '-',
        }));
      }

      setData(rows);
    } catch (err: any) {
      console.error('Report error:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [company, activeReport, dateStart, dateEnd, custFilter, suppFilter]);

  // ── Exports ────────────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cr.label.slice(0, 31));
    XLSX.writeFile(wb, `${cr.label}_${dateStart}_to_${dateEnd}.xlsx`);
  };

  const exportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `${cr.label}_${dateStart}_to_${dateEnd}.csv`;
    a.click();
  };

  const cols = data.length > 0 ? Object.keys(data[0]) : [];

  // Auto-sum numeric columns for footer
  const totals = cols.reduce((acc, col) => {
    if (col === '#') return acc;
    const allNum = data.every(r => typeof r[col] === 'number');
    if (allNum) acc[col] = data.reduce((s, r) => s + (r[col] || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const hasTotals = Object.keys(totals).length > 0;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">

      {/* ── PRINT HEADER ── */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-900">
        <h1 className="text-2xl font-black uppercase">{cr.label}</h1>
        <p className="text-sm text-gray-500 mt-1">Period: {dateStart} → {dateEnd} &nbsp;|&nbsp; Generated: {today}</p>
      </div>

      {/* ── SCREEN UI ── */}
      <div className="print:hidden flex flex-col h-screen">

        {/* Top Bar */}
        <div className="bg-white border-b px-6 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">📊 System Reports</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] font-black text-gray-400 uppercase">From</label>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-blue-400" />
            <label className="text-[10px] font-black text-gray-400 uppercase">To</label>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-blue-400" />

            {/* Filters */}
            {activeReport === 'customer_ledger' && (
              <select value={custFilter} onChange={e => setCustFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400">
                <option value="">All Customers</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            )}
            {activeReport === 'supplier_goods' && (
              <select value={suppFilter} onChange={e => setSuppFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400">
                <option value="">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            <button onClick={fetchReport} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-black uppercase hover:bg-gray-700 transition-colors disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Run Report
            </button>

            {data.length > 0 && (
              <>
                <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700">
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700">
                  <Download size={13} /> CSV
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-white rounded-xl text-xs font-black hover:bg-gray-800">
                  <Printer size={13} /> Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <div className="w-60 bg-white border-r overflow-y-auto flex-shrink-0">
            {GROUPS.map(group => {
              const GIcon   = group.icon;
              const gc      = COLORS[group.color];
              const isGrp   = group.id === activeGroup;
              return (
                <div key={group.id}>
                  <button
                    onClick={() => {
                      setActiveGroup(group.id);
                      setActiveReport(group.reports[0].id);
                      setData([]); setHasRun(false);
                      loadFilters();
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 border-b text-left transition-all
                      ${isGrp ? gc.sidebar + ' border-l-4' : 'text-gray-600 hover:bg-gray-50 border-gray-100 border-l-4 border-l-transparent'}`}
                  >
                    <GIcon size={15} />
                    <span className="font-black text-xs uppercase tracking-wide flex-1">{group.label}</span>
                    <ChevronRight size={11} className={`transition-transform ${isGrp ? 'rotate-90' : ''}`} />
                  </button>
                  {isGrp && group.reports.map(rpt => (
                    <button key={rpt.id}
                      onClick={() => { setActiveReport(rpt.id); setData([]); setHasRun(false); }}
                      className={`w-full flex items-center gap-2 pl-8 pr-4 py-2.5 text-left text-xs font-bold border-b border-gray-50 transition-all
                        ${rpt.id === activeReport ? gc.active : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                      {rpt.label}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Main */}
          <div className="flex-1 overflow-auto p-5">

            {/* Report Header */}
            <div className={`rounded-2xl p-4 mb-4 border-2 flex items-center justify-between ${cl.header}`}>
              <div>
                <h2 className="text-base font-black uppercase tracking-tight">{cr.label}</h2>
                <p className="text-xs font-bold opacity-60 mt-0.5">{dateStart} → {dateEnd}</p>
              </div>
              {data.length > 0 && (
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${cl.badge}`}>
                  {data.length} records
                </span>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 size={36} className="animate-spin text-gray-300" />
                <p className="text-sm font-bold text-gray-400">Loading data...</p>
              </div>
            ) : !hasRun ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <BarChart2 size={48} className="opacity-20" />
                <p className="font-black text-base">Select date range and click Run Report</p>
                <p className="text-sm">Showing: <strong className="text-gray-600">{cr.label}</strong></p>
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <BarChart2 size={48} className="opacity-20" />
                <p className="font-black text-base">No data found</p>
                <p className="text-sm">Try a different date range</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-auto max-h-[calc(100vh-260px)]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-900 text-white">
                        {cols.map(col => (
                          <th key={col} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wide whitespace-nowrap border-r border-gray-700 last:border-0">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i} className={`border-b border-gray-50 hover:bg-blue-50/40 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                          {cols.map(col => (
                            <td key={col} className="px-3 py-2.5 font-bold text-gray-800 whitespace-nowrap text-xs">
                              {/* Color-code status */}
                              {col === 'Status' && row[col] === 'Due'    ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black">{row[col]}</span>
                              : col === 'Status' && row[col] === 'Credit' ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black">{row[col]}</span>
                              : col === 'Status' && row[col] === 'Paid'   ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black">{row[col]}</span>
                              : typeof row[col] === 'number' ? <span className="font-black text-gray-900">{row[col].toLocaleString()}</span>
                              : String(row[col] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {hasTotals && (
                      <tfoot className="sticky bottom-0">
                        <tr className="bg-gray-900 text-white">
                          {cols.map(col => (
                            <td key={col} className="px-3 py-3 text-xs font-black whitespace-nowrap border-r border-gray-700 last:border-0">
                              {col === '#'         ? 'TOTAL'
                              : totals[col] !== undefined ? totals[col].toLocaleString()
                              : ''}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PRINT VIEW ── */}
      <div className="hidden print:block report-print-container">
        {/* Print Header */}
        <div className="report-print-header" style={{marginBottom:'6mm',borderBottom:'2px solid black',paddingBottom:'4mm'}}>
          <h1 style={{fontSize:'14pt',fontWeight:900,textTransform:'uppercase',margin:0}}>{cr.label}</h1>
          <p style={{fontSize:'8pt',color:'#555',marginTop:'2mm'}}>
            Period: {dateStart} → {dateEnd} &nbsp;|&nbsp; Generated: {today} &nbsp;|&nbsp; Records: {data.length}
          </p>
        </div>
        {data.length > 0 && (
          <table className="report-print-table" style={{width:'100%',borderCollapse:'collapse',fontSize:'8pt'}}>
            <thead>
              <tr style={{background:'#1f2937',color:'white'}}>
                {cols.map(col => (
                  <th key={col} style={{padding:'4px 6px',textAlign:'left',fontSize:'7pt',fontWeight:900,textTransform:'uppercase',border:'0.5pt solid #555',whiteSpace:'nowrap'}}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} style={{background: i%2 ? '#f9fafb' : 'white'}}>
                  {cols.map(col => (
                    <td key={col} style={{padding:'3px 6px',border:'0.5pt solid #ddd',fontSize:'8pt',whiteSpace:'nowrap'}}>
                      {typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {hasTotals && (
              <tfoot>
                <tr style={{background:'#1f2937',color:'white',fontWeight:900}}>
                  {cols.map(col => (
                    <td key={col} style={{padding:'4px 6px',border:'0.5pt solid #555',fontSize:'8pt',fontWeight:900}}>
                      {col === '#' ? 'TOTAL' : totals[col] !== undefined ? totals[col].toLocaleString() : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}

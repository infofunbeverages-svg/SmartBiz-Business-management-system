import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCcw, Download, Edit } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import TableView from '../../components/common/TableView';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../utils/useCompany';

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`id, invoice_no, created_at, total_amount, customer_id, customers (full_name, phone)`)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInvoices(data.map((inv: any) => ({
          dbId: inv.id,
          invoiceNo: inv.invoice_no || inv.id.slice(0, 8),
          customerId: inv.customer_id,
          customerName: inv.customers?.full_name || 'Walking Customer',
          customerPhone: inv.customers?.phone || 'N/A',
          date: inv.created_at,
          total: Number(inv.total_amount || 0)
        })));
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [company?.id]);

  // FIX: Invoice data load කරලා popup window ගෙ original layout print කරනවා
  const generatePDF = async (inv: any) => {
    // 1. Popup FIRST (click event ගෙ sync ගෙ open - browser block කරන්නේ නෑ)
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) { alert('Popup blocked! Please allow popups for this site.'); return; }
    popup.document.write('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial"><p style="font-size:16px;color:#666">Loading invoice...</p></body></html>');

    // 2. Invoice items + customer data load
    const { data: lines } = await supabase
      .from('invoice_items')
      .select(`quantity, qty_bottles, unit_price, total, is_free, item_discount_per, inventory:inventory_id ( name, bottles_per_case )`)
      .eq('invoice_id', inv.dbId);

    const { data: invFull } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .eq('id', inv.dbId)
      .single();

    const items = (lines || []).map((l: any) => ({
      inventory_id:      l.inventory?.name || '',
      name:              l.inventory?.name || 'ITEM',
      cases:             Number(l.quantity || 0),
      qty_bottles:       Number(l.qty_bottles || 0),
      units_per_case:    l.inventory?.bottles_per_case || 12,
      unit_price:        Number(l.unit_price || 0),
      item_discount_per: Number(l.item_discount_per || 0),
      is_free:           !!l.is_free,
      total:             Number(l.total || 0),
    }));

    const customer    = invFull?.customers || {};
    const invoiceDate = invFull?.created_at?.split('T')[0] || '';
    const vehicleNo   = invFull?.vehicle_no || 'N/A';
    const driverName  = invFull?.driver_name || 'N/A';
    const LOGO_URL    = "https://ozbeyvqaxerstipdehkb.supabase.co/storage/v1/object/public/company-assets/wvwrmark%20logo%20(1).jpg";

    // 2. Totals calculate
    const totalNet      = items.reduce((a: number, i: any) => a + i.total, 0);
    const totalCases    = items.reduce((a: number, i: any) => a + i.cases, 0);
    const totalDiscount = items.reduce((a: number, i: any) => {
      const gross = (i.cases * i.units_per_case / i.units_per_case) * i.unit_price * i.cases;
      return a + (gross - i.total);
    }, 0);

    // numberToWords helper
    const numberToWords = (num: number): string => {
      const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ',
        'Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
      const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
      const fmt = (n: number) => n < 20 ? a[n] : b[Math.floor(n/10)] + (n%10 ? ' '+a[n%10] : '');
      let str = '', n = Math.round(num);
      if (n >= 100000) { str += fmt(Math.floor(n/100000))+'Lakh '; n %= 100000; }
      if (n >= 1000)   { str += fmt(Math.floor(n/1000))+'Thousand '; n %= 1000; }
      if (n >= 100)    { str += fmt(Math.floor(n/100))+'Hundred '; n %= 100; }
      if (n > 0)       str += (str ? 'and ' : '') + fmt(n);
      return str.toUpperCase().trim() + ' RUPEES ONLY';
    };

    // 3. HTML string build කරනවා - InvoiceTemplate exact CSS
    const itemRows = items.map((item: any) => `
      <tr style="border-bottom:0.5px dotted #ccc">
        <td style="padding:2.5px 4px">${item.name.toUpperCase()}${item.is_free ? ' (FREE)' : ''}</td>
        <td style="padding:2.5px 4px;text-align:center">${item.cases || ''}</td>
        <td style="padding:2.5px 4px;text-align:center">${item.qty_bottles > 0 ? item.qty_bottles : ''}</td>
        <td style="padding:2.5px 4px;text-align:right">${item.is_free ? '' : item.unit_price.toFixed(2)}</td>
        <td style="padding:2.5px 4px;text-align:right">${item.item_discount_per > 0 ? item.item_discount_per.toFixed(1)+'%' : ''}</td>
        <td style="padding:2.5px 4px;text-align:right;font-weight:700">${item.is_free ? '0.00' : item.total.toFixed(2)}</td>
      </tr>`).join('');

    const companyName = company?.name || 'EVERMARK LANKA';
    const companyAddr = company?.address || 'NEHINNA, DODANGODA, KALUTHARA SOUTH';
    const companyTel  = company?.phone || '0712315315';
    const companyEmail= company?.email || 'info.funbeverages@gmail.com';
    const invoiceDateFmt = invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-GB') : '';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
        }
      </style>
      </head><body>
      <div style="width:210mm;min-height:297mm;padding:10mm 12mm;background:#fff">
        <!-- HEADER -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6mm">
          <div style="display:flex;align-items:center;gap:8px">
            <img src="${LOGO_URL}" style="width:52px;height:52px;object-fit:contain" />
            <div>
              <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase">${companyName}</div>
              <div style="font-size:9px;color:#555;text-transform:uppercase;margin-top:2px">${companyAddr}</div>
            </div>
          </div>
          <div style="text-align:right;font-size:10px">
            <div><strong>TEL:</strong> ${companyTel}</div>
            <div><strong>EMAIL:</strong> ${companyEmail}</div>
          </div>
        </div>
        <hr style="border-top:2px solid #000;margin-bottom:3mm"/>
        <div style="text-align:center;margin-bottom:3mm">
          <span style="font-size:14px;font-weight:900;letter-spacing:4px;text-transform:uppercase;border-bottom:2px solid #000;padding-bottom:2px">SALES INVOICE</span>
        </div>
        <!-- META -->
        <div style="display:flex;justify-content:space-between;margin-bottom:3mm;font-size:10.5px">
          <div style="line-height:1.8">
            <div><strong>INV:</strong> ${inv.invoiceNo}</div>
            <div><strong>TO:</strong> MR. ${(customer?.full_name || '').toUpperCase()}</div>
            <div><strong>ADDR:</strong> ${customer?.address || 'N/A'}</div>
          </div>
          <div style="text-align:right;line-height:1.8">
            <div><strong>DATE:</strong> ${invoiceDateFmt}</div>
            <div><strong>VEHICLE:</strong> ${vehicleNo}</div>
            <div><strong>DRIVER:</strong> ${driverName}</div>
          </div>
        </div>
        <!-- ITEMS TABLE -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:4mm;font-size:10px">
          <thead>
            <tr style="border-bottom:1.5px solid #000;border-top:1.5px solid #000">
              <th style="padding:3px 4px;text-align:left;font-weight:900;text-transform:uppercase">DESCRIPTION</th>
              <th style="padding:3px 4px;text-align:center;font-weight:900;width:40px">CS</th>
              <th style="padding:3px 4px;text-align:center;font-weight:900;width:35px">BT</th>
              <th style="padding:3px 4px;text-align:right;font-weight:900;width:65px">RATE</th>
              <th style="padding:3px 4px;text-align:right;font-weight:900;width:55px">DISC</th>
              <th style="padding:3px 4px;text-align:right;font-weight:900;width:75px">TOTAL</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <!-- WORDS + TOTALS -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:3mm">
          <div style="font-size:9px;font-style:italic;max-width:60%;font-weight:700">WORDS: ${numberToWords(Math.round(totalNet))}</div>
          <div style="text-align:right;font-size:10px">
            <strong>TOTAL CASES: ${totalCases}</strong>
            <span style="margin-left:12px"><strong>TOTAL DISCOUNT: ${totalDiscount.toFixed(2)}</strong></span>
          </div>
        </div>
        <!-- NET TOTAL -->
        <div style="text-align:right;margin-bottom:4mm">
          <span style="font-size:18px;font-weight:900">NET TOTAL: LKR ${totalNet.toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})}</span>
        </div>
        <hr style="border-top:1px solid #000;margin-bottom:3mm"/>
        <div style="font-size:9px;margin-bottom:8mm">PAYMENT SHOULD BE MADE WITH IN THE CREDIT PERIOD INDICATED ABOVE, ALL THE CHEQUES SHOULD BE DRAWN IN FAVOUR OF ${companyName.toUpperCase()}.</div>
        <!-- SIGNATURES -->
        <div style="display:flex;justify-content:space-between;margin-bottom:4mm;gap:8px">
          ${['CHECKED BY','GOODS ISSUED BY','APPROVED BY'].map(l => `<div style="flex:1;border-top:1px solid #000;padding-top:4px;text-align:center;font-size:9px;font-weight:700">${l}</div>`).join('')}
        </div>
        <div style="font-size:9px;margin-bottom:6mm">
          <div>CUSTOMER NAME : .................................................... NIC NO : .....................................</div>
          <div style="margin-top:4px;font-style:italic">we received above goods in good order &amp; condition</div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-bottom:4mm">
          <div style="border-top:1px solid #000;width:140px;text-align:center;padding-top:3px;font-size:9px;font-weight:700">CUSTOMER SIGNATURE</div>
        </div>
        <div style="font-size:8.5px;margin-bottom:4mm;line-height:1.6">
          <div>NOTE: POST DATED CHEQUES ARE SUBJECT TO REALIZATION. IF YOUR FIND ANY DISCREPANCY IN THE BALANCE VERIFY WITHIN 7 DAYS.</div>
          <div><strong>**ONLY 1% ACCEPTING MARKET RETURNS FROM MONTHLY TURN OVER AND, WE ARE NOT ACCEPTING SODA 350ML,750ML AS MARKET RETURNS GOODS***</strong></div>
        </div>
        <div style="border:1px solid #000;padding:6px 8px;font-size:9px">
          <div style="display:flex;gap:40px;margin-bottom:6px"><span>TRANSPORTER NAME : .............................</span><span>ID NO : .............................</span></div>
          <div style="display:flex;gap:40px"><span>SIGNATURE : .............................</span><span>PHONE NO : .............................</span></div>
        </div>
      </div>
      <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
      </body></html>`;

    // 4. Popup ගෙ content write කරනවා
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  };

  const orderColumns = [
    { 
      header: 'Invoice Details', 
      cell: (o: any) => (
        <div className="flex flex-col">
          <span className="font-black text-blue-600">#{o.invoiceNo}</span>
          <span className="text-[9px] text-gray-400 font-bold tracking-wider">{formatDate(o.date)}</span>
        </div>
      ) 
    },
    { 
      header: 'Customer', 
      cell: (o: any) => (
        <div className="flex flex-col">
          <span className="text-xs font-black uppercase text-gray-700 leading-tight">{o.customerName}</span>
          <span className="text-[10px] text-gray-400 font-bold">{o.customerPhone}</span>
        </div>
      ) 
    },
    { 
      header: 'Total Amount', 
      cell: (o: any) => <span className="font-black text-gray-800">{formatCurrency(o.total)}</span> 
    },
    { 
      header: 'Actions', 
      cell: (o: any) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => generatePDF(o)} 
            className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group"
            title="Download PDF"
          >
            <Download size={15} />
          </button>
          
          <button 
            onClick={() => navigate(`/sales/new-invoice?edit=${o.dbId}`, { state: { invoiceId: o.dbId } })}
            className="flex items-center gap-1 px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all shadow-md active:scale-95"
          >
            <Edit size={14} /> Edit
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 p-4 bg-gray-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800">
            Order <span className="text-blue-600">Management</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Track and manage customer invoices</p>
        </div>
        <Button 
          onClick={() => navigate('/sales/new-invoice')} 
          className="rounded-2xl shadow-xl shadow-blue-100 uppercase font-black italic tracking-tighter hover:scale-105 transition-transform"
          leftIcon={<Plus size={18} />}
        >
          Create Invoice
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative group no-print">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="SEARCH BY CUSTOMER NAME OR INVOICE NO..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-[1.5rem] shadow-sm text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ── MOBILE: Card List ── */}
      {loading ? (
        <div className="p-12 text-center uppercase font-black text-slate-300 italic tracking-widest animate-pulse">
          <RefreshCcw className="inline mr-2 animate-spin" size={20} /> Loading...
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {invoices.filter(o =>
              o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              String(o.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase())
            ).map((o: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-blue-600 text-sm">#{o.invoiceNo}</p>
                    <p className="font-black text-slate-800 uppercase text-xs truncate">{o.customerName}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{formatDate(o.date)} · {o.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800 text-sm">{formatCurrency(o.total)}</p>
                    <div className="flex gap-1.5 mt-1 justify-end">
                      <button onClick={() => generatePDF(o)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg active:scale-90 transition-all"><Download size={13} /></button>
                      <button onClick={() => navigate(`/sales/new-invoice?edit=${o.dbId}`, { state: { invoiceId: o.dbId } })} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black active:scale-90 transition-all"><Edit size={11} /> Edit</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {invoices.filter(o =>
              o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              String(o.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 && (
              <div className="text-center py-10 text-slate-400 font-bold text-sm">No invoices found</div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block">
            <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
              <CardContent className="p-0">
                <TableView 
                  data={invoices.filter(o => 
                    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(o.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )} 
                  columns={orderColumns} 
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default OrdersPage;
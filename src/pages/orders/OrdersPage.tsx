import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCcw, Download, Edit } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import TableView from '../../components/common/TableView';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  // PDF එක හදන Function එක
  const generatePDF = async (inv: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("SMARTBIZ ERP - INVOICE", 14, 20);
    doc.setFontSize(10);
    doc.text(`Invoice No: #${inv.invoiceNo}`, 14, 30);
    doc.text(`Customer: ${inv.customerName}`, 14, 35);
    doc.text(`Date: ${formatDate(inv.date)}`, 14, 40);

    const { data: lines } = await supabase
      .from('invoice_items')
      .select(`quantity, qty_bottles, unit_price, total, inventory:inventory_id ( name )`)
      .eq('invoice_id', inv.dbId);

    const body = (lines || []).map((l: any) => ([
      l.inventory?.name || 'ITEM',
      `${Number(l.quantity || 0)}`,
      `${Number(l.qty_bottles || 0)}`,
      formatCurrency(Number(l.unit_price || 0)),
      formatCurrency(Number(l.total || 0))
    ]));

    autoTable(doc, {
      startY: 50,
      head: [['Item', 'CS', 'BT', 'Rate', 'Amount']],
      body: body.length > 0 ? body : [['-', '-', '-', '-', '-']],
      headStyles: { fillColor: [37, 99, 235] } // Blue header
    });

    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(12);
    doc.text(`Total Amount: LKR ${inv.total.toLocaleString()}`, 14, finalY + 10);
    doc.save(`Invoice_${inv.invoiceNo}.pdf`);
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
            onClick={() => navigate('/sales/new-invoice', { state: { invoiceId: o.dbId } })}
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

      {/* Orders Table */}
      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 text-center uppercase font-black text-slate-300 italic tracking-widest animate-pulse">
              <RefreshCcw className="inline mr-2 animate-spin" size={20} />
              Loading Invoices...
            </div>
          ) : (
            <TableView 
              data={invoices.filter(o => 
                o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(o.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase())
              )} 
              columns={orderColumns} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;
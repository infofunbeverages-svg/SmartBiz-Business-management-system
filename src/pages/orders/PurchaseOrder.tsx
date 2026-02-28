import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, Printer, MapPin, Phone, Mail } from 'lucide-react';
import { useCompany } from '../../utils/useCompany';

const PurchaseOrder = () => {
  const { company } = useCompany();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [items, setItems] = useState([{ inventory_id: '', name: '', qty: 0, unit_type: 'Units', unit_price: 0, total: 0 }]);
  const [poNumber] = useState(`PO-${Math.floor(1000 + Math.random() * 9000)}`);

  // --- මෙන්න මෙතන තමයි උඹේ අලුත් ලින්ක්ස් ටික තියෙන්නේ ---
  const ASSETS = {
    LOGO: 'https://ozbeyvqaxerstipdehkb.supabase.co/storage/v1/object/public/company-assets/wvwrmark%20logo.jpeg',
    FB_QR: 'https://ozbeyvqaxerstipdehkb.supabase.co/storage/v1/object/public/company-assets/FB%20QR.jpeg',
    IG_QR: 'https://ozbeyvqaxerstipdehkb.supabase.co/storage/v1/object/public/company-assets/Insta%20QR.jpeg',
    TT_QR: 'https://ozbeyvqaxerstipdehkb.supabase.co/storage/v1/object/public/company-assets/tiktock%20Qr.jpeg'
  };

  useEffect(() => { if (company) fetchData(); }, [company]);

  const fetchData = async () => {
    if (!company) return;
    const { data: supData } = await supabase.from('suppliers').select('*').eq('company_id', company.id);
    const { data: stockData } = await supabase.from('inventory').select('*').eq('company_id', company.id);
    setSuppliers(supData || []);
    setStock(stockData || []);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items] as any[];
    newItems[index][field] = value;
    if (field === 'inventory_id') {
      const prod = stock.find(s => s.id === value);
      newItems[index].name = prod?.name || '';
      newItems[index].unit_price = prod?.cost_price || 0;
    }
    newItems[index].total = Number(newItems[index].qty || 0) * Number(newItems[index].unit_price || 0);
    setItems(newItems);
  };

  const grandTotal = items.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:bg-white print:p-0">
      {/* UI Controls - Only Visible on Screen */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between print:hidden">
        <button onClick={() => setItems([...items, { inventory_id: '', name: '', qty: 0, unit_type: 'Units', unit_price: 0, total: 0 }])} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase shadow-lg flex items-center gap-2 hover:bg-black transition-all">
          <Plus size={18}/> Add Item
        </button>
        <button onClick={() => window.print()} className="bg-[#79B433] text-white px-10 py-2 rounded-xl font-bold text-xs uppercase shadow-xl flex items-center gap-2 hover:bg-[#689c2b] transition-all">
          <Printer size={18}/> Print Purchase Order
        </button>
      </div>

      {/* A4 Document Container */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl print:shadow-none min-h-[297mm] p-16 flex flex-col relative overflow-hidden font-sans">
        
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#79B433]"></div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-12">
          <div className="flex gap-6 items-center">
            {/* උඹේ Logo එක */}
            <img src={ASSETS.LOGO} alt="Evermark Logo" className="w-24 h-24 object-contain" />
            <div>
              <h1 className="text-3xl font-black text-slate-900 leading-none uppercase tracking-tighter">Evermark Lanka</h1>
              <p className="text-[10px] font-bold text-[#79B433] uppercase tracking-[0.3em] mt-1 italic">Manufacturing & Sales</p>
              <div className="mt-4 space-y-1 text-[11px] text-slate-500 font-semibold uppercase">
                <p className="flex items-center gap-2"><MapPin size={12} className="text-[#79B433]"/> Dewalegama, Nehinna, Dodangoda, Kalutara</p>
                <p className="flex items-center gap-2"><Phone size={12} className="text-[#79B433]"/> +94 712 315 315</p>
                <p className="flex items-center gap-2 lowercase italic tracking-normal font-bold text-slate-600"><Mail size={12} className="text-[#79B433] font-bold"/> info.funbeverages@gmail.com</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2 border-b-4 border-[#79B433] inline-block">PURCHASE ORDER</h2>
            <div className="mt-4 space-y-1 font-bold uppercase text-[12px] text-slate-500">
              <p>PO REF: <span className="text-slate-900 ml-2 font-black">{poNumber}</span></p>
              <p>DATE: <span className="text-slate-900 ml-2">{new Date().toLocaleDateString('en-GB')}</span></p>
            </div>
          </div>
        </div>

        {/* Vendor & Amount Summary */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-[#79B433] uppercase tracking-widest mb-3 underline underline-offset-4 italic">Official Supplier:</p>
            <div className="print:hidden mb-4">
              <select className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-[#79B433]" onChange={(e) => setSelectedSupplier(suppliers.find(s => s.id === e.target.value))}>
                <option>Choose Vendor...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">{selectedSupplier?.name || '____________________'}</h3>
            <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed uppercase">{selectedSupplier?.address || 'Vendor address is required for official orders'}</p>
          </div>
          
          <div className="flex flex-col justify-center items-end border-r-8 border-[#79B433] pr-6 bg-slate-900 text-white p-6 rounded-l-3xl shadow-lg">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Payable Amount</p>
            <p className="text-4xl font-black tracking-tighter uppercase font-mono">LKR {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-grow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-4 border-slate-900 text-[11px] font-black uppercase tracking-widest text-slate-900">
                <th className="py-4 text-left pl-2">Description</th>
                <th className="py-4 text-center">Qty</th>
                <th className="py-4 text-center">Unit</th>
                <th className="py-4 text-right">Rate (Rs)</th>
                <th className="py-4 text-right pr-2">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {items.map((item, index) => (
                <tr key={index} className="text-[13px] font-bold text-slate-800 hover:bg-slate-50 transition-colors">
                  <td className="py-5 pl-2">
                    <select className="w-full bg-transparent outline-none uppercase print:appearance-none focus:text-[#79B433] font-black" value={item.inventory_id} onChange={(e) => handleItemChange(index, 'inventory_id', e.target.value)}>
                      <option>Select Product / Item...</option>
                      {stock.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="py-5 text-center font-black">
                    <input type="number" className="w-16 text-center bg-slate-100 rounded-md p-1 print:bg-transparent" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} />
                  </td>
                  <td className="py-5 text-center text-slate-400">
                    <select className="bg-transparent outline-none print:appearance-none uppercase font-bold text-[11px]" value={item.unit_type} onChange={(e) => handleItemChange(index, 'unit_type', e.target.value)}>
                      <option>Units</option><option>Cases</option><option>Ltr</option><option>Kg</option><option>Bot</option>
                    </select>
                  </td>
                  <td className="py-5 text-right text-slate-500">{item.unit_price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-5 text-right pr-2 font-black text-slate-900 italic underline decoration-[#79B433] decoration-2 underline-offset-4">
                    {item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer & QR Section */}
        <div className="mt-12">
          <div className="flex justify-between items-end border-t-2 border-slate-100 pt-10">
            {/* Social QR Codes - Direct Links */}
            <div className="flex gap-6 p-4 bg-slate-50 rounded-2xl print:bg-white print:p-0">
                <div className="text-center opacity-80">
                  <img src={ASSETS.FB_QR} alt="FB" className="w-12 h-12 mx-auto grayscale" />
                  <p className="text-[7px] font-black uppercase mt-1 tracking-tighter">Facebook</p>
                </div>
                <div className="text-center opacity-80">
                  <img src={ASSETS.IG_QR} alt="IG" className="w-12 h-12 mx-auto grayscale" />
                  <p className="text-[7px] font-black uppercase mt-1 tracking-tighter">Instagram</p>
                </div>
                <div className="text-center opacity-80">
                  <img src={ASSETS.TT_QR} alt="TT" className="w-12 h-12 mx-auto grayscale" />
                  <p className="text-[7px] font-black uppercase mt-1 tracking-tighter">TikTok</p>
                </div>
            </div>

            {/* Signature Blocks */}
            <div className="flex gap-12 text-center pb-2">
              <div className="w-32 border-t-2 border-slate-200 pt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prepared By</div>
              <div className="w-48 border-t-4 border-slate-900 pt-2 text-[11px] font-black text-slate-900 uppercase tracking-widest italic tracking-tighter underline decoration-[#79B433]">Authorized Approval</div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">
            Evermark Lanka - Official Purchase Document - Generated via SmartBiz ERP
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; background: white; }
          .print\\:hidden { display: none !important; }
        }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};

export default PurchaseOrder;
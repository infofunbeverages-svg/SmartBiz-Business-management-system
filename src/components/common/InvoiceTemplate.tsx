import React from 'react';

// ─── Number to Words ──────────────────────────────────────────────────────────
const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const format = (n: number) => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
  };
  let str = '';
  if (num >= 100000) { str += format(Math.floor(num / 100000)) + 'Lakh '; num %= 100000; }
  if (num >= 1000)   { str += format(Math.floor(num / 1000)) + 'Thousand '; num %= 1000; }
  if (num >= 100)    { str += format(Math.floor(num / 100)) + 'Hundred '; num %= 100; }
  if (num > 0)       str += (str !== '' ? 'and ' : '') + format(num);
  return str.toUpperCase().trim() + ' RUPEES ONLY';
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface InvoiceItem {
  inventory_id:      string;
  name:              string;
  cases:             number;
  qty_bottles:       number;
  units_per_case:    number;
  unit_price:        number;
  item_discount_per: number;
  is_free:           boolean;
  total:             number;
}

export interface InvoiceData {
  invoiceNo:       string;
  invoiceDate:     string;
  vehicleNo:       string;
  driverName:      string;
  dispatchNo:      string;
  customerDetails: any;
  items:           InvoiceItem[];
  company:         any;
  logoUrl?:        string;
}

// ─── Component ────────────────────────────────────────────────────────────────
const InvoiceTemplate = ({ invoiceNo, invoiceDate, vehicleNo, driverName, dispatchNo, customerDetails, items, company, logoUrl }: InvoiceData) => {

  const validItems = items.filter(i => i.inventory_id);

  // Totals
  const totalNet        = validItems.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalCases      = validItems.reduce((acc, i) => acc + Number(i.cases || 0), 0);
  const totalDiscount   = validItems.reduce((acc, i) => {
    const upc      = Number(i.units_per_case) || 12;
    const totalBtl = (Number(i.cases || 0) * upc) + Number(i.qty_bottles || 0);
    const gross    = (totalBtl / upc) * Number(i.unit_price || 0);
    return acc + (gross - Number(i.total || 0));
  }, 0);

  return (
    <div
      id="invoice-print-area"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '10mm 12mm',
        backgroundColor: '#fff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#000',
        boxSizing: 'border-box',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6mm' }}>
        {/* Left: Logo + Company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {logoUrl && (
            <img src={logoUrl} alt="Logo" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
          )}
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
              {company?.name || 'EVERMARK LANKA'}
            </div>
            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', marginTop: '2px' }}>
              {company?.address || 'NEHINNA, DODANGODA, KALUTHARA SOUTH'}
            </div>
          </div>
        </div>

        {/* Right: Contact */}
        <div style={{ textAlign: 'right', fontSize: '10px' }}>
          <div><strong>TEL:</strong> {company?.phone || '0712315315'}</div>
          <div><strong>EMAIL:</strong> {company?.email || 'info.funbeverages@gmail.com'}</div>
        </div>
      </div>

      {/* ── DIVIDER ─────────────────────────────────────────────────────────── */}
      <hr style={{ borderTop: '2px solid #000', marginBottom: '3mm' }} />

      {/* SALES INVOICE TITLE */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <span style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '4px', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '2px' }}>SALES INVOICE</span>
      </div>

      {/* ── INVOICE META ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3mm', fontSize: '10.5px' }}>
        <div style={{ lineHeight: '1.8' }}>
          <div><strong>INV:</strong> {invoiceNo}</div>
          <div><strong>TO:</strong> MR. {(customerDetails?.full_name || '').toUpperCase()}</div>
          <div><strong>ADDR:</strong> {customerDetails?.address || 'N/A'}</div>
        </div>
        <div style={{ textAlign: 'right', lineHeight: '1.8' }}>
          <div><strong>DATE:</strong> {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-GB').replace(/\//g, '/') : ''}</div>
          <div><strong>VEHICLE:</strong> {vehicleNo || 'N/A'}</div>
          <div><strong>DRIVER:</strong> {driverName || 'N/A'}</div>
        </div>
      </div>

      {/* ── ITEMS TABLE ─────────────────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid #000', borderTop: '1.5px solid #000' }}>
            <th style={{ padding: '3px 4px', textAlign: 'left',   fontWeight: '900', textTransform: 'uppercase' }}>DESCRIPTION</th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontWeight: '900', textTransform: 'uppercase', width: '40px' }}>CS</th>
            <th style={{ padding: '3px 4px', textAlign: 'center', fontWeight: '900', textTransform: 'uppercase', width: '35px' }}>BT</th>
            <th style={{ padding: '3px 4px', textAlign: 'right',  fontWeight: '900', textTransform: 'uppercase', width: '65px' }}>RATE</th>
            <th style={{ padding: '3px 4px', textAlign: 'right',  fontWeight: '900', textTransform: 'uppercase', width: '55px' }}>DISC</th>
            <th style={{ padding: '3px 4px', textAlign: 'right',  fontWeight: '900', textTransform: 'uppercase', width: '75px' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {validItems.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '0.5px dotted #ccc' }}>
              <td style={{ padding: '2.5px 4px' }}>
                {item.name?.toUpperCase()}
                {item.is_free ? ' (FREE)' : ''}
              </td>
              <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>{item.cases || ''}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'center' }}>{item.qty_bottles > 0 ? item.qty_bottles : ''}</td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right' }}>
                {item.is_free ? '' : Number(item.unit_price).toFixed(2)}
              </td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right' }}>
                {item.item_discount_per > 0 ? `${Number(item.item_discount_per).toFixed(1)}%` : ''}
              </td>
              <td style={{ padding: '2.5px 4px', textAlign: 'right', fontWeight: '700' }}>
                {item.is_free ? '0.00' : Number(item.total).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── WORDS + TOTALS ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3mm' }}>
        <div style={{ fontSize: '9px', fontStyle: 'italic', maxWidth: '60%', fontWeight: '700' }}>
          WORDS: {numberToWords(Math.round(totalNet))}
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px' }}>
          <span><strong>TOTAL CASES: {totalCases}</strong></span>
          <span style={{ marginLeft: '12px' }}><strong>TOTAL DISCOUNT: {totalDiscount.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* ── NET TOTAL ───────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'right', marginBottom: '4mm' }}>
        <span style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '-0.5px' }}>
          NET TOTAL: LKR {totalNet.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
        </span>
      </div>

      <hr style={{ borderTop: '1px solid #000', marginBottom: '3mm' }} />

      {/* ── PAYMENT NOTE ────────────────────────────────────────────────────── */}
      <div style={{ fontSize: '9px', marginBottom: '8mm' }}>
        PAYMENT SHOULD BE MADE WITH IN THE CREDIT PERIOD INDICATED ABOVE, ALL THE CHEQUES SHOULD BE DRAWN IN FAVOUR OF {(company?.name || 'EVERMARK LANKA').toUpperCase()}.
      </div>

      {/* ── SIGNATURE SECTION ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4mm', gap: '8px' }}>
        {['CHECKED BY', 'GOODS ISSUED BY', 'APPROVED BY'].map(label => (
          <div key={label} style={{ flex: 1, borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center', fontSize: '9px', fontWeight: '700' }}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ fontSize: '9px', marginBottom: '6mm' }}>
        <div>CUSTOMER NAME : .................................................... NIC NO : .....................................</div>
        <div style={{ marginTop: '4px', fontStyle: 'italic' }}>we received above goods in good order &amp; condition</div>
      </div>

      {/* ── CUSTOMER SIGNATURE ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4mm' }}>
        <div style={{ borderTop: '1px solid #000', width: '140px', textAlign: 'center', paddingTop: '3px', fontSize: '9px', fontWeight: '700' }}>
          CUSTOMER SIGNATURE
        </div>
      </div>

      {/* ── NOTES ───────────────────────────────────────────────────────────── */}
      <div style={{ fontSize: '8.5px', marginBottom: '4mm', lineHeight: '1.6' }}>
        <div>NOTE: POST DATED CHEQUES ARE SUBJECT TO REALIZATION. IF YOUR FIND ANY DISCREPANCY IN THE BALANCE VERIFY WITHIN 7 DAYS.</div>
        <div><strong>**ONLY 1% ACCEPTING MARKET RETURNS FROM MONTHLY TURN OVER AND, WE ARE NOT ACCEPTING SODA 350ML,750ML AS MARKET RETURNS GOODS***</strong></div>
      </div>

      {/* ── TRANSPORTER BOX ─────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '9px' }}>
        <div style={{ display: 'flex', gap: '40px', marginBottom: '6px' }}>
          <span>TRANSPORTER NAME : .............................</span>
          <span>ID NO : .............................</span>
        </div>
        <div style={{ display: 'flex', gap: '40px' }}>
          <span>SIGNATURE : .............................</span>
          <span>PHONE NO : .............................</span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;

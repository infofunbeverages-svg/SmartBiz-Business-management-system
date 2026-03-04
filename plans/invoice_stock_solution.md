# Invoice Stock Update Solution / ඉන්වොයිස් ස්ටොක් අප්ඩේට් විසඳුම

## Current Issue / වර්තමාන ගැටළුව
Invoice එකක් සේව් කරාට පස්සේ stock එක update වෙන්නේ නැහැ. මේකට හේතුව තමයි existing invoice එකක් update කරද්දී stock movements සහ inventory updates හරියට handle වෙන්නේ නැති එක.

## Proposed Solution / යෝජිත විසඳුම

### 1. Database Function / ඩේටාබේස් ෆංක්ෂන් එක
`update_invoice_stock` කියලා database function එකක් හදනවා. මේක:

- පරණ stock movements ටික reverse කරනවා
- අලුත් invoice items ටික insert කරනවා
- Stock movements record කරනවා
- Inventory balance update කරනවා

```sql
-- Function signature
update_invoice_stock(
    p_invoice_id UUID,        -- Invoice ID එක
    p_company_id UUID,        -- Company ID එක
    p_customer_id UUID,       -- Customer ID එක
    p_invoice_no TEXT,        -- Invoice අංකය
    p_total_net NUMERIC,      -- මුළු ගණන
    p_vehicle_no TEXT,        -- වාහන අංකය
    p_driver_name TEXT,       -- රියදුරුගේ නම
    p_dispatch_no TEXT,       -- dispatch අංකය
    p_invoice_date DATE,      -- දිනය
    p_items JSONB            -- invoice items ටික
)
```

### 2. Frontend Changes / ෆ්රන්ට්එන්ඩ් වෙනස්කම්

[`SalesInvoice.tsx`](src/pages/sales/SalesInvoice.tsx) file එකේ:

1. New invoice හදද්දි:
```typescript
await supabase.rpc('update_invoice_stock', {
  p_invoice_id: newInvoiceId,
  // ... other params
  p_items: items.map(item => ({
    inventory_id: item.inventory_id,
    cases: item.cases,
    qty_bottles: item.qty_bottles,
    // ... other item fields
  }))
});
```

2. Existing invoice update කරද්දි:
```typescript
await supabase.rpc('update_invoice_stock', {
  p_invoice_id: editingInvoiceId,
  // ... same parameters as new invoice
});
```

### 3. Stock Validation / ස්ටොක් වැලිඩේෂන්
Invoice සේව් කරන්න කලින් check කරනවා ඒ items වලට ප්‍රමාණවත් stock තියෙනවද කියලා:

```typescript
// Check stock before saving
for (const item of items) {
  const { data: stock } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('id', item.inventory_id)
    .single();
    
  const deduct = (Number(item.cases || 0) * item.units_per_case) + 
                Number(item.qty_bottles || 0);
    
  if ((stock?.quantity || 0) < deduct) {
    throw new Error(`මේ item එකට ප්‍රමාණවත් stock නැත: ${item.name}`);
  }
}
```

## Benefits / ප්‍රතිලාභ

1. New සහ existing invoices දෙකටම එකම logic එක පාවිච්චි වෙනවා
2. Stock updates transaction එකක් විදිහට වෙනවා (partial updates වෙන්නේ නැහැ)
3. Stock validation automatically handle වෙනවා
4. Stock movements history එක නිවැරදිව maintain වෙනවා

## Implementation Steps / ක්‍රියාත්මක කිරීමේ පියවර

1. Database function එක create කරන්න
2. Frontend code එක update කරන්න
3. Test කරන්න:
   - New invoice create කරලා
   - Existing invoice update කරලා
   - Stock validation check කරලා
   - Stock movements check කරලා

## Testing Scenarios / ටෙස්ට් කිරීමේ අවස්ථා

1. New invoice with multiple items
2. Edit existing invoice (items add/remove/modify)
3. Try to exceed available stock
4. Check stock movements are correct
5. Verify inventory balances update properly
-- Raw Materials Module
-- Unit types: BAGS (e.g. empty bottles), KG (e.g. sugar), NOS (e.g. labels), TUBES (e.g. shrink labels)

-- 1. Raw Materials Master
CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('BAGS', 'KG', 'NOS', 'TUBES')),
  qty_per_unit NUMERIC DEFAULT 1,  -- e.g. bottles per bag for BAGS type
  size TEXT,  -- optional: 375ml, 625ml, 1L for bottles
  default_supplier_id UUID REFERENCES suppliers(id),
  quantity NUMERIC DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Raw Material GRN Master
CREATE TABLE IF NOT EXISTS raw_material_grn_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  grn_no TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  bill_no TEXT,
  grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Raw Material GRN Items
CREATE TABLE IF NOT EXISTS raw_material_grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES raw_material_grn_master(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,  -- in the material's unit (bags, kg, nos, tubes)
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Raw Material Stock Movements (for adjustments/history)
CREATE TABLE IF NOT EXISTS raw_material_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('GRN_IN', 'ADJUST_IN', 'ADJUST_OUT', 'ISSUE')),
  sub_type TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_raw_materials_company ON raw_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_grn_company ON raw_material_grn_master(company_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_grn_items_grn ON raw_material_grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_movements_material ON raw_material_movements(raw_material_id);

-- RLS (Row Level Security) - enable if using Supabase auth
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_grn_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_movements ENABLE ROW LEVEL SECURITY;

-- Policies - allow all for now (adjust based on your auth setup)
CREATE POLICY "Allow all raw_materials" ON raw_materials FOR ALL USING (true);
CREATE POLICY "Allow all raw_material_grn_master" ON raw_material_grn_master FOR ALL USING (true);
CREATE POLICY "Allow all raw_material_grn_items" ON raw_material_grn_items FOR ALL USING (true);
CREATE POLICY "Allow all raw_material_movements" ON raw_material_movements FOR ALL USING (true);

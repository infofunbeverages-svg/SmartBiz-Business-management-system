-- Create function to handle invoice stock updates
CREATE OR REPLACE FUNCTION update_invoice_stock(
    p_invoice_id UUID,
    p_company_id UUID,
    p_customer_id UUID,
    p_invoice_no TEXT,
    p_total_net NUMERIC,
    p_vehicle_no TEXT,
    p_driver_name TEXT,
    p_dispatch_no TEXT,
    p_invoice_date DATE,
    p_items JSONB
) RETURNS void AS $$
DECLARE
    v_item JSONB;
    v_old_item RECORD;
    v_deduct INTEGER;
    v_current_qty INTEGER;
    v_bottles_per_case INTEGER;
BEGIN
    -- First, reverse any existing stock movements for this invoice
    FOR v_old_item IN 
        SELECT inventory_id, quantity
        FROM stock_movements
        WHERE type = 'SALE'
        AND sub_type = 'INVOICE'
        AND note = p_invoice_no
    LOOP
        -- Reverse the stock movement by updating inventory
        UPDATE inventory 
        SET quantity = quantity - v_old_item.quantity  -- Since quantity was negative for sales, we subtract it to reverse
        WHERE id = v_old_item.inventory_id;
    END LOOP;

    -- Delete old stock movements for this invoice
    DELETE FROM stock_movements 
    WHERE type = 'SALE' 
    AND sub_type = 'INVOICE' 
    AND note = p_invoice_no;

    -- Delete old invoice items
    DELETE FROM invoice_items 
    WHERE invoice_id = p_invoice_id;

    -- Update invoice details
    UPDATE invoices 
    SET 
        customer_id = p_customer_id,
        company_id = p_company_id,
        total_amount = p_total_net,
        vehicle_no = p_vehicle_no,
        driver_name = p_driver_name,
        created_at = p_invoice_date,
        invoice_no = p_invoice_no
    WHERE id = p_invoice_id;

    -- Process each item in the new invoice
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Skip if no inventory_id
        IF v_item->>'inventory_id' IS NULL OR v_item->>'inventory_id' = '' THEN
            CONTINUE;
        END IF;

        -- Get bottles per case for this item
        SELECT COALESCE(bottles_per_case, 12) INTO v_bottles_per_case
        FROM inventory 
        WHERE id = (v_item->>'inventory_id')::UUID;

        -- Calculate total bottles to deduct
        v_deduct := (COALESCE((v_item->>'cases')::INTEGER, 0) * v_bottles_per_case) + 
                    COALESCE((v_item->>'qty_bottles')::INTEGER, 0);

        -- Get current quantity
        SELECT quantity INTO v_current_qty
        FROM inventory 
        WHERE id = (v_item->>'inventory_id')::UUID;

        -- Validate stock availability
        IF v_current_qty < v_deduct THEN
            RAISE EXCEPTION 'මේ item එකට ප්‍රමාණවත් stock නැත: %', v_item->>'inventory_id';
        END IF;

        -- Insert new invoice item
        INSERT INTO invoice_items (
            invoice_id,
            inventory_id,
            quantity,
            qty_bottles,
            unit_price,
            total,
            is_free
        ) VALUES (
            p_invoice_id,
            (v_item->>'inventory_id')::UUID,
            COALESCE((v_item->>'cases')::INTEGER, 0),
            COALESCE((v_item->>'qty_bottles')::INTEGER, 0),
            COALESCE((v_item->>'unit_price')::NUMERIC, 0),
            COALESCE((v_item->>'total')::NUMERIC, 0),
            COALESCE((v_item->>'is_free')::BOOLEAN, false)
        );

        -- Create stock movement record
        INSERT INTO stock_movements (
            inventory_id,
            quantity,
            type,
            sub_type,
            note,
            is_free
        ) VALUES (
            (v_item->>'inventory_id')::UUID,
            -v_deduct,
            'SALE',
            'INVOICE',
            p_invoice_no,
            COALESCE((v_item->>'is_free')::BOOLEAN, false)
        );

        -- Update inventory quantity
        UPDATE inventory 
        SET quantity = quantity - v_deduct
        WHERE id = (v_item->>'inventory_id')::UUID;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

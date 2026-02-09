-- Optional: Create a PostgreSQL function for even faster batch updates
-- This function allows updating multiple records in a single SQL call
-- Date: 2026-02-03

-- Function to batch update invoice data
CREATE OR REPLACE FUNCTION batch_update_invoice_data(
  update_pairs TEXT[],
  updates JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_count INTEGER := 0;
  update_item JSONB;
  etd_val DATE;
  container_val TEXT;
BEGIN
  -- Loop through each update
  FOR update_item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    etd_val := (update_item->>'etd')::DATE;
    container_val := update_item->>'container';
    
    -- Update the record
    UPDATE shipping_records
    SET
      vessel = COALESCE((update_item->'fields'->>'vessel')::TEXT, vessel),
      invoice_no = COALESCE((update_item->'fields'->>'invoice_no')::TEXT, invoice_no),
      invoice_date = COALESCE((update_item->'fields'->>'invoice_date')::DATE, invoice_date),
      customer_name = COALESCE((update_item->'fields'->>'customer_name')::TEXT, customer_name),
      billing_no = COALESCE((update_item->'fields'->>'billing_no')::TEXT, billing_no),
      updated_at = NOW()
    WHERE etd = etd_val
      AND container = container_val;
    
    IF FOUND THEN
      update_count := update_count + 1;
    END IF;
  END LOOP;
  
  RETURN update_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION batch_update_invoice_data TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_invoice_data TO service_role;

-- Add comment
COMMENT ON FUNCTION batch_update_invoice_data IS 'Batch update invoice data for shipping_records table. More efficient than individual updates.';


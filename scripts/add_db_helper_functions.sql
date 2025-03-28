-- Function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = check_table_exists.table_name
    ) INTO table_exists;
    
    RETURN table_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to list columns in a table
CREATE OR REPLACE FUNCTION list_table_columns(table_name TEXT)
RETURNS TEXT[] AS $$
DECLARE
    columns TEXT[];
BEGIN
    SELECT array_agg(column_name::TEXT) INTO columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = list_table_columns.table_name;
    
    RETURN columns;
END;
$$ LANGUAGE plpgsql;

-- Function to count records in a table filtered by brand_id
CREATE OR REPLACE FUNCTION count_records_by_brand(table_name TEXT, brand_id UUID)
RETURNS INTEGER AS $$
DECLARE
    record_count INTEGER;
    query TEXT;
BEGIN
    IF NOT check_table_exists(table_name) THEN
        RETURN 0;
    END IF;
    
    -- Dynamically construct and execute the query
    query := 'SELECT COUNT(*) FROM ' || table_name || ' WHERE brand_id = $1';
    EXECUTE query INTO record_count USING brand_id;
    
    RETURN record_count;
END;
$$ LANGUAGE plpgsql; 
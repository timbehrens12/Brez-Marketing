-- Create a function to check if a column exists in a table
CREATE OR REPLACE FUNCTION check_column_exists(table_name TEXT, column_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = check_column_exists.table_name 
        AND column_name = check_column_exists.column_name
    ) INTO column_exists;
    
    RETURN column_exists;
END;
$$ LANGUAGE plpgsql;

-- Create a function to add the views column if missing
CREATE OR REPLACE FUNCTION add_views_column_if_missing()
RETURNS VOID AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT check_column_exists('meta_ad_insights', 'views') INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'Adding views column to meta_ad_insights table...';
        EXECUTE 'ALTER TABLE meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0';
        RAISE NOTICE 'Views column added successfully.';
    ELSE
        RAISE NOTICE 'Views column already exists in meta_ad_insights table.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update views data from reach data
CREATE OR REPLACE FUNCTION update_views_from_reach()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- First ensure the views column exists
    PERFORM add_views_column_if_missing();
    
    -- Update views with reach values where views is NULL or 0
    UPDATE meta_ad_insights
    SET views = reach
    WHERE (views IS NULL OR views = 0) AND reach IS NOT NULL AND reach > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Updated % records with views data from reach', updated_count;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql; 
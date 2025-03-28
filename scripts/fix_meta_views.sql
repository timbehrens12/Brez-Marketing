-- Script to fix Meta views data by extracting video views from actions array
-- This script will find records with zero values in the views column
-- but that have video-related data in the actions array

-- First, let's see if we have any records with zero views but video data in actions
DO $$
DECLARE
    records_updated INT := 0;
    records_examined INT := 0;
    video_actions_found INT := 0;
BEGIN
    -- Output notice
    RAISE NOTICE 'Examining Meta ad insights data for video views information...';
    
    -- Update records where views = 0 but actions array contains video data
    FOR r IN 
        SELECT id, actions 
        FROM meta_ad_insights 
        WHERE (views IS NULL OR views = 0)
        AND actions IS NOT NULL
        AND jsonb_array_length(actions) > 0
    LOOP
        records_examined := records_examined + 1;
        
        -- For each record, look for video-related actions
        DECLARE
            total_views INT := 0;
            i INT;
            action_type TEXT;
            action_value NUMERIC;
        BEGIN
            FOR i IN 0..jsonb_array_length(r.actions) - 1 LOOP
                action_type := r.actions->i->>'action_type';
                action_value := (r.actions->i->>'value')::NUMERIC;
                
                -- If action type contains 'video' or 'view' and has a value
                IF (action_type LIKE '%video%' OR action_type LIKE '%view%') 
                   AND action_value IS NOT NULL THEN
                    RAISE NOTICE 'Found video action: % with value % for record %', 
                                 action_type, action_value, r.id;
                    total_views := total_views + FLOOR(action_value);
                    video_actions_found := video_actions_found + 1;
                END IF;
            END LOOP;
            
            -- If we found views, update the record
            IF total_views > 0 THEN
                UPDATE meta_ad_insights
                SET views = total_views
                WHERE id = r.id;
                
                records_updated := records_updated + 1;
                RAISE NOTICE 'Updated record % with % views', r.id, total_views;
            END IF;
        END;
    END LOOP;
    
    -- Output summary
    RAISE NOTICE 'Fix Meta Views Summary:';
    RAISE NOTICE '-----------------------';
    RAISE NOTICE 'Records examined: %', records_examined;
    RAISE NOTICE 'Video actions found: %', video_actions_found;
    RAISE NOTICE 'Records updated: %', records_updated;
    
    -- If no data was found or updated, provide guidance
    IF records_updated = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE 'No records were updated. This could mean:';
        RAISE NOTICE '1. There are no video ads in your Meta campaigns';
        RAISE NOTICE '2. The Meta API is not returning video data';
        RAISE NOTICE '3. The data needs to be resynced from Meta';
        RAISE NOTICE '';
        RAISE NOTICE 'Recommendation: Run a full resync from the Meta Ads dashboard.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE 'Successfully updated % records with video views data!', records_updated;
        RAISE NOTICE 'Your views widget should now show data if you had video ads.';
    END IF;
END $$; 
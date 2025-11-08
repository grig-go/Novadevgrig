-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configuration table
CREATE TABLE IF NOT EXISTS sync_config (
    key text PRIMARY KEY,
    value text NOT NULL
);

INSERT INTO sync_config (key, value) VALUES
    ('supabase_url', 'http://host.docker.internal:54321'),
    ('anon_key', 'your-anon-key-here'),
    ('check_interval_seconds', '10')  -- How often to check for due syncs
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Main sync checking function
CREATE OR REPLACE FUNCTION check_and_trigger_syncs()
RETURNS void AS $$
DECLARE
    integration record;
    supabase_url text;
    anon_key text;
    function_name text;
    response record;
    interval_seconds integer;
    time_since_last_sync interval;
    is_due boolean;
BEGIN
    -- Get configuration
    SELECT value INTO supabase_url FROM sync_config WHERE key = 'supabase_url';
    SELECT value INTO anon_key FROM sync_config WHERE key = 'anon_key';
    
    IF anon_key IS NULL OR supabase_url IS NULL THEN
        RAISE WARNING 'Missing configuration. Please set supabase_url and anon_key in sync_config table.';
        RETURN;
    END IF;
    
    -- Process each active integration with sync enabled
    FOR integration IN 
        SELECT 
            id, 
            name, 
            type,
            sync_config,
            last_sync_at,
            next_sync_at,
            sync_status,
            -- Calculate interval in seconds for comparison
            CASE 
                WHEN (sync_config->>'intervalUnit') = 'seconds' THEN
                    (sync_config->>'interval')::integer
                WHEN (sync_config->>'intervalUnit') = 'minutes' THEN
                    (sync_config->>'interval')::integer * 60
                WHEN (sync_config->>'intervalUnit') = 'hours' THEN
                    (sync_config->>'interval')::integer * 3600
                WHEN (sync_config->>'intervalUnit') = 'days' THEN
                    (sync_config->>'interval')::integer * 86400
                ELSE 3600  -- Default to 1 hour
            END as interval_seconds
        FROM data_sources
        WHERE active = true
        AND (sync_config->>'enabled')::boolean = true
        AND sync_status != 'running'  -- Skip already running syncs
    LOOP
        -- Check if sync is due
        IF integration.next_sync_at IS NOT NULL THEN
            -- Use next_sync_at if available
            is_due := NOW() >= integration.next_sync_at;
        ELSIF integration.last_sync_at IS NULL THEN
            -- Never synced before
            is_due := true;
            RAISE NOTICE '[%] % never synced before - triggering initial sync', 
                        NOW()::time, integration.name;
        ELSE
            -- Calculate based on last_sync_at and interval
            time_since_last_sync := NOW() - integration.last_sync_at;
            is_due := EXTRACT(EPOCH FROM time_since_last_sync) >= integration.interval_seconds;
        END IF;
        
        IF is_due THEN
            RAISE NOTICE '[%] Triggering sync for % (type: %)', 
                        NOW()::time, integration.name, integration.type;
        END IF;
        
        -- Trigger sync if due
        IF is_due THEN
            BEGIN
                -- Determine the edge function to call based on type
                function_name := format('sync-%s-integration', integration.type);
                
                -- Update status to running
                UPDATE data_sources 
                SET sync_status = 'running',
                    updated_at = NOW()
                WHERE id = integration.id;
                
                -- Call the edge function via HTTP
                SELECT * INTO response FROM net.http_post(
                    url := format('%s/functions/v1/%s', supabase_url, function_name),
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || anon_key
                    )::jsonb,
                    body := jsonb_build_object(
                        'dataSourceId', integration.id::text,
                        'force', false
                    )::jsonb
                );
                
                -- Handle response
                IF response.status_code BETWEEN 200 AND 299 THEN
                    -- Success - update sync information
                    UPDATE data_sources 
                    SET 
                        last_sync_at = NOW(),
                        sync_status = 'success',
                        next_sync_at = NOW() + 
                            CASE 
                                WHEN (sync_config->>'intervalUnit') = 'seconds' THEN
                                    format('%s seconds', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'minutes' THEN
                                    format('%s minutes', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'hours' THEN
                                    format('%s hours', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'days' THEN
                                    format('%s days', sync_config->>'interval')::interval
                                ELSE INTERVAL '1 hour'
                            END,
                        last_sync_result = response.body::jsonb,
                        last_sync_count = COALESCE((response.body::jsonb->>'itemsProcessed')::integer, 0),
                        last_sync_error = NULL,  -- Clear any previous error
                        updated_at = NOW()
                    WHERE id = integration.id;
                    
                    RAISE NOTICE 'Successfully synced % - Status: %', 
                                integration.name, response.status_code;
                ELSE
                    -- Error - update with error information
                    UPDATE data_sources 
                    SET 
                        sync_status = 'error',
                        last_sync_error = format('HTTP %s: %s', 
                                               response.status_code, 
                                               LEFT(response.body::text, 500)),  -- Limit error message length
                        updated_at = NOW()
                    WHERE id = integration.id;
                    
                    RAISE WARNING 'Sync failed for % - HTTP %', 
                                integration.name, response.status_code;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- Handle any exceptions during sync
                RAISE WARNING 'Error syncing %: %', integration.name, SQLERRM;
                
                UPDATE data_sources 
                SET sync_status = 'error',
                    last_sync_error = LEFT(SQLERRM, 500),  -- Limit error message length
                    updated_at = NOW()
                WHERE id = integration.id;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- Schedule the checker to run every 10 seconds
-- This checks frequently but only triggers based on each integration's interval
SELECT cron.schedule(
    'check-integration-syncs',
    '10 seconds',
    'SELECT check_and_trigger_syncs()'
);

-- Create a view to easily monitor sync schedules
CREATE OR REPLACE VIEW sync_monitor AS
SELECT 
    name,
    type,
    sync_status,
    last_sync_at,
    next_sync_at,
    last_sync_count,
    last_sync_error,
    sync_config->>'enabled' as sync_enabled,
    sync_config->>'interval' as sync_interval,
    sync_config->>'intervalUnit' as sync_interval_unit,
    CASE 
        WHEN sync_status = 'running' THEN 'Currently syncing'
        WHEN sync_status = 'error' THEN 'Last sync failed'
        WHEN NOT (sync_config->>'enabled')::boolean THEN 'Sync disabled'
        WHEN next_sync_at IS NULL AND last_sync_at IS NULL THEN 'Never synced'
        WHEN next_sync_at < NOW() THEN 'Overdue for sync'
        WHEN next_sync_at >= NOW() THEN 'Scheduled'
        ELSE 'Unknown'
    END as status_description,
    CASE 
        WHEN next_sync_at < NOW() THEN 
            'Overdue by ' || age(NOW(), next_sync_at)
        WHEN next_sync_at >= NOW() THEN 
            'Due in ' || age(next_sync_at, NOW())
        ELSE NULL
    END as time_until_sync
FROM data_sources
WHERE active = true
ORDER BY 
    CASE sync_status
        WHEN 'error' THEN 0
        WHEN 'running' THEN 1
        ELSE 2
    END,
    next_sync_at ASC NULLS LAST;
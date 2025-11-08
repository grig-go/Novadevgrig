-- Needed to avoid select query timeout issue as county update takes 20s and could lock the table for 20s
SET statement_timeout = '60s';  -- 60 seconds

-- Enable extensions
create extension if not exists http;
create extension if not exists pg_cron;

-- Create a helper function that calls your edge function
create or replace function sync_ap_election_data(
  office_id text,
  results_type text,
  race_name text,
  race_type text,
  race_level text
) returns void as $$
declare
  service_key TEXT;
  project_ref TEXT;
  request_id BIGINT;
  request_body jsonb;
  request_url text;
begin
  -- Get credentials
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';


  request_body := jsonb_build_object(
    'officeID', office_id,
    'resultsType', results_type,
    'raceName', race_name,
    'raceType', race_type
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-' || race_level || '-results';

  request_id := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body
            );
end;
$$ language plpgsql;

create or replace function sync_ap_bop_data(
  results_type text
) returns void as $$
declare
  service_key TEXT;
  project_ref TEXT;
  request_url text;
  request_id_senate BIGINT;
  request_body_senate jsonb;
  request_id_house BIGINT;
  request_body_house jsonb;
begin
  -- Get credentials
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';

  request_body_senate := jsonb_build_object(
    'subType', 'S',
    'resultsType', results_type,
    'raceName', 'Senate Election',
    'raceType', 'senate'
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-bop';

  request_id_senate := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body_senate
            );

  request_body_house := jsonb_build_object(
    'subType', 'H',
    'resultsType', results_type,
    'raceName', 'House Election',
    'raceType', 'house'
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-bop';

  request_id_house := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body_house
            );
end;
$$ language plpgsql;

-- Schedule the job if it doesn’t exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-ap-presidential-state-election-data-job') THEN
    PERFORM cron.schedule(
      'sync-ap-presidential-state-election-data-job',
      '45 seconds',
      'SELECT sync_ap_election_data(''P'', ''l'', ''Presidential Election'', ''presidential'', ''state'');'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-ap-presidential-county-election-data-job') THEN
    PERFORM cron.schedule(
      'sync-ap-presidential-county-election-data-job',
      '45 seconds',
      'SELECT sync_ap_election_data(''P'', ''l'', ''Presidential Election'', ''presidential'', ''county'');'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-ap-senate-state-election-data-job') THEN
    PERFORM cron.schedule(
      'sync-ap-senate-state-election-data-job',
      '45 seconds',
      'SELECT sync_ap_election_data(''S'', ''l'', ''Senate Election'', ''senate'', ''state'');'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-ap-senate-county-election-data-job') THEN
    PERFORM cron.schedule(
      'sync-ap-senate-county-election-data-job',
      '45 seconds',
      'SELECT sync_ap_election_data(''S'', ''l'', ''Senate Election'', ''senate'', ''county'');'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-ap-house-election-data-job') THEN
    PERFORM cron.schedule(
      'sync-ap-house-election-data-job',
      '45 seconds',
      'SELECT sync_ap_election_data(''H'', ''l'', ''House Election'', ''house'', ''house'');'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-ap-bop-data-job') THEN
    PERFORM cron.schedule(
      'sync-ap-bop-data-job',
      '45 seconds',
      'SELECT sync_ap_bop_data(''l'');'
    );
  END IF;
END;
$$;
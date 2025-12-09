-- Grant permissions on the cron schema and job table
-- This fixes "permission denied for table job" errors during seeding

-- Grant usage on the cron schema
GRANT USAGE ON SCHEMA cron TO postgres;

-- Grant all privileges on the job table
GRANT ALL PRIVILEGES ON cron.job TO postgres;

-- Also grant to service_role for edge functions and other operations
GRANT USAGE ON SCHEMA cron TO service_role;
GRANT ALL PRIVILEGES ON cron.job TO service_role;

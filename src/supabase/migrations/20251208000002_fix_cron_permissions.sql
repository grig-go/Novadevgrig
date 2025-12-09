-- Schedule cron jobs
-- These are scheduled here (after functions are created) to ensure proper execution

-- Schedule the weather CSV sync to run every 15 minutes
SELECT cron.schedule(
  'weather-csv-sync',
  '*/15 * * * *',
  $$SELECT sync_weather_csv()$$
);

-- Schedule the school closings sync to run every 5 minutes
SELECT cron.schedule(
  'school-closings-sync',
  '*/5 * * * *',
  $$SELECT sync_school_closings()$$
);

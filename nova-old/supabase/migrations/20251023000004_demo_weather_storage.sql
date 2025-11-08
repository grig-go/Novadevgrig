-- ============================================================================
-- WEATHER DATA STORAGE MIGRATION
-- ============================================================================
-- This migration creates tables to store all weather data fetched from
-- WeatherAPI provider in Supabase for persistence and historical tracking.
-- ============================================================================

-- Drop existing tables if they exist (for development/reset)
DROP TABLE IF EXISTS weather_hourly_forecast CASCADE;
DROP TABLE IF EXISTS weather_daily_forecast CASCADE;
DROP TABLE IF EXISTS weather_alerts CASCADE;
DROP TABLE IF EXISTS weather_current CASCADE;
DROP TABLE IF EXISTS weather_air_quality CASCADE;
DROP TABLE IF EXISTS weather_locations CASCADE;

-- ============================================================================
-- WEATHER LOCATIONS TABLE
-- Stores all locations being monitored for weather data
-- ============================================================================
CREATE TABLE weather_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    admin1 TEXT, -- State/Province
    country TEXT NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lon DECIMAL(10, 7) NOT NULL,
    elevation_m DECIMAL(8, 2),
    station_id TEXT,
    timezone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lat, lon)
);

CREATE INDEX idx_weather_locations_country ON weather_locations(country);
CREATE INDEX idx_weather_locations_active ON weather_locations(is_active);

-- ============================================================================
-- WEATHER CURRENT CONDITIONS TABLE
-- Stores current weather conditions for each location
-- ============================================================================
CREATE TABLE weather_current (
    id SERIAL PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES weather_locations(id) ON DELETE CASCADE,
    as_of TIMESTAMP WITH TIME ZONE NOT NULL,
    summary TEXT NOT NULL,
    icon TEXT,
    
    -- Temperature data
    temperature_value DECIMAL(5, 2),
    temperature_unit TEXT DEFAULT '°C',
    feels_like_value DECIMAL(5, 2),
    feels_like_unit TEXT DEFAULT '°C',
    dew_point_value DECIMAL(5, 2),
    dew_point_unit TEXT DEFAULT '°C',
    
    -- Atmospheric conditions
    humidity INTEGER CHECK (humidity >= 0 AND humidity <= 100),
    pressure_value DECIMAL(7, 2),
    pressure_unit TEXT DEFAULT 'mb',
    pressure_tendency TEXT,
    cloud_cover INTEGER CHECK (cloud_cover >= 0 AND cloud_cover <= 100),
    uv_index INTEGER,
    visibility_value DECIMAL(7, 2),
    visibility_unit TEXT DEFAULT 'km',
    
    -- Wind data
    wind_speed_value DECIMAL(6, 2),
    wind_speed_unit TEXT DEFAULT 'km/h',
    wind_gust_value DECIMAL(6, 2),
    wind_gust_unit TEXT DEFAULT 'km/h',
    wind_direction_deg INTEGER CHECK (wind_direction_deg >= 0 AND wind_direction_deg < 360),
    wind_direction_cardinal TEXT,
    
    -- Precipitation
    precip_last_hr_value DECIMAL(6, 2),
    precip_last_hr_unit TEXT DEFAULT 'mm',
    precip_type TEXT,
    snow_depth_value DECIMAL(6, 2),
    snow_depth_unit TEXT DEFAULT 'cm',
    
    -- Sun/Moon data
    sunrise TIMESTAMP WITH TIME ZONE,
    sunset TIMESTAMP WITH TIME ZONE,
    moon_phase TEXT,
    moon_illumination INTEGER,
    
    -- Provider tracking
    provider_id TEXT,
    provider_type TEXT DEFAULT 'weatherapi',
    
    -- Timestamps
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(location_id, as_of)
);

CREATE INDEX idx_weather_current_location ON weather_current(location_id);
CREATE INDEX idx_weather_current_as_of ON weather_current(as_of DESC);
CREATE INDEX idx_weather_current_fetched_at ON weather_current(fetched_at DESC);

-- ============================================================================
-- WEATHER AIR QUALITY TABLE
-- Stores air quality data (AQI, pollutants, pollen)
-- ============================================================================
CREATE TABLE weather_air_quality (
    id SERIAL PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES weather_locations(id) ON DELETE CASCADE,
    as_of TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Air Quality Index
    aqi INTEGER,
    aqi_category TEXT,
    aqi_standard TEXT DEFAULT 'US EPA',
    
    -- Pollutants (μg/m³)
    pm25 DECIMAL(8, 2),
    pm10 DECIMAL(8, 2),
    o3 DECIMAL(8, 2),
    no2 DECIMAL(8, 2),
    so2 DECIMAL(8, 2),
    co DECIMAL(8, 2),
    
    -- Pollen counts
    pollen_tree INTEGER,
    pollen_grass INTEGER,
    pollen_weed INTEGER,
    pollen_risk TEXT,
    
    -- Timestamps
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(location_id, as_of)
);

CREATE INDEX idx_weather_air_quality_location ON weather_air_quality(location_id);
CREATE INDEX idx_weather_air_quality_as_of ON weather_air_quality(as_of DESC);

-- ============================================================================
-- WEATHER HOURLY FORECAST TABLE
-- Stores hourly forecast data (up to 10 days / 240 hours)
-- ============================================================================
CREATE TABLE weather_hourly_forecast (
    id SERIAL PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES weather_locations(id) ON DELETE CASCADE,
    forecast_time TIMESTAMP WITH TIME ZONE NOT NULL,
    summary TEXT,
    icon TEXT,
    
    -- Temperature
    temperature_value DECIMAL(5, 2),
    temperature_unit TEXT DEFAULT '°C',
    feels_like_value DECIMAL(5, 2),
    feels_like_unit TEXT DEFAULT '°C',
    dew_point_value DECIMAL(5, 2),
    dew_point_unit TEXT DEFAULT '°C',
    
    -- Conditions
    humidity INTEGER,
    cloud_cover INTEGER,
    uv_index INTEGER,
    visibility_value DECIMAL(7, 2),
    visibility_unit TEXT DEFAULT 'km',
    
    -- Wind
    wind_speed_value DECIMAL(6, 2),
    wind_speed_unit TEXT DEFAULT 'km/h',
    wind_gust_value DECIMAL(6, 2),
    wind_gust_unit TEXT DEFAULT 'km/h',
    wind_direction_deg INTEGER,
    
    -- Pressure
    pressure_value DECIMAL(7, 2),
    pressure_unit TEXT DEFAULT 'mb',
    
    -- Precipitation
    precip_probability INTEGER CHECK (precip_probability >= 0 AND precip_probability <= 100),
    precip_intensity_value DECIMAL(6, 2),
    precip_intensity_unit TEXT DEFAULT 'mm/h',
    
    -- Provider tracking
    provider_id TEXT,
    provider_type TEXT DEFAULT 'weatherapi',
    
    -- Timestamps
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(location_id, forecast_time, provider_id)
);

CREATE INDEX idx_weather_hourly_location ON weather_hourly_forecast(location_id);
CREATE INDEX idx_weather_hourly_time ON weather_hourly_forecast(forecast_time);
CREATE INDEX idx_weather_hourly_fetched ON weather_hourly_forecast(fetched_at DESC);

-- ============================================================================
-- WEATHER DAILY FORECAST TABLE
-- Stores daily forecast data (up to 14 days)
-- ============================================================================
CREATE TABLE weather_daily_forecast (
    id SERIAL PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES weather_locations(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    summary TEXT,
    icon TEXT,
    
    -- Temperature
    temp_max_value DECIMAL(5, 2),
    temp_max_unit TEXT DEFAULT '°C',
    temp_min_value DECIMAL(5, 2),
    temp_min_unit TEXT DEFAULT '°C',
    
    -- Sun/Moon
    sunrise TIMESTAMP WITH TIME ZONE,
    sunset TIMESTAMP WITH TIME ZONE,
    moon_phase TEXT,
    
    -- Conditions
    uv_index_max INTEGER,
    
    -- Precipitation
    precip_probability INTEGER CHECK (precip_probability >= 0 AND precip_probability <= 100),
    precip_type TEXT,
    precip_accumulation_value DECIMAL(6, 2),
    precip_accumulation_unit TEXT DEFAULT 'mm',
    snow_accumulation_value DECIMAL(6, 2),
    snow_accumulation_unit TEXT DEFAULT 'cm',
    
    -- Wind
    wind_speed_avg_value DECIMAL(6, 2),
    wind_speed_avg_unit TEXT DEFAULT 'km/h',
    wind_gust_max_value DECIMAL(6, 2),
    wind_gust_max_unit TEXT DEFAULT 'km/h',
    wind_direction_deg INTEGER,
    
    -- Provider tracking
    provider_id TEXT,
    provider_type TEXT DEFAULT 'weatherapi',
    
    -- Timestamps
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(location_id, forecast_date, provider_id)
);

CREATE INDEX idx_weather_daily_location ON weather_daily_forecast(location_id);
CREATE INDEX idx_weather_daily_date ON weather_daily_forecast(forecast_date);
CREATE INDEX idx_weather_daily_fetched ON weather_daily_forecast(fetched_at DESC);

-- ============================================================================
-- WEATHER ALERTS TABLE
-- Stores weather alerts and warnings
-- ============================================================================
CREATE TABLE weather_alerts (
    id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES weather_locations(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    event TEXT NOT NULL,
    severity TEXT, -- e.g., 'Extreme', 'Severe', 'Moderate', 'Minor'
    urgency TEXT, -- e.g., 'Immediate', 'Expected', 'Future'
    certainty TEXT, -- e.g., 'Observed', 'Likely', 'Possible'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    headline TEXT,
    description TEXT,
    areas TEXT[], -- Array of affected areas
    instruction TEXT,
    links TEXT[], -- Array of reference links
    
    -- Provider tracking
    provider_id TEXT,
    provider_type TEXT DEFAULT 'weatherapi',
    
    -- Timestamps
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(id, location_id)
);

CREATE INDEX idx_weather_alerts_location ON weather_alerts(location_id);
CREATE INDEX idx_weather_alerts_severity ON weather_alerts(severity);
CREATE INDEX idx_weather_alerts_active ON weather_alerts(start_time, end_time);
CREATE INDEX idx_weather_alerts_fetched ON weather_alerts(fetched_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for weather_locations
CREATE TRIGGER update_weather_locations_updated_at
    BEFORE UPDATE ON weather_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATA RETENTION POLICIES
-- ============================================================================

-- Function to clean up old weather data (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_weather_data()
RETURNS void AS $$
BEGIN
    -- Delete hourly forecasts older than 30 days
    DELETE FROM weather_hourly_forecast
    WHERE fetched_at < NOW() - INTERVAL '30 days';
    
    -- Delete daily forecasts older than 60 days
    DELETE FROM weather_daily_forecast
    WHERE fetched_at < NOW() - INTERVAL '60 days';
    
    -- Delete current conditions older than 7 days
    DELETE FROM weather_current
    WHERE fetched_at < NOW() - INTERVAL '7 days';
    
    -- Delete air quality data older than 30 days
    DELETE FROM weather_air_quality
    WHERE fetched_at < NOW() - INTERVAL '30 days';
    
    -- Delete expired alerts
    DELETE FROM weather_alerts
    WHERE end_time < NOW() - INTERVAL '7 days';
    
    RAISE NOTICE 'Old weather data cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR EASY DATA ACCESS
-- ============================================================================

-- View to get latest weather for all active locations
CREATE OR REPLACE VIEW weather_latest AS
SELECT DISTINCT ON (wl.id)
    wl.id AS location_id,
    wl.name AS location_name,
    wl.country,
    wl.lat,
    wl.lon,
    wc.as_of,
    wc.summary,
    wc.icon,
    wc.temperature_value,
    wc.temperature_unit,
    wc.feels_like_value,
    wc.humidity,
    wc.pressure_value,
    wc.wind_speed_value,
    wc.wind_direction_cardinal,
    wc.precip_type,
    wc.uv_index,
    wc.fetched_at
FROM weather_locations wl
LEFT JOIN weather_current wc ON wl.id = wc.location_id
WHERE wl.is_active = true
ORDER BY wl.id, wc.as_of DESC;

-- View to get current alerts for all locations
CREATE OR REPLACE VIEW weather_active_alerts AS
SELECT 
    wa.*,
    wl.name AS location_name,
    wl.country
FROM weather_alerts wa
JOIN weather_locations wl ON wa.location_id = wl.id
WHERE wa.start_time <= NOW()
  AND wa.end_time >= NOW()
  AND wl.is_active = true
ORDER BY wa.severity DESC, wa.start_time DESC;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all weather tables
ALTER TABLE weather_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_hourly_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_daily_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_air_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_locations ENABLE ROW LEVEL SECURITY;

-- Policies for weather_current
CREATE POLICY "Allow authenticated users to read weather_current"
ON weather_current FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert weather_current"
ON weather_current FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update weather_current"
ON weather_current FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Policies for weather_hourly_forecast
CREATE POLICY "Allow authenticated users to read weather_hourly_forecast"
ON weather_hourly_forecast FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert weather_hourly_forecast"
ON weather_hourly_forecast FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update weather_hourly_forecast"
ON weather_hourly_forecast FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Policies for weather_daily_forecast
CREATE POLICY "Allow authenticated users to read weather_daily_forecast"
ON weather_daily_forecast FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert weather_daily_forecast"
ON weather_daily_forecast FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update weather_daily_forecast"
ON weather_daily_forecast FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Policies for weather_air_quality
CREATE POLICY "Allow authenticated users to read weather_air_quality"
ON weather_air_quality FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert weather_air_quality"
ON weather_air_quality FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update weather_air_quality"
ON weather_air_quality FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Policies for weather_alerts
CREATE POLICY "Allow authenticated users to read weather_alerts"
ON weather_alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert weather_alerts"
ON weather_alerts FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update weather_alerts"
ON weather_alerts FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Policies for weather_locations
CREATE POLICY "Allow authenticated users to read weather_locations"
ON weather_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert weather_locations"
ON weather_locations FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update weather_locations"
ON weather_locations FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role to delete weather_locations"
ON weather_locations FOR DELETE TO service_role USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users (adjust as needed for your security model)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show created tables
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'weather_%'
ORDER BY table_name;

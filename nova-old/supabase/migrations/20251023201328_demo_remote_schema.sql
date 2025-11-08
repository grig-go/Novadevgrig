SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."ai_injector_feature" AS ENUM (
    'outliers',
    'summary',
    'correlation',
    'sentiment',
    'fullscreen'
);


ALTER TYPE "public"."ai_injector_feature" OWNER TO "postgres";


CREATE TYPE "public"."entity_kind" AS ENUM (
    'team',
    'player'
);


ALTER TYPE "public"."entity_kind" OWNER TO "postgres";


CREATE TYPE "public"."lineup_side" AS ENUM (
    'home',
    'away'
);


ALTER TYPE "public"."lineup_side" OWNER TO "postgres";


CREATE TYPE "public"."match_status" AS ENUM (
    'scheduled',
    'in_progress',
    'halftime',
    'finished',
    'postponed',
    'cancelled',
    'abandoned'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."sport_code" AS ENUM (
    'football',
    'basketball',
    'formula_e',
    'hockey',
    'tennis',
    'american_football',
    'motorsport',
    'other'
);


ALTER TYPE "public"."sport_code" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_normalize_custom_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    new.custom_name := nullif(btrim(new.custom_name), '');
    if new.custom_name is not null and length(new.custom_name) > 80 then
      new.custom_name := left(new.custom_name, 80);
    end if;
  end if;
  return new;
end$$;


ALTER FUNCTION "public"."_normalize_custom_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_normalize_weather_custom_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op in ('INSERT','UPDATE') then
    new.custom_name := nullif(btrim(new.custom_name), '');
    if new.custom_name is not null and length(new.custom_name) > 80 then
      new.custom_name := left(new.custom_name, 80);
    end if;
  end if;
  return new;
end$$;


ALTER FUNCTION "public"."_normalize_weather_custom_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_lineup_player"("p_lineup_id" "uuid", "p_player_id" "uuid", "p_name" "text", "p_position" "text", "p_jersey_number" integer, "p_is_starter" boolean, "p_minute_in" integer, "p_minute_out" integer, "p_notes" "text", "p_provider_raw" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.match_lineup_players(
    lineup_id, player_id, name, position, jersey_number,
    is_starter, minute_in, minute_out, notes, provider_raw
  )
  VALUES(
    p_lineup_id, p_player_id, p_name, p_position, p_jersey_number,
    COALESCE(p_is_starter, true), p_minute_in, p_minute_out, p_notes, p_provider_raw
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."add_lineup_player"("p_lineup_id" "uuid", "p_player_id" "uuid", "p_name" "text", "p_position" "text", "p_jersey_number" integer, "p_is_starter" boolean, "p_minute_in" integer, "p_minute_out" integer, "p_notes" "text", "p_provider_raw" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_match_probabilities"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_market" "text", "p_source" "text", "p_bookmaker" "text", "p_home_prob" numeric, "p_draw_prob" numeric, "p_away_prob" numeric, "p_outcome" "jsonb", "p_is_live" boolean, "p_provider_raw" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.match_probabilities(
    provider_id, profile_id, sport,
    match_id, run_time, source, bookmaker, market,
    home_prob, draw_prob, away_prob, outcome, is_live, provider_raw
  )
  VALUES(
    p_provider_id, p_profile_id, p_sport,
    p_match_id, now(), p_source, p_bookmaker, p_market,
    p_home_prob, p_draw_prob, p_away_prob, p_outcome, p_is_live, p_provider_raw
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."add_match_probabilities"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_market" "text", "p_source" "text", "p_bookmaker" "text", "p_home_prob" numeric, "p_draw_prob" numeric, "p_away_prob" numeric, "p_outcome" "jsonb", "p_is_live" boolean, "p_provider_raw" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_email"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  select email from auth.users where id = auth.uid();
$$;


ALTER FUNCTION "public"."current_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_weather_location_cascade"("p_location_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.weather_locations WHERE id = p_location_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Location not found', 'location_id', p_location_id);
  END IF;

  -- Delete parent (CASCADE removes children)
  DELETE FROM public.weather_locations WHERE id = p_location_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Location and all weather data deleted',
    'location_id', p_location_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'location_id', p_location_id);
END;
$$;


ALTER FUNCTION "public"."delete_weather_location_cascade"("p_location_id" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."data_providers" (
    "id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT false NOT NULL,
    "api_key" "text",
    "api_secret" "text",
    "base_url" "text",
    "api_version" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dashboard" "text",
    "legacy_id" "text" GENERATED ALWAYS AS ((("lower"("category") || '_provider:'::"text") || "lower"("type"))) STORED,
    "allow_api_key" boolean DEFAULT true NOT NULL,
    CONSTRAINT "data_providers_category_check" CHECK (("category" = ANY (ARRAY['weather'::"text", 'sports'::"text", 'news'::"text", 'finance'::"text"])))
);

ALTER TABLE public.data_providers
ADD COLUMN legacy_id text 
GENERATED ALWAYS AS (
    (lower(category) || '_provider::'::text) || lower(type)
) STORED;

ALTER TABLE public.data_providers
ADD COLUMN dashboard text;

ALTER TABLE "public"."data_providers" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_provider_by_type"("p_type" "text", "p_dashboard" "text" DEFAULT NULL::"text") RETURNS "public"."data_providers"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.data_providers
  where type = p_type
    and is_active = true
    and (p_dashboard is null or lower(dashboard) = lower(p_dashboard))
  limit 1
$$;


ALTER FUNCTION "public"."get_active_provider_by_type"("p_type" "text", "p_dashboard" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_provider_id_text"("p_type" "text" DEFAULT NULL::"text", "p_legacy_id" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(dp.legacy_id, dp.id::text)
  FROM public.data_providers dp
  WHERE dp.is_active = true
    AND (
      (p_type IS NOT NULL AND lower(dp.type) = lower(p_type)) OR
      (p_legacy_id IS NOT NULL AND dp.legacy_id = p_legacy_id)
    )
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_active_provider_id_text"("p_type" "text", "p_legacy_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_alpaca_credentials"() RETURNS TABLE("api_key" "text", "api_secret" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select api_key, api_secret
  from public.data_providers
  where id = 'finance_provider:alpaca'
  limit 1;
$$;


ALTER FUNCTION "public"."get_alpaca_credentials"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_provider_details"("p_id" "text") RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "is_active" boolean, "api_key" "text", "api_secret" "text", "base_url" "text", "config" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id::TEXT,
    dp.name::TEXT,
    dp.type::TEXT,
    dp.category::TEXT,
    dp.is_active,
    dp.api_key::TEXT,
    dp.api_secret::TEXT,
    dp.base_url::TEXT,
    dp.config,
    dp.created_at,
    dp.updated_at
  FROM public.data_providers dp
  WHERE dp.id = p_id;
END;
$$;


ALTER FUNCTION "public"."get_provider_details"("p_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_provider_details"("p_id" "text") IS 'Returns full details for one provider including unmasked API key/secret. SECURITY SENSITIVE: authenticated only. Used by Edit/Debug dialogs.';



CREATE OR REPLACE FUNCTION "public"."get_provider_key_len"("p_id" "text") RETURNS TABLE("id" "text", "api_key_configured" boolean, "api_key_len" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select
    id,
    (api_key is not null and length(api_key) > 0),
    coalesce(length(api_key), 0)
  from public.data_providers
  where id = p_id;
$$;


ALTER FUNCTION "public"."get_provider_key_len"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sportmonks_leagues_for_ui"("p_active" boolean DEFAULT true) RETURNS TABLE("id" bigint, "name" "text", "country_name" "text", "type" "text", "logo" "text", "selected" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with cfg as (
    select coalesce(
             (select array_agg((x::text)::bigint)
                from jsonb_array_elements(dp.config->'selectedLeagues') x),
             '{}'::bigint[]
           ) as selected_ids
    from public.data_providers dp
    where dp.id = 'sports_provider:sportmonks'
    limit 1
  )
  select
    sl.id, sl.name, sl.country_name, sl.type, sl.logo,
    sl.id = any(cfg.selected_ids) as selected
  from public.sports_leagues sl
  cross join cfg
  where (p_active is null or sl.active = p_active)
  order by sl.country_name, sl.name;
$$;


ALTER FUNCTION "public"."get_sportmonks_leagues_for_ui"("p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sportradar_leagues_for_ui"("p_active" boolean DEFAULT true) RETURNS TABLE("id" "text", "name" "text", "country_name" "text", "type" "text", "logo" "text", "selected" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with cfg as (
    select coalesce(
             (select array_agg(x::text)
                from jsonb_array_elements_text(dp.config->'selectedLeagues') x),
             '{}'::text[]
           ) as selected_ids
    from public.data_providers dp
    where dp.id = 'sports_provider:sportsradar'
    limit 1
  )
  select
    c.id, c.name, c.country_name, c.type, c.logo,
    c.id = any(cfg.selected_ids) as selected
  from public.sportradar_competitions c
  cross join cfg
  where (p_active is null or c.active = p_active)
  order by c.country_name, c.name;
$$;


ALTER FUNCTION "public"."get_sportradar_leagues_for_ui"("p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stock_custom_name"("p_id" "uuid") RETURNS TABLE("id" "uuid", "custom_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id, custom_name
  from public.alpaca_stocks
  where id = p_id
  limit 1;
$$;


ALTER FUNCTION "public"."get_stock_custom_name"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") RETURNS TABLE("id" "text", "provider_name" "text", "model" "text", "enabled" boolean, "api_key_configured" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select
    p.id,
    p.provider_name,
    p.model,
    p.enabled,
    (
      (p.api_key    is not null and length(trim(p.api_key))    > 0) or
      (p.api_secret is not null and length(trim(p.api_secret)) > 0)
    ) as api_key_configured
  from public.ai_providers p
  where coalesce(p.enabled, true) = true
    and exists (
      select 1
      from jsonb_array_elements(coalesce(p.dashboard_assignments, '[]'::jsonb)) e
      where lower(e->>'dashboard') = lower(dash)
        and coalesce((e->>'textProvider')::boolean, false)
    );
$$;


ALTER FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_text_providers_for_dashboard_v2"("dash" "text") RETURNS TABLE("id" "text", "provider_name" "text", "model" "text", "enabled" boolean, "api_key_configured" boolean, "api_key_len" integer, "key_source" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  with kv_all as (
    -- Search across both KV namespaces
    select key, value from public.kv_store_cbef71cf
    union all
    select key, value from public.kv_store_629fe562
  ),
  p as (
    select id, provider_name, model, enabled, api_key, api_secret, dashboard_assignments
    from public.ai_providers
    where coalesce(enabled, true)
      and exists (
        select 1
        from jsonb_array_elements(coalesce(dashboard_assignments, '[]'::jsonb)) e
        where lower(e->>'dashboard') = lower(dash)
          and coalesce((e->>'textProvider')::boolean, false)
      )
  ),
  kv_join as (
    select 
      p.id,
      p.provider_name,
      p.model,
      p.enabled,
      p.api_key     as tbl_api_key,
      p.api_secret  as tbl_api_secret,
      k.key         as kv_key,
      k.value       as kv_value
    from p
    left join kv_all k
      on k.key in ('ai_provider_key:' || p.id, 'ai_provider:' || p.id)
  ),
  kv_extract as (
    select
      id, provider_name, model, enabled, tbl_api_key, tbl_api_secret,
      kv_key,
      -- Extract text key from KV (raw text or json)
      case
        when kv_value is null then null
        when left(kv_value::text, 1) = '{'
          then coalesce(
                 (kv_value::jsonb->>'apiKey'),
                 (kv_value::jsonb->>'api_key'),
                 (kv_value::jsonb->>'key'),
                 (kv_value::jsonb->>'token'),
                 (kv_value::jsonb->>'apiSecret'),
                 (kv_value::jsonb->>'secret')
               )
        else nullif(trim(kv_value::text), '')
      end as kv_api_key_text,
      case
        when kv_value is null then null
        when left(kv_value::text, 1) = '{' then 'kv:json'
        when kv_key like 'ai_provider_key:%' then 'kv:value'
        else null
      end as kv_form
    from kv_join
  )
  select
    id,
    provider_name,
    model,
    enabled,
    (final_key is not null and length(final_key) > 0) as api_key_configured,
    coalesce(length(final_key), 0) as api_key_len,
    coalesce(kv_form,
             case when tbl_api_key is not null and length(trim(tbl_api_key)) > 0 then 'table:api_key'
                  when tbl_api_secret is not null and length(trim(tbl_api_secret)) > 0 then 'table:api_secret'
                  else 'none' end) as key_source
  from (
    select
      id, provider_name, model, enabled, kv_form,
      -- Precedence: 1) KV → 2) api_key column → 3) api_secret column
      coalesce(
        nullif(trim(kv_api_key_text), ''),
        nullif(trim(tbl_api_key), ''),
        nullif(trim(tbl_api_secret), '')
      ) as final_key,
      tbl_api_key,
      tbl_api_secret
    from kv_extract
  ) s;
$$;


ALTER FUNCTION "public"."get_text_providers_for_dashboard_v2"("dash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_providers_with_status"() RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "is_active" boolean, "api_key_configured" boolean, "api_key_len" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    id, name, type, category, is_active,
    (api_key is not null and length(api_key) > 0) as api_key_configured,
    coalesce(length(api_key), 0) as api_key_len
  from public.data_providers;
$$;


ALTER FUNCTION "public"."list_providers_with_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_providers_with_status_all"() RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "is_active" boolean, "api_key_configured" boolean, "api_key_len" integer, "api_secret_configured" boolean, "api_secret_len" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id::TEXT,
    dp.name::TEXT,
    dp.type::TEXT,
    dp.category::TEXT,
    dp.is_active,
    (dp.api_key IS NOT NULL AND dp.api_key != '') AS api_key_configured,
    CASE WHEN dp.api_key IS NOT NULL AND dp.api_key != '' THEN LENGTH(dp.api_key) ELSE 0 END AS api_key_len,
    (dp.api_secret IS NOT NULL AND dp.api_secret != '') AS api_secret_configured,
    CASE WHEN dp.api_secret IS NOT NULL AND dp.api_secret != '' THEN LENGTH(dp.api_secret) ELSE 0 END AS api_secret_len
  FROM public.data_providers dp
  ORDER BY dp.category, dp.name;
END;
$$;


ALTER FUNCTION "public"."list_providers_with_status_all"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_providers_with_status_all"() IS 'Returns all data providers with masked credential status. No secrets returned.';



CREATE OR REPLACE FUNCTION "public"."list_providers_with_status_category"("p_category" "text") RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "is_active" boolean, "api_key_configured" boolean, "api_key_len" integer, "api_secret_configured" boolean, "api_secret_len" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id::TEXT,
    dp.name::TEXT,
    dp.type::TEXT,
    dp.category::TEXT,
    dp.is_active,
    (dp.api_key IS NOT NULL AND dp.api_key != '') AS api_key_configured,
    CASE WHEN dp.api_key IS NOT NULL AND dp.api_key != '' THEN LENGTH(dp.api_key) ELSE 0 END AS api_key_len,
    (dp.api_secret IS NOT NULL AND dp.api_secret != '') AS api_secret_configured,
    CASE WHEN dp.api_secret IS NOT NULL AND dp.api_secret != '' THEN LENGTH(dp.api_secret) ELSE 0 END AS api_secret_len
  FROM public.data_providers dp
  WHERE dp.category = p_category
  ORDER BY dp.name;
END;
$$;


ALTER FUNCTION "public"."list_providers_with_status_category"("p_category" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_providers_with_status_category"("p_category" "text") IS 'Returns providers (by category) with masked credential status. No secrets returned.';



CREATE OR REPLACE FUNCTION "public"."list_providers_with_status_prefix"("p_prefix" "text") RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "is_active" boolean, "api_key_configured" boolean, "api_key_len" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    id, name, type, category, is_active,
    (api_key is not null and length(api_key) > 0) as api_key_configured,
    coalesce(length(api_key), 0) as api_key_len
  from public.data_providers
  where id like p_prefix || '%';
$$;


ALTER FUNCTION "public"."list_providers_with_status_prefix"("p_prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_ai_providers_from_kv"() RETURNS TABLE("migrated_count" integer, "skipped_count" integer, "errors" "text"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  kv_records RECORD;
  migrated INTEGER := 0;
  skipped INTEGER := 0;
  error_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Note: This is a placeholder function structure
  -- Actual KV → Table migration would need to be implemented based on KV store structure
  -- For now, this serves as documentation
  
  RAISE NOTICE 'KV → Table migration function is a placeholder';
  RAISE NOTICE 'Manual migration steps:';
  RAISE NOTICE '1. Export KV data with prefix "ai_provider:"';
  RAISE NOTICE '2. Transform to match ai_providers table schema';
  RAISE NOTICE '3. INSERT into ai_providers table';
  
  RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, ARRAY['Not implemented - see function comments']::TEXT[];
END;
$$;


ALTER FUNCTION "public"."migrate_ai_providers_from_kv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provider_update_legacy_id"("p" "jsonb") RETURNS TABLE("id_text" "text", "type" "text", "category" "text", "name" "text", "is_active" boolean, "api_key" "text", "api_secret" "text", "base_url" "text", "api_version" "text", "config" "jsonb", "dashboard" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_id_text       TEXT;     -- raw id from client (legacy id or uuid-as-text)
  v_uuid_text     TEXT;     -- resolved id from table, as TEXT
  v_allow_api_key BOOLEAN;
  v_api_key       TEXT;
  v_api_secret    TEXT;
  v_api_version   TEXT;
  v_base_url      TEXT;
  v_config_patch  JSONB;
  v_dashboard     TEXT;
  v_is_active     BOOLEAN;
BEGIN
  -- pull from JSON (no uuid casts)
  v_id_text        := p->>'p_id';
  v_allow_api_key  := NULLIF(p->>'p_allow_api_key','')::boolean;
  v_api_key        := p->>'p_api_key';
  v_api_secret     := p->>'p_api_secret';
  v_api_version    := p->>'p_api_version';
  v_base_url       := p->>'p_base_url';
  v_config_patch   := COALESCE(p->'p_config_patch','{}'::jsonb);
  v_dashboard      := p->>'p_dashboard';
  v_is_active      := NULLIF(p->>'p_is_active','')::boolean;

  -- resolve row by legacy_id OR id text
  SELECT dp.id::text
  INTO v_uuid_text
  FROM public.data_providers dp
  WHERE dp.legacy_id = v_id_text
     OR dp.id::text  = v_id_text
  LIMIT 1;

  IF v_uuid_text IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve provider id "%"', v_id_text USING ERRCODE = '22P02';
  END IF;

  -- update by id TEXT (no casts)
  UPDATE public.data_providers d
  SET
    is_active   = COALESCE(v_is_active, d.is_active),
    allow_api_key = COALESCE(v_allow_api_key, d.allow_api_key),
    api_key     = COALESCE(v_api_key, d.api_key),
    api_secret  = COALESCE(v_api_secret, d.api_secret),
    base_url    = COALESCE(v_base_url, d.base_url),
    api_version = COALESCE(v_api_version, d.api_version),
    config      = COALESCE(d.config, '{}'::jsonb) || COALESCE(v_config_patch, '{}'::jsonb),
    dashboard   = COALESCE(v_dashboard, d.dashboard),
    updated_at  = NOW()
  WHERE d.id::text = v_uuid_text;

  -- return the updated row; id as TEXT to match return type
  RETURN QUERY
  SELECT d.id::text, d.type, d.category, d.name, d.is_active,
         d.api_key, d.api_secret, d.base_url, d.api_version,
         d.config, d.dashboard, d.created_at, d.updated_at
  FROM public.data_providers d
  WHERE d.id::text = v_uuid_text;
END;
$$;


ALTER FUNCTION "public"."provider_update_legacy_id"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_sports_materialized_views"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Probabilities latest (concurrent if possible)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_match_probabilities_latest;
  EXCEPTION WHEN feature_not_supported OR invalid_parameter_value THEN
    -- e.g., concurrent refresh not allowed yet (unique index missing)
    REFRESH MATERIALIZED VIEW public.v_match_probabilities_latest;
  END;

  -- Injuries latest (if you created it in Step 9B)
  IF to_regclass('public.v_injuries_latest') IS NOT NULL THEN
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_injuries_latest;
    EXCEPTION WHEN feature_not_supported OR invalid_parameter_value THEN
      REFRESH MATERIALIZED VIEW public.v_injuries_latest;
    END;
  END IF;
END;
$$;


ALTER FUNCTION "public"."refresh_sports_materialized_views"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_provider_sports_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "sport" "text" NOT NULL,
    "api_family" "text" NOT NULL,
    "region" "text",
    "version" "text",
    "access_level" "text",
    "base_url" "text" DEFAULT 'https://api.sportradar.com'::"text",
    "dashboards" "text"[] DEFAULT '{}'::"text"[],
    "endpoints" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."data_provider_sports_profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_sports_profile"("p_provider_id" "text", "p_sport" "text", "p_api_family" "text", "p_region" "text" DEFAULT NULL::"text", "p_version" "text" DEFAULT NULL::"text") RETURNS "public"."data_provider_sports_profiles"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT *
  FROM public.data_provider_sports_profiles
  WHERE provider_id = p_provider_id
    AND sport = p_sport
    AND api_family = p_api_family
    AND (p_region  IS NULL OR region  = p_region)
    AND (p_version IS NULL OR version = p_version)
  ORDER BY
    COALESCE(version, 'zzz') DESC,
    COALESCE(region,  'zzz') DESC,
    updated_at DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."resolve_sports_profile"("p_provider_id" "text", "p_sport" "text", "p_api_family" "text", "p_region" "text", "p_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sportradar_selected_leagues"("p_league_ids" "text"[]) RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.data_providers dp
     set config = jsonb_set(
       coalesce(dp.config, '{}'::jsonb),
       '{selectedLeagues}',
       coalesce(
         (select jsonb_agg(to_jsonb(x)) from unnest(coalesce(p_league_ids,'{}'::text[])) as x),
         '[]'::jsonb
       ),
       true
     )
   where dp.id = 'sports_provider:sportsradar'
  returning config;
$$;


ALTER FUNCTION "public"."set_sportradar_selected_leagues"("p_league_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_stock_custom_name"("p_id" "uuid", "p_custom_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.alpaca_stocks
     set custom_name = p_custom_name
   where id = p_id;
end;
$$;


ALTER FUNCTION "public"."set_stock_custom_name"("p_id" "uuid", "p_custom_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_stock_custom_name"("p_id" "uuid" DEFAULT NULL::"uuid", "p_symbol" "text" DEFAULT NULL::"text", "p_custom_name" "text" DEFAULT NULL::"text") RETURNS TABLE("updated_id" "uuid", "updated_symbol" "text", "updated_custom_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id uuid;
begin
  if p_id is null and (p_symbol is null or btrim(p_symbol) = '') then
    raise exception 'Provide p_id (uuid) or p_symbol (text)';
  end if;

  -- resolve target id
  if p_id is not null then
    v_id := p_id;
  else
    select id into v_id
    from public.alpaca_stocks
    where symbol = upper(btrim(p_symbol))
    limit 1;

    if v_id is null then
      raise exception 'No row found for symbol %', p_symbol;
    end if;
  end if;

  update public.alpaca_stocks as s
     set custom_name = case
                         when p_custom_name is null then null
                         else left(btrim(p_custom_name), 80)
                       end
   where s.id = v_id
  returning s.id, s.symbol, s.custom_name
    into updated_id, updated_symbol, updated_custom_name;

  if updated_id is null then
    raise exception 'Update failed — id % not found', v_id;
  end if;

  return next;
end;
$$;


ALTER FUNCTION "public"."set_stock_custom_name"("p_id" "uuid", "p_symbol" "text", "p_custom_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_weather_location_custom_name"("p_id" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_admin1" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text", "p_custom_name" "text" DEFAULT NULL::"text") RETURNS TABLE("updated_id" "text", "updated_custom_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id text;
begin
  if p_id is null and (p_name is null or btrim(p_name) = '' or
                       p_country is null or btrim(p_country) = '') then
    raise exception 'Provide p_id OR (p_name and p_country; p_admin1 optional)';
  end if;

  -- Resolve id
  if p_id is not null then
    v_id := p_id;
  else
    select wl.id into v_id
    from public.weather_locations wl
    where wl.name = btrim(p_name)
      and (p_admin1 is null or wl.admin1 = btrim(p_admin1))
      and wl.country = btrim(p_country)
    limit 1;

    if v_id is null then
      raise exception 'No row found for (% %, %)', coalesce(p_name,'?'), coalesce(p_admin1,'*'), coalesce(p_country,'?');
    end if;
  end if;

  update public.weather_locations as wl
     set custom_name = case
                         when p_custom_name is null then null
                         else left(btrim(p_custom_name), 80)
                       end
   where wl.id = v_id
  returning wl.id, wl.custom_name
    into updated_id, updated_custom_name;

  if updated_id is null then
    raise exception 'Update failed — id % not found', v_id;
  end if;

  return next;
end;
$$;


ALTER FUNCTION "public"."set_weather_location_custom_name"("p_id" "text", "p_name" "text", "p_admin1" "text", "p_country" "text", "p_custom_name" "text") OWNER TO "postgres";

-- Drop the existing function
DROP FUNCTION IF EXISTS public.sportsmonks_leagues(text);

CREATE OR REPLACE FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "text", "name" "text", "active" boolean)
    LANGUAGE "sql" STABLE
    AS $$
  with p as (
    select config
    from public.data_providers
    where type = 'sportsmonks'
      and is_active = true
      and (p_dashboard is null or lower(dashboard) = lower(p_dashboard))
    limit 1
  )
  select
    coalesce(l->>'id', l->>'code') as id,
    l->>'name' as name,
    coalesce((l->>'active')::boolean, true) as active
  from p, jsonb_array_elements(coalesce(p.config->'leagues','[]'::jsonb)) as l
$$;


ALTER FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_name text; v_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.weather_locations WHERE id = p_location_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Location not found', 'location_id', p_location_id);
  END IF;

  SELECT name INTO v_name FROM public.weather_locations WHERE id = p_location_id;
  DELETE FROM public.weather_locations WHERE id = p_location_id;

  RETURN jsonb_build_object('ok', true, 'location_id', p_location_id, 'name', v_name,
                            'message', 'Location and all weather data deleted via CASCADE');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'location_id', p_location_id);
END;
$$;


ALTER FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") IS 'Delete weather location by id (TEXT). Uses CASCADE to remove all child data.';



CREATE OR REPLACE FUNCTION "public"."update_ai_providers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_providers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_news_articles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_news_articles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_provider_settings_by_id"("p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_id" "text", "p_is_active" boolean) RETURNS TABLE("id" "uuid", "type" "text", "category" "text", "name" "text", "is_active" boolean, "api_key" "text", "api_secret" "text", "base_url" "text", "api_version" "text", "config" "jsonb", "dashboard" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_uuid uuid;
BEGIN
  -- Resolve without any CAST that could throw:
  SELECT dp.id
  INTO v_uuid
  FROM public.data_providers dp
  WHERE dp.legacy_id = p_id
     OR dp.id::text = p_id
  LIMIT 1;

  IF v_uuid IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve provider id "%"', p_id USING ERRCODE = '22P02';
  END IF;

  -- Do the update directly (no call-through, no ambiguity)
  UPDATE public.data_providers d
  SET
    is_active     = COALESCE(p_is_active, d.is_active),
    allow_api_key = COALESCE(p_allow_api_key, d.allow_api_key),
    api_key       = COALESCE(p_api_key, d.api_key),
    api_secret    = COALESCE(p_api_secret, d.api_secret),
    base_url      = COALESCE(p_base_url, d.base_url),
    api_version   = COALESCE(p_api_version, d.api_version),
    config        = COALESCE(d.config, '{}'::jsonb) || COALESCE(p_config_patch, '{}'::jsonb),
    dashboard     = COALESCE(p_dashboard, d.dashboard),
    updated_at    = NOW()
  WHERE d.id = v_uuid;

  RETURN QUERY
  SELECT d.id, d.type, d.category, d.name, d.is_active,
         d.api_key, d.api_secret, d.base_url, d.api_version,
         d.config, d.dashboard, d.created_at, d.updated_at
  FROM public.data_providers d
  WHERE d.id = v_uuid;
END;
$$;


ALTER FUNCTION "public"."update_provider_settings_by_id"("p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_id" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_is_active" boolean, "p_allow_api_key" boolean DEFAULT true, "p_api_key" "text" DEFAULT NULL::"text", "p_api_secret" "text" DEFAULT NULL::"text", "p_base_url" "text" DEFAULT NULL::"text", "p_api_version" "text" DEFAULT NULL::"text", "p_config_patch" "jsonb" DEFAULT NULL::"jsonb", "p_dashboard" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update provider with COALESCE logic (NULL means keep current value)
  UPDATE data_providers
  SET
    is_active = p_is_active,
    api_key = CASE 
      WHEN p_allow_api_key AND p_api_key IS NOT NULL THEN p_api_key
      ELSE api_key
    END,
    api_secret = CASE 
      WHEN p_allow_api_key AND p_api_secret IS NOT NULL THEN p_api_secret
      ELSE api_secret
    END,
    base_url = COALESCE(p_base_url, base_url),
    api_version = COALESCE(p_api_version, api_version),
    config = CASE 
      WHEN p_config_patch IS NOT NULL THEN config || p_config_patch
      ELSE config
    END,
    updated_at = NOW()
  WHERE id = p_id;

  -- Return success with updated provider
  SELECT jsonb_build_object(
    'success', true,
    'id', id,
    'updated_at', updated_at
  ) INTO v_result
  FROM data_providers
  WHERE id = p_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Provider not found: %', p_id;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_api_version" "text", "p_config_patch" "jsonb", "p_dashboard" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_api_version" "text", "p_config_patch" "jsonb", "p_dashboard" "text") IS 'Updates provider settings. p_id is TEXT (legacy ID like "sports_provider:sportmonks").
NULL values keep current DB values (COALESCE).
p_config_patch is merged with existing config using || operator.
Used by Edit Provider dialog.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_crypto"("payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.cryptocurrencies (cg_id, symbol, name, image, current_price,
    price_change_24h, price_change_percentage_24h, price_change_percentage_7d,
    price_change_percentage_30d, market_cap, market_cap_rank, total_volume,
    high_24h, low_24h, ath, ath_date, atl, atl_date, custom_name, last_updated)
  select
    (payload->>'cg_id')::citext,
    (payload->>'symbol')::citext,
    payload->>'name',
    payload->>'image',
    (payload->>'current_price')::numeric,
    (payload->>'price_change_24h')::numeric,
    (payload->>'price_change_percentage_24h')::numeric,
    (payload->>'price_change_percentage_7d')::numeric,
    (payload->>'price_change_percentage_30d')::numeric,
    (payload->>'market_cap')::numeric,
    (payload->>'market_cap_rank')::int,
    (payload->>'total_volume')::numeric,
    (payload->>'high_24h')::numeric,
    (payload->>'low_24h')::numeric,
    (payload->>'ath')::numeric,
    (payload->>'ath_date')::timestamptz,
    (payload->>'atl')::numeric,
    (payload->>'atl_date')::timestamptz,
    payload->>'custom_name',
    (payload->>'last_updated')::timestamptz
  on conflict (cg_id) do update set
    symbol = excluded.symbol,
    name = excluded.name,
    image = excluded.image,
    current_price = excluded.current_price,
    price_change_24h = excluded.price_change_24h,
    price_change_percentage_24h = excluded.price_change_percentage_24h,
    price_change_percentage_7d = excluded.price_change_percentage_7d,
    price_change_percentage_30d = excluded.price_change_percentage_30d,
    market_cap = excluded.market_cap,
    market_cap_rank = excluded.market_cap_rank,
    total_volume = excluded.total_volume,
    high_24h = excluded.high_24h,
    low_24h = excluded.low_24h,
    ath = excluded.ath,
    ath_date = excluded.ath_date,
    atl = excluded.atl,
    atl_date = excluded.atl_date,
    custom_name = excluded.custom_name,
    last_updated = excluded.last_updated;
end$$;


ALTER FUNCTION "public"."upsert_crypto"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_match"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_match_id" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_home_team_id" "text", "p_away_team_id" "text", "p_status" "text", "p_start_time" timestamp with time zone, "p_venue_name" "text", "p_venue_city" "text", "p_match_day" integer, "p_home_score" integer, "p_away_score" integer, "p_winner" "text", "p_provider_raw" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.sports_matches(
    provider_id, profile_id, sport, provider_match_id, season_id, competition_provider_id,
    home_team_id, away_team_id, status, start_time, venue_name, venue_city, match_day,
    home_score, away_score, winner, provider_raw
  )
  VALUES(
    p_provider_id, p_profile_id, p_sport, p_provider_match_id, p_season_id, p_competition_provider_id,
    p_home_team_id, p_away_team_id, p_status, p_start_time, p_venue_name, p_venue_city, p_match_day,
    p_home_score, p_away_score, p_winner, p_provider_raw
  )
  ON CONFLICT (provider_id, provider_match_id) DO UPDATE
    SET profile_id             = EXCLUDED.profile_id,
        sport                  = EXCLUDED.sport,
        season_id              = COALESCE(EXCLUDED.season_id, public.sports_matches.season_id),
        competition_provider_id= EXCLUDED.competition_provider_id,
        home_team_id           = EXCLUDED.home_team_id,
        away_team_id           = EXCLUDED.away_team_id,
        status                 = EXCLUDED.status,
        start_time             = EXCLUDED.start_time,
        venue_name             = EXCLUDED.venue_name,
        venue_city             = EXCLUDED.venue_city,
        match_day              = EXCLUDED.match_day,
        home_score             = EXCLUDED.home_score,
        away_score             = EXCLUDED.away_score,
        winner                 = EXCLUDED.winner,
        provider_raw           = COALESCE(EXCLUDED.provider_raw, public.sports_matches.provider_raw),
        updated_at             = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."upsert_match"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_match_id" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_home_team_id" "text", "p_away_team_id" "text", "p_status" "text", "p_start_time" timestamp with time zone, "p_venue_name" "text", "p_venue_city" "text", "p_match_day" integer, "p_home_score" integer, "p_away_score" integer, "p_winner" "text", "p_provider_raw" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_match_lineup"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_team_id" "text", "p_side" "text", "p_formation" "text", "p_coach_name" "text", "p_announced_at" timestamp with time zone, "p_provider_raw" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.match_lineups(
    provider_id, profile_id, sport,
    match_id, team_id, side, formation, coach_name, announced_at, provider_raw
  )
  VALUES(
    p_provider_id, p_profile_id, p_sport,
    p_match_id, p_team_id, p_side, p_formation, p_coach_name, p_announced_at, p_provider_raw
  )
  ON CONFLICT (match_id, team_id) DO UPDATE
    SET profile_id   = EXCLUDED.profile_id,
        sport        = EXCLUDED.sport,
        side         = EXCLUDED.side,
        formation    = EXCLUDED.formation,
        coach_name   = EXCLUDED.coach_name,
        announced_at = EXCLUDED.announced_at,
        provider_raw = COALESCE(EXCLUDED.provider_raw, public.match_lineups.provider_raw),
        updated_at   = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."upsert_match_lineup"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_team_id" "text", "p_side" "text", "p_formation" "text", "p_coach_name" "text", "p_announced_at" timestamp with time zone, "p_provider_raw" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_player"("p_provider_id" "text", "p_sport" "text", "p_provider_player_id" "text", "p_name" "text", "p_country" "text", "p_position" "text", "p_date_of_birth" "date", "p_height_cm" integer, "p_weight_kg" integer, "p_provider_raw" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.sports_players(
    provider_id, sport, provider_player_id,
    name, country, position, date_of_birth, height_cm, weight_kg, provider_raw
  )
  VALUES(
    p_provider_id, p_sport, p_provider_player_id,
    p_name, p_country, p_position, p_date_of_birth, p_height_cm, p_weight_kg, p_provider_raw
  )
  ON CONFLICT (provider_id, provider_player_id) DO UPDATE
    SET sport         = EXCLUDED.sport,
        name          = EXCLUDED.name,
        country       = EXCLUDED.country,
        position      = EXCLUDED.position,
        date_of_birth = EXCLUDED.date_of_birth,
        height_cm     = EXCLUDED.height_cm,
        weight_kg     = EXCLUDED.weight_kg,
        provider_raw  = COALESCE(EXCLUDED.provider_raw, public.sports_players.provider_raw),
        updated_at    = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."upsert_player"("p_provider_id" "text", "p_sport" "text", "p_provider_player_id" "text", "p_name" "text", "p_country" "text", "p_position" "text", "p_date_of_birth" "date", "p_height_cm" integer, "p_weight_kg" integer, "p_provider_raw" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_season"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_season_id" "text", "p_competition_provider_id" "text", "p_name" "text", "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean, "p_provider_raw" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.sports_seasons(
    provider_id, profile_id, sport,
    provider_season_id, competition_provider_id,
    name, start_date, end_date, is_current, provider_raw
  )
  VALUES(
    p_provider_id, p_profile_id, p_sport,
    p_provider_season_id, p_competition_provider_id,
    p_name, p_start_date, p_end_date, p_is_current, p_provider_raw
  )
  ON CONFLICT (provider_id, provider_season_id) DO UPDATE
    SET profile_id              = EXCLUDED.profile_id,
        sport                   = EXCLUDED.sport,
        competition_provider_id = EXCLUDED.competition_provider_id,
        name                    = EXCLUDED.name,
        start_date              = EXCLUDED.start_date,
        end_date                = EXCLUDED.end_date,
        is_current              = EXCLUDED.is_current,
        provider_raw            = COALESCE(EXCLUDED.provider_raw, public.sports_seasons.provider_raw),
        updated_at              = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."upsert_season"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_season_id" "text", "p_competition_provider_id" "text", "p_name" "text", "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean, "p_provider_raw" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_standing"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_team_id" "text", "p_position" integer, "p_matches_played" integer, "p_wins" integer, "p_draws" integer, "p_losses" integer, "p_goals_for" integer, "p_goals_against" integer, "p_goal_diff" integer, "p_points" integer, "p_form" "text", "p_group_name" "text", "p_stage_name" "text", "p_provider_raw" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.sports_standings(
    provider_id, profile_id, sport, season_id, competition_provider_id, team_id,
    position, matches_played, wins, draws, losses, goals_for, goals_against,
    goal_diff, points, form, group_name, stage_name, provider_raw
  )
  VALUES(
    p_provider_id, p_profile_id, p_sport, p_season_id, p_competition_provider_id, p_team_id,
    p_position, p_matches_played, p_wins, p_draws, p_losses, p_goals_for, p_goals_against,
    p_goal_diff, p_points, p_form, p_group_name, p_stage_name, p_provider_raw
  )
  ON CONFLICT (provider_id, competition_provider_id, season_id, team_id) DO UPDATE
    SET profile_id      = EXCLUDED.profile_id,
        sport           = EXCLUDED.sport,
        position        = EXCLUDED.position,
        matches_played  = EXCLUDED.matches_played,
        wins            = EXCLUDED.wins,
        draws           = EXCLUDED.draws,
        losses          = EXCLUDED.losses,
        goals_for       = EXCLUDED.goals_for,
        goals_against   = EXCLUDED.goals_against,
        goal_diff       = EXCLUDED.goal_diff,
        points          = EXCLUDED.points,
        form            = EXCLUDED.form,
        group_name      = EXCLUDED.group_name,
        stage_name      = EXCLUDED.stage_name,
        provider_raw    = COALESCE(EXCLUDED.provider_raw, public.sports_standings.provider_raw),
        updated_at      = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."upsert_standing"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_team_id" "text", "p_position" integer, "p_matches_played" integer, "p_wins" integer, "p_draws" integer, "p_losses" integer, "p_goals_for" integer, "p_goals_against" integer, "p_goal_diff" integer, "p_points" integer, "p_form" "text", "p_group_name" "text", "p_stage_name" "text", "p_provider_raw" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_stocks"("payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.alpaca_stocks (symbol, name, type, exchange, price, change_1d, change_1d_pct,
                                    change_1w_pct, change_1y_pct, year_high, year_low,
                                    chart_1y, rating, custom_name, last_update)
  select
    (payload->>'symbol')::citext,
    payload->>'name',
    payload->>'type',
    payload->>'exchange',
    (payload->>'price')::numeric,
    (payload->>'change_1d')::numeric,
    (payload->>'change_1d_pct')::numeric,
    (payload->>'change_1w_pct')::numeric,
    (payload->>'change_1y_pct')::numeric,
    (payload->>'year_high')::numeric,
    (payload->>'year_low')::numeric,
    payload->'chart_1y',
    payload->'rating',
    payload->>'custom_name',
    (payload->>'last_update')::timestamptz
  on conflict (symbol) do update set
    name = excluded.name,
    type = excluded.type,
    exchange = excluded.exchange,
    price = excluded.price,
    change_1d = excluded.change_1d,
    change_1d_pct = excluded.change_1d_pct,
    change_1w_pct = excluded.change_1w_pct,
    change_1y_pct = excluded.change_1y_pct,
    year_high = excluded.year_high,
    year_low = excluded.year_low,
    chart_1y = excluded.chart_1y,
    rating = excluded.rating,
    custom_name = excluded.custom_name,
    last_update = excluded.last_update;
end$$;


ALTER FUNCTION "public"."upsert_stocks"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_sport" "text", "p_colors" "jsonb", "p_statistics" "jsonb", "p_provider_raw" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id text;
BEGIN
  INSERT INTO public.sports_teams
    (id, provider_type, name, abbreviation, logo_url, sport, colors, statistics, updated_at)
  VALUES
    (p_external_team_id, p_provider_type, p_name, p_abbreviation, p_logo_url, p_sport, p_colors, p_statistics, now())
  ON CONFLICT (id) DO UPDATE
    SET provider_type = EXCLUDED.provider_type,
        name          = EXCLUDED.name,
        abbreviation  = EXCLUDED.abbreviation,
        logo_url      = EXCLUDED.logo_url,
        sport         = EXCLUDED.sport,
        colors        = COALESCE(EXCLUDED.colors, public.sports_teams.colors),
        statistics    = COALESCE(EXCLUDED.statistics, public.sports_teams.statistics),
        updated_at    = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_sport" "text", "p_colors" "jsonb", "p_statistics" "jsonb", "p_provider_raw" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_league_id" integer, "p_name" "text", "p_sport" "text", "p_short_name" "text" DEFAULT NULL::"text", "p_abbreviation" "text" DEFAULT NULL::"text", "p_logo_url" "text" DEFAULT NULL::"text", "p_colors" "jsonb" DEFAULT NULL::"jsonb", "p_statistics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id text;
BEGIN
  INSERT INTO public.sports_teams
    (id, provider_type, league_id, name, short_name, abbreviation, logo_url, sport, colors, statistics, updated_at)
  VALUES
    (p_external_team_id, p_provider_type, p_league_id, p_name, p_short_name, p_abbreviation, p_logo_url, p_sport, p_colors, p_statistics, now())
  ON CONFLICT (id) DO UPDATE
    SET provider_type = EXCLUDED.provider_type,
        league_id     = EXCLUDED.league_id,
        name          = EXCLUDED.name,
        short_name    = EXCLUDED.short_name,
        abbreviation  = EXCLUDED.abbreviation,
        logo_url      = EXCLUDED.logo_url,
        sport         = EXCLUDED.sport,
        colors        = COALESCE(EXCLUDED.colors, public.sports_teams.colors),
        statistics    = COALESCE(EXCLUDED.statistics, public.sports_teams.statistics),
        updated_at    = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;


ALTER FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_league_id" integer, "p_name" "text", "p_sport" "text", "p_short_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_colors" "jsonb", "p_statistics" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_prompt_injectors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature" "public"."ai_injector_feature" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "model" "text",
    "provider_id" "uuid",
    "prompt_template" "text",
    "params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_prompt_injectors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_providers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "provider_name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "api_key" "text" NOT NULL,
    "api_secret" "text",
    "endpoint" "text",
    "model" "text",
    "available_models" "jsonb" DEFAULT '[]'::"jsonb",
    "enabled" boolean DEFAULT true,
    "rate_limit_per_minute" integer DEFAULT 60,
    "max_tokens" integer DEFAULT 4096,
    "temperature" numeric(3,2) DEFAULT 0.7,
    "top_p" numeric(3,2) DEFAULT 1.0,
    "dashboard_assignments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_providers" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_providers" IS 'AI API provider configurations for text, image, and video generation';



COMMENT ON COLUMN "public"."ai_providers"."id" IS 'Unique provider identifier (e.g., claude-default)';



COMMENT ON COLUMN "public"."ai_providers"."provider_name" IS 'Provider type: claude, openai, gemini, mistral, etc.';



COMMENT ON COLUMN "public"."ai_providers"."type" IS 'Capability type: text, image, video, multimodal';



COMMENT ON COLUMN "public"."ai_providers"."available_models" IS 'Array of models fetched from provider API';



COMMENT ON COLUMN "public"."ai_providers"."dashboard_assignments" IS 'Array of dashboard assignments with provider roles';

DROP VIEW IF EXISTS public.ai_providers_public;

CREATE OR REPLACE VIEW "public"."ai_providers_public" AS
 SELECT "id",
    "name",
    "provider_name",
    "type",
    "endpoint",
    "model",
    "available_models",
    "enabled",
    "created_at",
    "updated_at"
   FROM "public"."ai_providers";


ALTER VIEW "public"."ai_providers_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alpaca_stocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "symbol" "public"."citext" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "exchange" "text",
    "price" numeric(12,4),
    "change_1d" numeric(12,4),
    "change_1d_pct" numeric(8,4),
    "change_1w_pct" numeric(8,4),
    "change_1y_pct" numeric(8,4),
    "year_high" numeric(12,4),
    "year_low" numeric(12,4),
    "chart_1y" "jsonb",
    "rating" "jsonb",
    "custom_name" "text",
    "last_update" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "class" "text" DEFAULT 'stock'::"text",
    "source" "text",
    "source_id" "text",
    "volume" numeric(20,8),
    "logo_url" "text"
);

ALTER TABLE "public"."alpaca_stocks" OWNER TO "postgres";

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'alpaca_stocks' 
          AND column_name = 'id'
    ) THEN
        ALTER TABLE public.alpaca_stocks 
        ADD COLUMN "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'alpaca_stocks' 
          AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE public.alpaca_stocks 
        ADD COLUMN logo_url text;
    END IF;
END $$;

COMMENT ON COLUMN "public"."alpaca_stocks"."logo_url" IS 'Logo image URL (from CoinGecko for crypto, future support for stocks)';


DROP VIEW IF EXISTS public.data_providers_public;
CREATE OR REPLACE VIEW "public"."data_providers_public" AS
 SELECT "id",
    "legacy_id",
    "name",
    "type",
    "category",
    "is_active",
    "base_url",
    "api_version",
    "config",
    "dashboard",
    "created_at",
    "updated_at",
    (("api_key" IS NOT NULL) AND ("api_key" <> ''::"text")) AS "api_key_configured",
    (("api_secret" IS NOT NULL) AND ("api_secret" <> ''::"text")) AS "api_secret_configured"
   FROM "public"."data_providers" "dp";


ALTER VIEW "public"."data_providers_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."finance_providers_status" AS
 SELECT "id",
    "name",
    "type",
    "category",
    "is_active",
    "api_key_configured",
    "api_key_len"
   FROM "public"."list_providers_with_status_prefix"('finance_provider:'::"text") "list_providers_with_status_prefix"("id", "name", "type", "category", "is_active", "api_key_configured", "api_key_len");


ALTER VIEW "public"."finance_providers_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."h2h_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "sport" "text" NOT NULL,
    "team_a_id" "text" NOT NULL,
    "team_b_id" "text" NOT NULL,
    "competition_provider_id" "text",
    "sample_size" integer DEFAULT 0,
    "team_a_wins" integer DEFAULT 0,
    "team_b_wins" integer DEFAULT 0,
    "draws" integer DEFAULT 0,
    "goals_a" integer DEFAULT 0,
    "goals_b" integer DEFAULT 0,
    "last_meeting_match_id" "uuid",
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_raw" "jsonb"
);


ALTER TABLE "public"."h2h_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."http_test_logs" (
    "id" bigint NOT NULL,
    "test_name" "text" NOT NULL,
    "method" "text" NOT NULL,
    "url" "text" NOT NULL,
    "status" integer,
    "headers" "jsonb",
    "body" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."http_test_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."http_test_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."http_test_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."http_test_logs_id_seq" OWNED BY "public"."http_test_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."injuries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "sport" "text" NOT NULL,
    "player_id" "uuid",
    "team_id" "text",
    "season_id" "uuid",
    "status" "text",
    "description" "text",
    "expected_return" "date",
    "reported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_raw" "jsonb"
);


ALTER TABLE "public"."injuries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_629fe562" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_629fe562" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_cbef71cf" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_cbef71cf" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."map_wc26_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "fifa_name" "text",
    "city" "text",
    "address" "text",
    "country" "text",
    "lat" numeric(9,6) NOT NULL,
    "lng" numeric(9,6) NOT NULL,
    "coordinates" numeric[] GENERATED ALWAYS AS (ARRAY["lng", "lat"]) STORED,
    "capacity" integer,
    "timezone" "text",
    "image_url" "text",
    "images" "jsonb",
    "matches" "jsonb",
    "match_numbers" integer[],
    "stage_summary" "jsonb",
    "sources" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lat_range" CHECK ((("lat" >= ('-90'::integer)::numeric) AND ("lat" <= (90)::numeric))),
    CONSTRAINT "lng_range" CHECK ((("lng" >= ('-180'::integer)::numeric) AND ("lng" <= (180)::numeric)))
);


ALTER TABLE "public"."map_wc26_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_lineup_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lineup_id" "uuid" NOT NULL,
    "player_id" "uuid",
    "name" "text",
    "position" "text",
    "jersey_number" integer,
    "is_starter" boolean DEFAULT true,
    "minute_in" integer,
    "minute_out" integer,
    "notes" "text",
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_lineup_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_lineups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "sport" "text" NOT NULL,
    "match_id" "uuid" NOT NULL,
    "team_id" "text" NOT NULL,
    "side" "text",
    "formation" "text",
    "coach_name" "text",
    "announced_at" timestamp with time zone,
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_lineups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_probabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "sport" "text" NOT NULL,
    "match_id" "uuid" NOT NULL,
    "run_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" DEFAULT 'sportsradar'::"text" NOT NULL,
    "bookmaker" "text",
    "market" "text" NOT NULL,
    "home_prob" numeric,
    "draw_prob" numeric,
    "away_prob" numeric,
    "outcome" "jsonb",
    "is_live" boolean DEFAULT false,
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_probabilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "provider_article_id" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "content" "text",
    "url" "text" NOT NULL,
    "image_url" "text",
    "source_name" "text",
    "source_id" "text",
    "author" "text",
    "published_at" timestamp with time zone,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "language" "text",
    "country" "text",
    "category" "text",
    "keywords" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."news_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_provider_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "page_size" integer DEFAULT 20 NOT NULL,
    "default_query" "text",
    "country" "text",
    "language" "text",
    "category" "text" DEFAULT 'news'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "news_provider_configs_page_size_check" CHECK ((("page_size" >= 1) AND ("page_size" <= 100)))
);


ALTER TABLE "public"."news_provider_configs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."news_providers_status" AS
 SELECT "id",
    "name",
    "type",
    "category",
    "is_active",
    "api_key_configured",
    "api_key_len"
   FROM "public"."list_providers_with_status_prefix"('news_provider:'::"text") "list_providers_with_status_prefix"("id", "name", "type", "category", "is_active", "api_key_configured", "api_key_len");


ALTER VIEW "public"."news_providers_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_season_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "sport" "text" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "team_id" "text",
    "season_id" "uuid" NOT NULL,
    "matches" integer,
    "minutes" integer,
    "goals" integer,
    "assists" integer,
    "shots" integer,
    "shots_on_target" integer,
    "xg" numeric,
    "xa" numeric,
    "cards_yellow" integer,
    "cards_red" integer,
    "clean_sheets" integer,
    "conceded" integer,
    "stats" "jsonb",
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_season_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_leaders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "sport" "text" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "rank" integer NOT NULL,
    "value" numeric NOT NULL,
    "extra" "jsonb",
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."season_leaders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sportradar_competitions" (
    "id" "text" NOT NULL,
    "name" "text",
    "country_name" "text",
    "type" "text",
    "logo" "text",
    "active" boolean DEFAULT true,
    "season_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sportradar_competitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_leagues" (
    "id" bigint NOT NULL,
    "name" "text",
    "country_name" "text",
    "type" "text",
    "logo" "text",
    "active" boolean DEFAULT true,
    "season_id" bigint,
    "api_source" "text" DEFAULT 'sportmonks'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sport" "text" DEFAULT 'football'::"text",
    "active_season_id" bigint,
    "active_season_name" "text"
);


ALTER TABLE "public"."sports_leagues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "season_id" "uuid",
    "sport" "text" NOT NULL,
    "provider_match_id" "text" NOT NULL,
    "competition_provider_id" "text",
    "home_team_id" "text",
    "away_team_id" "text",
    "status" "text",
    "start_time" timestamp with time zone,
    "venue_name" "text",
    "venue_city" "text",
    "match_day" integer,
    "home_score" integer,
    "away_score" integer,
    "winner" "text",
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sports_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "sport" "text" NOT NULL,
    "provider_player_id" "text" NOT NULL,
    "name" "text",
    "country" "text",
    "position" "text",
    "date_of_birth" "date",
    "height_cm" integer,
    "weight_kg" integer,
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sports_players" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sports_providers_status" AS
 SELECT "id",
    "name",
    "type",
    "category",
    "is_active",
    "api_key_configured",
    "api_key_len"
   FROM "public"."list_providers_with_status_prefix"('sports_provider:'::"text") "list_providers_with_status_prefix"("id", "name", "type", "category", "is_active", "api_key_configured", "api_key_len");


ALTER VIEW "public"."sports_providers_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "sport" "text" NOT NULL,
    "provider_season_id" "text" NOT NULL,
    "competition_provider_id" "text" NOT NULL,
    "name" "text",
    "start_date" "date",
    "end_date" "date",
    "is_current" boolean,
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sports_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_standings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "season_id" "uuid",
    "sport" "text" NOT NULL,
    "competition_provider_id" "text" NOT NULL,
    "team_id" "text" NOT NULL,
    "position" integer,
    "matches_played" integer,
    "wins" integer,
    "draws" integer,
    "losses" integer,
    "goals_for" integer,
    "goals_against" integer,
    "goal_diff" integer,
    "points" integer,
    "form" "text",
    "group_name" "text",
    "stage_name" "text",
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sports_standings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports_teams" (
    "id" "text" NOT NULL,
    "league_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "short_name" "text",
    "abbreviation" "text",
    "logo_url" "text",
    "venue" "text",
    "city" "text",
    "country" "text",
    "founded" integer,
    "sport" "text" NOT NULL,
    "season_id" "text",
    "provider_type" "text" NOT NULL,
    "colors" "jsonb" DEFAULT '{}'::"jsonb",
    "statistics" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_season_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "profile_id" "uuid",
    "sport" "text" NOT NULL,
    "team_id" "text" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "matches" integer,
    "minutes" integer,
    "wins" integer,
    "draws" integer,
    "losses" integer,
    "goals" integer,
    "goals_against" integer,
    "goal_diff" integer,
    "shots" integer,
    "shots_on_target" integer,
    "xg" numeric,
    "xa" numeric,
    "clean_sheets" integer,
    "cards_yellow" integer,
    "cards_red" integer,
    "stats" "jsonb",
    "provider_raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_season_stats" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."v_injuries_latest" AS
 SELECT DISTINCT ON ("player_id", "team_id") "id",
    "provider_id",
    "profile_id",
    "sport",
    "player_id",
    "team_id",
    "season_id",
    "status",
    "description",
    "expected_return",
    "reported_at",
    "provider_raw"
   FROM "public"."injuries"
  ORDER BY "player_id", "team_id", "reported_at" DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."v_injuries_latest" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."v_match_probabilities_latest" AS
 SELECT DISTINCT ON ("match_id", "market") "id",
    "provider_id",
    "profile_id",
    "sport",
    "match_id",
    "run_time",
    "source",
    "bookmaker",
    "market",
    "home_prob",
    "draw_prob",
    "away_prob",
    "outcome",
    "is_live",
    "provider_raw",
    "created_at"
   FROM "public"."match_probabilities"
  ORDER BY "match_id", "market", "run_time" DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."v_match_probabilities_latest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weather_air_quality" (
    "id" integer NOT NULL,
    "location_id" "text" NOT NULL,
    "as_of" timestamp with time zone NOT NULL,
    "aqi" integer,
    "aqi_category" "text",
    "aqi_standard" "text" DEFAULT 'US EPA'::"text",
    "pm25" numeric(8,2),
    "pm10" numeric(8,2),
    "o3" numeric(8,2),
    "no2" numeric(8,2),
    "so2" numeric(8,2),
    "co" numeric(8,2),
    "pollen_tree" integer,
    "pollen_grass" integer,
    "pollen_weed" integer,
    "pollen_risk" "text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weather_air_quality" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_air_quality_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."weather_air_quality_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_air_quality_id_seq" OWNED BY "public"."weather_air_quality"."id";



CREATE TABLE IF NOT EXISTS "public"."weather_alerts" (
    "id" "text" NOT NULL,
    "location_id" "text" NOT NULL,
    "source" "text" NOT NULL,
    "event" "text" NOT NULL,
    "severity" "text",
    "urgency" "text",
    "certainty" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "headline" "text",
    "description" "text",
    "areas" "text"[],
    "instruction" "text",
    "links" "text"[],
    "provider_id" "text",
    "provider_type" "text" DEFAULT 'weatherapi'::"text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weather_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weather_current" (
    "id" integer NOT NULL,
    "location_id" "text" NOT NULL,
    "as_of" timestamp with time zone NOT NULL,
    "summary" "text" NOT NULL,
    "icon" "text",
    "temperature_value" numeric(5,2),
    "temperature_unit" "text" DEFAULT '°C'::"text",
    "feels_like_value" numeric(5,2),
    "feels_like_unit" "text" DEFAULT '°C'::"text",
    "dew_point_value" numeric(5,2),
    "dew_point_unit" "text" DEFAULT '°C'::"text",
    "humidity" integer,
    "pressure_value" numeric(7,2),
    "pressure_unit" "text" DEFAULT 'mb'::"text",
    "pressure_tendency" "text",
    "cloud_cover" integer,
    "uv_index" integer,
    "visibility_value" numeric(7,2),
    "visibility_unit" "text" DEFAULT 'km'::"text",
    "wind_speed_value" numeric(6,2),
    "wind_speed_unit" "text" DEFAULT 'km/h'::"text",
    "wind_gust_value" numeric(6,2),
    "wind_gust_unit" "text" DEFAULT 'km/h'::"text",
    "wind_direction_deg" integer,
    "wind_direction_cardinal" "text",
    "precip_last_hr_value" numeric(6,2),
    "precip_last_hr_unit" "text" DEFAULT 'mm'::"text",
    "precip_type" "text",
    "snow_depth_value" numeric(6,2),
    "snow_depth_unit" "text" DEFAULT 'cm'::"text",
    "sunrise" timestamp with time zone,
    "sunset" timestamp with time zone,
    "moon_phase" "text",
    "moon_illumination" integer,
    "provider_id" "text",
    "provider_type" "text" DEFAULT 'weatherapi'::"text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weather_current_cloud_cover_check" CHECK ((("cloud_cover" >= 0) AND ("cloud_cover" <= 100))),
    CONSTRAINT "weather_current_humidity_check" CHECK ((("humidity" >= 0) AND ("humidity" <= 100))),
    CONSTRAINT "weather_current_wind_direction_deg_check" CHECK ((("wind_direction_deg" >= 0) AND ("wind_direction_deg" < 360)))
);


ALTER TABLE "public"."weather_current" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_current_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."weather_current_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_current_id_seq" OWNED BY "public"."weather_current"."id";



CREATE TABLE IF NOT EXISTS "public"."weather_daily_forecast" (
    "id" integer NOT NULL,
    "location_id" "text" NOT NULL,
    "forecast_date" "date" NOT NULL,
    "summary" "text",
    "icon" "text",
    "temp_max_value" numeric(5,2),
    "temp_max_unit" "text" DEFAULT '°C'::"text",
    "temp_min_value" numeric(5,2),
    "temp_min_unit" "text" DEFAULT '°C'::"text",
    "sunrise" timestamp with time zone,
    "sunset" timestamp with time zone,
    "moon_phase" "text",
    "uv_index_max" integer,
    "precip_probability" integer,
    "precip_type" "text",
    "precip_accumulation_value" numeric(6,2),
    "precip_accumulation_unit" "text" DEFAULT 'mm'::"text",
    "snow_accumulation_value" numeric(6,2),
    "snow_accumulation_unit" "text" DEFAULT 'cm'::"text",
    "wind_speed_avg_value" numeric(6,2),
    "wind_speed_avg_unit" "text" DEFAULT 'km/h'::"text",
    "wind_gust_max_value" numeric(6,2),
    "wind_gust_max_unit" "text" DEFAULT 'km/h'::"text",
    "wind_direction_deg" integer,
    "provider_id" "text",
    "provider_type" "text" DEFAULT 'weatherapi'::"text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weather_daily_forecast_precip_probability_check" CHECK ((("precip_probability" >= 0) AND ("precip_probability" <= 100)))
);


ALTER TABLE "public"."weather_daily_forecast" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_daily_forecast_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."weather_daily_forecast_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_daily_forecast_id_seq" OWNED BY "public"."weather_daily_forecast"."id";



CREATE TABLE IF NOT EXISTS "public"."weather_hourly_forecast" (
    "id" integer NOT NULL,
    "location_id" "text" NOT NULL,
    "forecast_time" timestamp with time zone NOT NULL,
    "summary" "text",
    "icon" "text",
    "temperature_value" numeric(5,2),
    "temperature_unit" "text" DEFAULT '°C'::"text",
    "feels_like_value" numeric(5,2),
    "feels_like_unit" "text" DEFAULT '°C'::"text",
    "dew_point_value" numeric(5,2),
    "dew_point_unit" "text" DEFAULT '°C'::"text",
    "humidity" integer,
    "cloud_cover" integer,
    "uv_index" integer,
    "visibility_value" numeric(7,2),
    "visibility_unit" "text" DEFAULT 'km'::"text",
    "wind_speed_value" numeric(6,2),
    "wind_speed_unit" "text" DEFAULT 'km/h'::"text",
    "wind_gust_value" numeric(6,2),
    "wind_gust_unit" "text" DEFAULT 'km/h'::"text",
    "wind_direction_deg" integer,
    "pressure_value" numeric(7,2),
    "pressure_unit" "text" DEFAULT 'mb'::"text",
    "precip_probability" integer,
    "precip_intensity_value" numeric(6,2),
    "precip_intensity_unit" "text" DEFAULT 'mm/h'::"text",
    "provider_id" "text",
    "provider_type" "text" DEFAULT 'weatherapi'::"text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weather_hourly_forecast_precip_probability_check" CHECK ((("precip_probability" >= 0) AND ("precip_probability" <= 100)))
);


ALTER TABLE "public"."weather_hourly_forecast" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_hourly_forecast_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."weather_hourly_forecast_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_hourly_forecast_id_seq" OWNED BY "public"."weather_hourly_forecast"."id";



CREATE TABLE IF NOT EXISTS "public"."weather_locations" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "admin1" "text",
    "country" "text" NOT NULL,
    "lat" numeric(10,7) NOT NULL,
    "lon" numeric(10,7) NOT NULL,
    "elevation_m" numeric(8,2),
    "station_id" "text",
    "timezone" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_name" "text"
);


ALTER TABLE "public"."weather_locations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."weather_providers_status" AS
 SELECT "id",
    "name",
    "type",
    "category",
    "is_active",
    "api_key_configured",
    "api_key_len"
   FROM "public"."list_providers_with_status_prefix"('weather_provider:'::"text") "list_providers_with_status_prefix"("id", "name", "type", "category", "is_active", "api_key_configured", "api_key_len");


ALTER VIEW "public"."weather_providers_status" OWNER TO "postgres";


ALTER TABLE ONLY "public"."http_test_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."http_test_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_air_quality" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_air_quality_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_current" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_current_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_daily_forecast" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_daily_forecast_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_hourly_forecast" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_hourly_forecast_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_prompt_injectors"
    ADD CONSTRAINT "ai_prompt_injectors_feature_key" UNIQUE ("feature");



ALTER TABLE ONLY "public"."ai_prompt_injectors"
    ADD CONSTRAINT "ai_prompt_injectors_pkey" PRIMARY KEY ("id");


ALTER TABLE public.ai_providers 
DROP CONSTRAINT IF EXISTS ai_providers_pkey;

ALTER TABLE ONLY "public"."ai_providers"
    ADD CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id");

ALTER TABLE public.alpaca_stocks 
DROP CONSTRAINT IF EXISTS alpaca_stocks_pkey;

ALTER TABLE ONLY "public"."alpaca_stocks"
    ADD CONSTRAINT "alpaca_stocks_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."alpaca_stocks"
    ADD CONSTRAINT "alpaca_stocks_symbol_unique" UNIQUE ("symbol");



ALTER TABLE "public"."alpaca_stocks"
    ADD CONSTRAINT "alpaca_stocks_type_check" CHECK (("type" = ANY (ARRAY['EQUITY'::"text", 'ETF'::"text", 'INDEX'::"text", 'CRYPTO'::"text", 'us_equity'::"text", 'crypto'::"text"]))) NOT VALID;



ALTER TABLE ONLY "public"."data_provider_sports_profiles"
    ADD CONSTRAINT "data_provider_sports_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_provider_sports_profiles"
    ADD CONSTRAINT "data_provider_sports_profiles_provider_id_sport_api_family__key" UNIQUE ("provider_id", "sport", "api_family", "region", "version");



ALTER TABLE ONLY "public"."data_providers"
    ADD CONSTRAINT "data_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."h2h_stats"
    ADD CONSTRAINT "h2h_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."http_test_logs"
    ADD CONSTRAINT "http_test_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."injuries"
    ADD CONSTRAINT "injuries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_629fe562"
    ADD CONSTRAINT "kv_store_629fe562_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."kv_store_cbef71cf"
    ADD CONSTRAINT "kv_store_cbef71cf_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."map_wc26_locations"
    ADD CONSTRAINT "map_wc26_locations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."map_wc26_locations"
    ADD CONSTRAINT "map_wc26_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_lineup_players"
    ADD CONSTRAINT "match_lineup_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_match_id_team_id_key" UNIQUE ("match_id", "team_id");



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_probabilities"
    ADD CONSTRAINT "match_probabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_provider_configs"
    ADD CONSTRAINT "news_provider_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_provider_configs"
    ADD CONSTRAINT "news_provider_configs_provider_key" UNIQUE ("provider");



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_player_id_season_id_key" UNIQUE ("player_id", "season_id");



ALTER TABLE ONLY "public"."season_leaders"
    ADD CONSTRAINT "season_leaders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_leaders"
    ADD CONSTRAINT "season_leaders_season_id_category_entity_type_rank_key" UNIQUE ("season_id", "category", "entity_type", "rank");



ALTER TABLE ONLY "public"."sportradar_competitions"
    ADD CONSTRAINT "sportradar_competitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_leagues"
    ADD CONSTRAINT "sports_leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_provider_id_provider_match_id_key" UNIQUE ("provider_id", "provider_match_id");



ALTER TABLE ONLY "public"."sports_players"
    ADD CONSTRAINT "sports_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_players"
    ADD CONSTRAINT "sports_players_provider_id_provider_player_id_key" UNIQUE ("provider_id", "provider_player_id");



ALTER TABLE ONLY "public"."sports_seasons"
    ADD CONSTRAINT "sports_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_seasons"
    ADD CONSTRAINT "sports_seasons_provider_id_provider_season_id_key" UNIQUE ("provider_id", "provider_season_id");



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_provider_id_competition_provider_id_season_key" UNIQUE ("provider_id", "competition_provider_id", "season_id", "team_id");



ALTER TABLE ONLY "public"."sports_teams"
    ADD CONSTRAINT "sports_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_season_stats"
    ADD CONSTRAINT "team_season_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_season_stats"
    ADD CONSTRAINT "team_season_stats_team_id_season_id_key" UNIQUE ("team_id", "season_id");



ALTER TABLE ONLY "public"."weather_air_quality"
    ADD CONSTRAINT "weather_air_quality_location_id_key" UNIQUE ("location_id");



ALTER TABLE ONLY "public"."weather_air_quality"
    ADD CONSTRAINT "weather_air_quality_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_id_location_id_key" UNIQUE ("id", "location_id");



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_location_id_key" UNIQUE ("location_id");



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_daily_forecast"
    ADD CONSTRAINT "weather_daily_forecast_location_id_forecast_date_provider_i_key" UNIQUE ("location_id", "forecast_date", "provider_id");



ALTER TABLE ONLY "public"."weather_daily_forecast"
    ADD CONSTRAINT "weather_daily_forecast_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_hourly_forecast"
    ADD CONSTRAINT "weather_hourly_forecast_location_id_forecast_time_provider__key" UNIQUE ("location_id", "forecast_time", "provider_id");



ALTER TABLE ONLY "public"."weather_hourly_forecast"
    ADD CONSTRAINT "weather_hourly_forecast_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_locations"
    ADD CONSTRAINT "weather_locations_lat_lon_key" UNIQUE ("lat", "lon");



ALTER TABLE ONLY "public"."weather_locations"
    ADD CONSTRAINT "weather_locations_pkey" PRIMARY KEY ("id");



CREATE INDEX "ai_prompt_injectors_feature_idx" ON "public"."ai_prompt_injectors" USING "btree" ("feature");



CREATE UNIQUE INDEX "data_providers_legacy_id_uidx" ON "public"."data_providers" USING "btree" ("legacy_id");



CREATE INDEX "idx_ai_providers_dashboard_assignments" ON "public"."ai_providers" USING "gin" ("dashboard_assignments");



CREATE INDEX "idx_ai_providers_enabled" ON "public"."ai_providers" USING "btree" ("enabled");



CREATE INDEX "idx_ai_providers_provider_name" ON "public"."ai_providers" USING "btree" ("provider_name");



CREATE INDEX "idx_ai_providers_type" ON "public"."ai_providers" USING "btree" ("type");



CREATE INDEX "idx_alpaca_stocks_symbol" ON "public"."alpaca_stocks" USING "btree" ("lower"(("symbol")::"text"));



CREATE INDEX "idx_alpaca_stocks_type" ON "public"."alpaca_stocks" USING "btree" ("type");



CREATE INDEX "idx_alpaca_stocks_updated" ON "public"."alpaca_stocks" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_data_providers_active" ON "public"."data_providers" USING "btree" ("is_active");



CREATE INDEX "idx_data_providers_category" ON "public"."data_providers" USING "btree" ("category");



CREATE INDEX "idx_h2h_comp" ON "public"."h2h_stats" USING "btree" ("competition_provider_id");



CREATE INDEX "idx_h2h_teams" ON "public"."h2h_stats" USING "btree" ("team_a_id", "team_b_id");



CREATE INDEX "idx_injuries_player_time" ON "public"."injuries" USING "btree" ("player_id", "reported_at" DESC);



CREATE INDEX "idx_injuries_season" ON "public"."injuries" USING "btree" ("season_id");



CREATE INDEX "idx_injuries_team_time" ON "public"."injuries" USING "btree" ("team_id", "reported_at" DESC);



CREATE INDEX "idx_leaders_entity" ON "public"."season_leaders" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_leaders_season_category" ON "public"."season_leaders" USING "btree" ("season_id", "category");



CREATE INDEX "idx_lineup_players_lineup" ON "public"."match_lineup_players" USING "btree" ("lineup_id");



CREATE INDEX "idx_lineups_match" ON "public"."match_lineups" USING "btree" ("match_id");



CREATE INDEX "idx_lineups_team" ON "public"."match_lineups" USING "btree" ("team_id");



CREATE INDEX "idx_matches_season" ON "public"."sports_matches" USING "btree" ("season_id");



CREATE INDEX "idx_matches_sport" ON "public"."sports_matches" USING "btree" ("sport");



CREATE INDEX "idx_matches_teams" ON "public"."sports_matches" USING "btree" ("home_team_id", "away_team_id");



CREATE INDEX "idx_mv_inj_latest_player_team" ON "public"."v_injuries_latest" USING "btree" ("player_id", "team_id");



CREATE INDEX "idx_mv_probs_latest_match_market" ON "public"."v_match_probabilities_latest" USING "btree" ("match_id", "market");



CREATE INDEX "idx_news_articles_category" ON "public"."news_articles" USING "btree" ("category");



CREATE INDEX "idx_news_articles_country" ON "public"."news_articles" USING "btree" ("country");



CREATE INDEX "idx_news_articles_fetched_at" ON "public"."news_articles" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_news_articles_language" ON "public"."news_articles" USING "btree" ("language");



CREATE INDEX "idx_news_articles_provider" ON "public"."news_articles" USING "btree" ("provider");



CREATE UNIQUE INDEX "idx_news_articles_provider_url" ON "public"."news_articles" USING "btree" ("provider", "url");



CREATE INDEX "idx_news_articles_published_at" ON "public"."news_articles" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_news_provider_configs_enabled" ON "public"."news_provider_configs" USING "btree" ("enabled");



CREATE INDEX "idx_news_provider_configs_provider" ON "public"."news_provider_configs" USING "btree" ("provider");



CREATE INDEX "idx_player_stats_player" ON "public"."player_season_stats" USING "btree" ("player_id");



CREATE INDEX "idx_player_stats_season" ON "public"."player_season_stats" USING "btree" ("season_id");



CREATE INDEX "idx_player_stats_team" ON "public"."player_season_stats" USING "btree" ("team_id");



CREATE INDEX "idx_players_name" ON "public"."sports_players" USING "btree" ("name");



CREATE INDEX "idx_players_sport" ON "public"."sports_players" USING "btree" ("sport");



CREATE INDEX "idx_prob_market" ON "public"."match_probabilities" USING "btree" ("market");



CREATE INDEX "idx_prob_match_time" ON "public"."match_probabilities" USING "btree" ("match_id", "run_time" DESC);



CREATE INDEX "idx_sportradar_competitions_active" ON "public"."sportradar_competitions" USING "btree" ("active");



CREATE INDEX "idx_sports_leagues_active" ON "public"."sports_leagues" USING "btree" ("active");



CREATE INDEX "idx_sports_leagues_active_season" ON "public"."sports_leagues" USING "btree" ("active_season_id");



CREATE INDEX "idx_sports_seasons_comp" ON "public"."sports_seasons" USING "btree" ("competition_provider_id");



CREATE INDEX "idx_sports_seasons_sport" ON "public"."sports_seasons" USING "btree" ("sport");



CREATE INDEX "idx_sports_teams_league_id" ON "public"."sports_teams" USING "btree" ("league_id");



CREATE INDEX "idx_sports_teams_name" ON "public"."sports_teams" USING "btree" ("name");



CREATE INDEX "idx_sports_teams_provider" ON "public"."sports_teams" USING "btree" ("provider_type");



CREATE INDEX "idx_sports_teams_sport" ON "public"."sports_teams" USING "btree" ("sport");



CREATE INDEX "idx_standings_competition" ON "public"."sports_standings" USING "btree" ("competition_provider_id");



CREATE INDEX "idx_standings_season" ON "public"."sports_standings" USING "btree" ("season_id");



CREATE INDEX "idx_standings_sport" ON "public"."sports_standings" USING "btree" ("sport");



CREATE INDEX "idx_standings_team" ON "public"."sports_standings" USING "btree" ("team_id");



CREATE INDEX "idx_team_stats_season" ON "public"."team_season_stats" USING "btree" ("season_id");



CREATE INDEX "idx_team_stats_team" ON "public"."team_season_stats" USING "btree" ("team_id");



CREATE INDEX "idx_weather_air_quality_as_of" ON "public"."weather_air_quality" USING "btree" ("as_of" DESC);



CREATE INDEX "idx_weather_air_quality_location" ON "public"."weather_air_quality" USING "btree" ("location_id");



CREATE INDEX "idx_weather_alerts_active" ON "public"."weather_alerts" USING "btree" ("start_time", "end_time");



CREATE INDEX "idx_weather_alerts_fetched" ON "public"."weather_alerts" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_weather_alerts_location" ON "public"."weather_alerts" USING "btree" ("location_id");



CREATE INDEX "idx_weather_alerts_severity" ON "public"."weather_alerts" USING "btree" ("severity");



CREATE INDEX "idx_weather_current_as_of" ON "public"."weather_current" USING "btree" ("as_of" DESC);



CREATE INDEX "idx_weather_current_fetched_at" ON "public"."weather_current" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_weather_current_location" ON "public"."weather_current" USING "btree" ("location_id");



CREATE INDEX "idx_weather_daily_date" ON "public"."weather_daily_forecast" USING "btree" ("forecast_date");



CREATE INDEX "idx_weather_daily_fetched" ON "public"."weather_daily_forecast" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_weather_daily_location" ON "public"."weather_daily_forecast" USING "btree" ("location_id");



CREATE INDEX "idx_weather_hourly_fetched" ON "public"."weather_hourly_forecast" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_weather_hourly_location" ON "public"."weather_hourly_forecast" USING "btree" ("location_id");



CREATE INDEX "idx_weather_hourly_time" ON "public"."weather_hourly_forecast" USING "btree" ("forecast_time");



CREATE INDEX "idx_weather_locations_active" ON "public"."weather_locations" USING "btree" ("is_active");



CREATE INDEX "idx_weather_locations_country" ON "public"."weather_locations" USING "btree" ("country");



CREATE INDEX "kv_store_629fe562_key_idx" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx1" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx10" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx11" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx12" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx13" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx14" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx15" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx16" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx17" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx18" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx19" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx2" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx20" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx21" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx22" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx23" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx24" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx25" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx26" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx27" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx28" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx29" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx3" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx30" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx31" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx32" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx33" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx34" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx35" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx36" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx37" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx38" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx39" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx4" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx40" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx41" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx42" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx43" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx44" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx45" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx46" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx47" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx48" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx49" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx5" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx50" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx51" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx52" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx53" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx54" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx55" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx56" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx57" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx58" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx59" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx6" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx60" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx61" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx62" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx63" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx64" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx65" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx66" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx67" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx68" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx69" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx7" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx70" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx71" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx72" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx73" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx74" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx75" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx76" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx77" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx78" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx79" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx8" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx80" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx81" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx82" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx83" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx84" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx85" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx86" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx87" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx88" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx89" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx9" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx90" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx91" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx92" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_629fe562_key_idx93" ON "public"."kv_store_629fe562" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx1" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx10" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx100" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx101" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx102" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx103" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx104" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx105" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx106" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx107" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx108" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx109" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx11" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx110" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx111" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx112" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx113" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx114" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx115" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx116" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx117" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx118" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx119" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx12" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx120" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx121" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx122" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx123" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx124" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx125" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx126" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx127" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx128" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx129" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx13" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx130" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx131" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx132" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx133" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx134" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx135" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx136" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx137" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx138" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx139" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx14" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx140" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx141" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx142" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx143" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx144" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx145" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx146" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx147" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx148" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx149" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx15" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx150" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx151" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx152" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx153" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx154" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx155" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx156" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx157" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx158" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx159" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx16" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx160" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx161" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx162" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx163" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx164" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx165" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx166" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx167" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx168" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx169" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx17" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx170" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx171" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx172" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx173" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx174" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx175" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx176" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx177" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx178" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx179" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx18" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx180" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx181" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx182" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx183" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx184" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx185" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx186" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx187" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx188" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx189" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx19" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx190" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx191" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx192" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx193" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx194" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx195" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx196" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx197" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx198" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx199" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx2" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx20" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx200" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx201" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx202" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx203" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx204" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx205" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx206" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx207" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx208" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx209" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx21" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx210" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx211" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx212" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx213" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx214" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx215" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx216" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx217" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx218" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx219" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx22" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx220" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx221" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx222" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx223" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx224" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx225" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx226" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx227" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx228" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx229" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx23" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx230" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx231" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx232" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx233" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx234" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx235" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx236" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx237" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx238" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx239" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx24" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx240" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx241" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx242" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx243" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx244" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx245" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx246" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx247" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx248" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx249" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx25" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx250" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx251" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx252" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx253" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx254" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx255" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx256" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx257" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx258" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx259" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx26" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx260" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx261" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx262" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx263" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx264" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx265" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx266" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx267" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx268" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx269" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx27" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx270" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx271" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx272" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx273" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx274" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx275" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx276" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx277" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx278" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx279" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx28" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx280" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx281" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx282" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx283" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx284" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx285" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx286" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx287" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx288" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx289" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx29" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx290" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx291" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx292" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx293" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx294" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx295" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx296" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx297" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx298" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx299" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx3" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx30" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx300" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx301" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx302" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx303" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx304" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx305" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx306" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx307" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx308" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx309" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx31" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx310" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx311" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx312" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx313" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx314" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx315" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx316" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx317" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx318" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx319" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx32" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx320" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx321" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx322" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx323" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx324" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx325" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx326" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx327" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx328" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx329" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx33" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx330" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx331" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx332" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx333" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx334" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx335" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx336" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx337" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx338" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx339" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx34" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx340" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx341" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx342" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx343" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx344" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx35" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx36" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx37" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx38" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx39" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx4" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx40" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx41" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx42" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx43" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx44" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx45" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx46" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx47" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx48" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx49" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx5" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx50" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx51" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx52" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx53" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx54" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx55" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx56" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx57" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx58" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx59" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx6" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx60" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx61" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx62" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx63" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx64" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx65" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx66" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx67" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx68" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx69" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx7" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx70" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx71" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx72" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx73" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx74" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx75" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx76" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx77" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx78" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx79" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx8" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx80" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx81" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx82" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx83" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx84" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx85" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx86" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx87" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx88" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx89" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx9" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx90" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx91" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx92" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx93" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx94" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx95" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx96" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx97" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx98" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_cbef71cf_key_idx99" ON "public"."kv_store_cbef71cf" USING "btree" ("key" "text_pattern_ops");



CREATE UNIQUE INDEX "uq_data_providers_type_name" ON "public"."data_providers" USING "btree" ("type", "name");



CREATE UNIQUE INDEX "ux_h2h_pair_comp" ON "public"."h2h_stats" USING "btree" ("team_a_id", "team_b_id", COALESCE("competition_provider_id", 'ALL'::"text"));



CREATE UNIQUE INDEX "ux_v_match_probabilities_latest" ON "public"."v_match_probabilities_latest" USING "btree" ("match_id", "market");



CREATE OR REPLACE TRIGGER "ai_providers_updated_at_trigger" BEFORE UPDATE ON "public"."ai_providers" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_providers_updated_at"();



CREATE OR REPLACE TRIGGER "news_articles_updated_at" BEFORE UPDATE ON "public"."news_articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_news_articles_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ai_prompt_injectors_updated" BEFORE UPDATE ON "public"."ai_prompt_injectors" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_alpaca_stocks_updated_at" BEFORE UPDATE ON "public"."alpaca_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_map_wc26_locations_updated_at" BEFORE UPDATE ON "public"."map_wc26_locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_news_provider_configs_updated_at" BEFORE UPDATE ON "public"."news_provider_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_normalize_custom_name" BEFORE INSERT OR UPDATE OF "custom_name" ON "public"."alpaca_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."_normalize_custom_name"();



CREATE OR REPLACE TRIGGER "trg_normalize_weather_custom_name" BEFORE INSERT OR UPDATE OF "custom_name" ON "public"."weather_locations" FOR EACH ROW EXECUTE FUNCTION "public"."_normalize_weather_custom_name"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."data_providers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trig_set_updated_at_stocks" BEFORE UPDATE ON "public"."alpaca_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."data_provider_sports_profiles"
    ADD CONSTRAINT "data_provider_sports_profiles_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_teams"
    ADD CONSTRAINT "fk_league" FOREIGN KEY ("league_id") REFERENCES "public"."sports_leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."h2h_stats"
    ADD CONSTRAINT "h2h_stats_last_meeting_match_id_fkey" FOREIGN KEY ("last_meeting_match_id") REFERENCES "public"."sports_matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."h2h_stats"
    ADD CONSTRAINT "h2h_stats_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."h2h_stats"
    ADD CONSTRAINT "h2h_stats_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."h2h_stats"
    ADD CONSTRAINT "h2h_stats_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."h2h_stats"
    ADD CONSTRAINT "h2h_stats_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."injuries"
    ADD CONSTRAINT "injuries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."sports_players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."injuries"
    ADD CONSTRAINT "injuries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."injuries"
    ADD CONSTRAINT "injuries_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."injuries"
    ADD CONSTRAINT "injuries_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."injuries"
    ADD CONSTRAINT "injuries_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_lineup_players"
    ADD CONSTRAINT "match_lineup_players_lineup_id_fkey" FOREIGN KEY ("lineup_id") REFERENCES "public"."match_lineups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_lineup_players"
    ADD CONSTRAINT "match_lineup_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."sports_players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."sports_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."match_lineups"
    ADD CONSTRAINT "match_lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_probabilities"
    ADD CONSTRAINT "match_probabilities_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."sports_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_probabilities"
    ADD CONSTRAINT "match_probabilities_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_probabilities"
    ADD CONSTRAINT "match_probabilities_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."sports_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_season_stats"
    ADD CONSTRAINT "player_season_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_leaders"
    ADD CONSTRAINT "season_leaders_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_leaders"
    ADD CONSTRAINT "season_leaders_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."season_leaders"
    ADD CONSTRAINT "season_leaders_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sports_matches"
    ADD CONSTRAINT "sports_matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_seasons"
    ADD CONSTRAINT "sports_seasons_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sports_seasons"
    ADD CONSTRAINT "sports_seasons_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_season_stats"
    ADD CONSTRAINT "team_season_stats_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."data_provider_sports_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_season_stats"
    ADD CONSTRAINT "team_season_stats_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."team_season_stats"
    ADD CONSTRAINT "team_season_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_season_stats"
    ADD CONSTRAINT "team_season_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_air_quality"
    ADD CONSTRAINT "weather_air_quality_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_daily_forecast"
    ADD CONSTRAINT "weather_daily_forecast_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_hourly_forecast"
    ADD CONSTRAINT "weather_hourly_forecast_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all operations for authenticated users" ON "public"."ai_providers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read weather_air_quality" ON "public"."weather_air_quality" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read weather_alerts" ON "public"."weather_alerts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read weather_current" ON "public"."weather_current" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read weather_daily_forecast" ON "public"."weather_daily_forecast" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read weather_hourly_forecast" ON "public"."weather_hourly_forecast" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read weather_locations" ON "public"."weather_locations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow public delete access to sports_teams" ON "public"."sports_teams" FOR DELETE USING (true);



CREATE POLICY "Allow public insert access to sports_teams" ON "public"."sports_teams" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read access to sports_teams" ON "public"."sports_teams" FOR SELECT USING (true);



CREATE POLICY "Allow public update access to sports_teams" ON "public"."sports_teams" FOR UPDATE USING (true);



CREATE POLICY "Allow service role full access" ON "public"."ai_providers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role to delete weather_locations" ON "public"."weather_locations" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Allow service role to insert weather_air_quality" ON "public"."weather_air_quality" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to insert weather_alerts" ON "public"."weather_alerts" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to insert weather_current" ON "public"."weather_current" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to insert weather_daily_forecast" ON "public"."weather_daily_forecast" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to insert weather_hourly_forecast" ON "public"."weather_hourly_forecast" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to insert weather_locations" ON "public"."weather_locations" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to update weather_air_quality" ON "public"."weather_air_quality" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role to update weather_alerts" ON "public"."weather_alerts" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role to update weather_current" ON "public"."weather_current" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role to update weather_daily_forecast" ON "public"."weather_daily_forecast" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role to update weather_hourly_forecast" ON "public"."weather_hourly_forecast" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role to update weather_locations" ON "public"."weather_locations" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can read alpaca_stocks" ON "public"."alpaca_stocks" FOR SELECT USING (true);



CREATE POLICY "Authenticated can delete" ON "public"."alpaca_stocks" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated can insert" ON "public"."alpaca_stocks" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated can update" ON "public"."alpaca_stocks" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Public read access to news articles" ON "public"."news_articles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Service role full access to news articles" ON "public"."news_articles" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."ai_prompt_injectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_providers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow_delete_weather_locations" ON "public"."weather_locations" FOR DELETE TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."alpaca_stocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_providers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dp_all" ON "public"."data_providers" USING (true) WITH CHECK (true);



CREATE POLICY "dp_select_any" ON "public"."data_providers" FOR SELECT USING (true);



ALTER TABLE "public"."kv_store_629fe562" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_cbef71cf" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."map_wc26_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_provider_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "news_provider_configs_read" ON "public"."news_provider_configs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "news_provider_configs_update" ON "public"."news_provider_configs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "read_alpaca_stocks" ON "public"."alpaca_stocks" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "read_public_ai_prompts" ON "public"."ai_prompt_injectors" FOR SELECT USING (true);



ALTER TABLE "public"."sports_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "srv_update_custom_name" ON "public"."alpaca_stocks" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "srv_update_weather_custom_name" ON "public"."weather_locations" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "stocks_delete_server_only" ON "public"."alpaca_stocks" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "stocks_read_all" ON "public"."alpaca_stocks" FOR SELECT USING (true);



CREATE POLICY "stocks_update_server_only" ON "public"."alpaca_stocks" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "stocks_write_server_only" ON "public"."alpaca_stocks" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "wc26 public read" ON "public"."map_wc26_locations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "wc26 service all" ON "public"."map_wc26_locations" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."weather_air_quality" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_current" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_daily_forecast" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_hourly_forecast" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "write_ai_prompts_block" ON "public"."ai_prompt_injectors" USING (false) WITH CHECK (false);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";


















































































































































































































GRANT ALL ON FUNCTION "public"."_normalize_custom_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."_normalize_custom_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_normalize_custom_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_normalize_weather_custom_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."_normalize_weather_custom_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_normalize_weather_custom_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_lineup_player"("p_lineup_id" "uuid", "p_player_id" "uuid", "p_name" "text", "p_position" "text", "p_jersey_number" integer, "p_is_starter" boolean, "p_minute_in" integer, "p_minute_out" integer, "p_notes" "text", "p_provider_raw" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."add_lineup_player"("p_lineup_id" "uuid", "p_player_id" "uuid", "p_name" "text", "p_position" "text", "p_jersey_number" integer, "p_is_starter" boolean, "p_minute_in" integer, "p_minute_out" integer, "p_notes" "text", "p_provider_raw" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_lineup_player"("p_lineup_id" "uuid", "p_player_id" "uuid", "p_name" "text", "p_position" "text", "p_jersey_number" integer, "p_is_starter" boolean, "p_minute_in" integer, "p_minute_out" integer, "p_notes" "text", "p_provider_raw" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_match_probabilities"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_market" "text", "p_source" "text", "p_bookmaker" "text", "p_home_prob" numeric, "p_draw_prob" numeric, "p_away_prob" numeric, "p_outcome" "jsonb", "p_is_live" boolean, "p_provider_raw" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."add_match_probabilities"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_market" "text", "p_source" "text", "p_bookmaker" "text", "p_home_prob" numeric, "p_draw_prob" numeric, "p_away_prob" numeric, "p_outcome" "jsonb", "p_is_live" boolean, "p_provider_raw" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_match_probabilities"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_market" "text", "p_source" "text", "p_bookmaker" "text", "p_home_prob" numeric, "p_draw_prob" numeric, "p_away_prob" numeric, "p_outcome" "jsonb", "p_is_live" boolean, "p_provider_raw" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_weather_location_cascade"("p_location_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_weather_location_cascade"("p_location_id" "text") TO "service_role";



GRANT ALL ON TABLE "public"."data_providers" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_provider_by_type"("p_type" "text", "p_dashboard" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_provider_by_type"("p_type" "text", "p_dashboard" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_provider_by_type"("p_type" "text", "p_dashboard" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_provider_id_text"("p_type" "text", "p_legacy_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_provider_id_text"("p_type" "text", "p_legacy_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_provider_id_text"("p_type" "text", "p_legacy_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_alpaca_credentials"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provider_details"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_provider_details"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provider_details"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provider_key_len"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_provider_key_len"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provider_key_len"("p_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_sportmonks_leagues_for_ui"("p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_sportmonks_leagues_for_ui"("p_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sportmonks_leagues_for_ui"("p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sportmonks_leagues_for_ui"("p_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_sportradar_leagues_for_ui"("p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_sportradar_leagues_for_ui"("p_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sportradar_leagues_for_ui"("p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sportradar_leagues_for_ui"("p_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stock_custom_name"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard_v2"("dash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard_v2"("dash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard_v2"("dash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_providers_with_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_providers_with_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_providers_with_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_providers_with_status_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_providers_with_status_category"("p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_category"("p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_category"("p_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_providers_with_status_prefix"("p_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_prefix"("p_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_prefix"("p_prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_ai_providers_from_kv"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_ai_providers_from_kv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_ai_providers_from_kv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."provider_update_legacy_id"("p" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."provider_update_legacy_id"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."provider_update_legacy_id"("p" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_sports_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_sports_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_sports_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON TABLE "public"."data_provider_sports_profiles" TO "anon";
GRANT ALL ON TABLE "public"."data_provider_sports_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."data_provider_sports_profiles" TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_sports_profile"("p_provider_id" "text", "p_sport" "text", "p_api_family" "text", "p_region" "text", "p_version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_sports_profile"("p_provider_id" "text", "p_sport" "text", "p_api_family" "text", "p_region" "text", "p_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_sports_profile"("p_provider_id" "text", "p_sport" "text", "p_api_family" "text", "p_region" "text", "p_version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_sportradar_selected_leagues"("p_league_ids" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_stock_custom_name"("p_id" "uuid", "p_custom_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_stock_custom_name"("p_id" "uuid", "p_symbol" "text", "p_custom_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_weather_location_custom_name"("p_id" "text", "p_name" "text", "p_admin1" "text", "p_country" "text", "p_custom_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_providers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_providers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_providers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_news_articles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_news_articles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_news_articles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_id" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_id" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_id" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_api_version" "text", "p_config_patch" "jsonb", "p_dashboard" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_api_version" "text", "p_config_patch" "jsonb", "p_dashboard" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_api_version" "text", "p_config_patch" "jsonb", "p_dashboard" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_crypto"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_crypto"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_crypto"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_match"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_match_id" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_home_team_id" "text", "p_away_team_id" "text", "p_status" "text", "p_start_time" timestamp with time zone, "p_venue_name" "text", "p_venue_city" "text", "p_match_day" integer, "p_home_score" integer, "p_away_score" integer, "p_winner" "text", "p_provider_raw" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_match"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_match_id" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_home_team_id" "text", "p_away_team_id" "text", "p_status" "text", "p_start_time" timestamp with time zone, "p_venue_name" "text", "p_venue_city" "text", "p_match_day" integer, "p_home_score" integer, "p_away_score" integer, "p_winner" "text", "p_provider_raw" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_match"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_match_id" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_home_team_id" "text", "p_away_team_id" "text", "p_status" "text", "p_start_time" timestamp with time zone, "p_venue_name" "text", "p_venue_city" "text", "p_match_day" integer, "p_home_score" integer, "p_away_score" integer, "p_winner" "text", "p_provider_raw" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_match_lineup"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_team_id" "text", "p_side" "text", "p_formation" "text", "p_coach_name" "text", "p_announced_at" timestamp with time zone, "p_provider_raw" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_match_lineup"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_team_id" "text", "p_side" "text", "p_formation" "text", "p_coach_name" "text", "p_announced_at" timestamp with time zone, "p_provider_raw" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_match_lineup"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_match_id" "uuid", "p_team_id" "text", "p_side" "text", "p_formation" "text", "p_coach_name" "text", "p_announced_at" timestamp with time zone, "p_provider_raw" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_player"("p_provider_id" "text", "p_sport" "text", "p_provider_player_id" "text", "p_name" "text", "p_country" "text", "p_position" "text", "p_date_of_birth" "date", "p_height_cm" integer, "p_weight_kg" integer, "p_provider_raw" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_player"("p_provider_id" "text", "p_sport" "text", "p_provider_player_id" "text", "p_name" "text", "p_country" "text", "p_position" "text", "p_date_of_birth" "date", "p_height_cm" integer, "p_weight_kg" integer, "p_provider_raw" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_player"("p_provider_id" "text", "p_sport" "text", "p_provider_player_id" "text", "p_name" "text", "p_country" "text", "p_position" "text", "p_date_of_birth" "date", "p_height_cm" integer, "p_weight_kg" integer, "p_provider_raw" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_season"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_season_id" "text", "p_competition_provider_id" "text", "p_name" "text", "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean, "p_provider_raw" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_season"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_season_id" "text", "p_competition_provider_id" "text", "p_name" "text", "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean, "p_provider_raw" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_season"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_provider_season_id" "text", "p_competition_provider_id" "text", "p_name" "text", "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean, "p_provider_raw" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_standing"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_team_id" "text", "p_position" integer, "p_matches_played" integer, "p_wins" integer, "p_draws" integer, "p_losses" integer, "p_goals_for" integer, "p_goals_against" integer, "p_goal_diff" integer, "p_points" integer, "p_form" "text", "p_group_name" "text", "p_stage_name" "text", "p_provider_raw" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_standing"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_team_id" "text", "p_position" integer, "p_matches_played" integer, "p_wins" integer, "p_draws" integer, "p_losses" integer, "p_goals_for" integer, "p_goals_against" integer, "p_goal_diff" integer, "p_points" integer, "p_form" "text", "p_group_name" "text", "p_stage_name" "text", "p_provider_raw" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_standing"("p_provider_id" "text", "p_profile_id" "uuid", "p_sport" "text", "p_season_id" "uuid", "p_competition_provider_id" "text", "p_team_id" "text", "p_position" integer, "p_matches_played" integer, "p_wins" integer, "p_draws" integer, "p_losses" integer, "p_goals_for" integer, "p_goals_against" integer, "p_goal_diff" integer, "p_points" integer, "p_form" "text", "p_group_name" "text", "p_stage_name" "text", "p_provider_raw" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_stocks"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_stocks"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_stocks"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_sport" "text", "p_colors" "jsonb", "p_statistics" "jsonb", "p_provider_raw" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_sport" "text", "p_colors" "jsonb", "p_statistics" "jsonb", "p_provider_raw" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_sport" "text", "p_colors" "jsonb", "p_statistics" "jsonb", "p_provider_raw" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_league_id" integer, "p_name" "text", "p_sport" "text", "p_short_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_colors" "jsonb", "p_statistics" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_league_id" integer, "p_name" "text", "p_sport" "text", "p_short_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_colors" "jsonb", "p_statistics" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_team"("p_external_team_id" "text", "p_provider_type" "text", "p_league_id" integer, "p_name" "text", "p_sport" "text", "p_short_name" "text", "p_abbreviation" "text", "p_logo_url" "text", "p_colors" "jsonb", "p_statistics" "jsonb") TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";









GRANT ALL ON TABLE "public"."ai_prompt_injectors" TO "anon";
GRANT ALL ON TABLE "public"."ai_prompt_injectors" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_prompt_injectors" TO "service_role";



GRANT ALL ON TABLE "public"."ai_providers" TO "anon";
GRANT ALL ON TABLE "public"."ai_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_providers" TO "service_role";



GRANT ALL ON TABLE "public"."ai_providers_public" TO "anon";
GRANT ALL ON TABLE "public"."ai_providers_public" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_providers_public" TO "service_role";



GRANT ALL ON TABLE "public"."alpaca_stocks" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."alpaca_stocks" TO "authenticated";
GRANT SELECT ON TABLE "public"."alpaca_stocks" TO "anon";



GRANT ALL ON TABLE "public"."data_providers_public" TO "anon";
GRANT ALL ON TABLE "public"."data_providers_public" TO "authenticated";
GRANT ALL ON TABLE "public"."data_providers_public" TO "service_role";



GRANT ALL ON TABLE "public"."finance_providers_status" TO "anon";
GRANT ALL ON TABLE "public"."finance_providers_status" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_providers_status" TO "service_role";



GRANT ALL ON TABLE "public"."h2h_stats" TO "anon";
GRANT ALL ON TABLE "public"."h2h_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."h2h_stats" TO "service_role";



GRANT ALL ON TABLE "public"."http_test_logs" TO "anon";
GRANT ALL ON TABLE "public"."http_test_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."http_test_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."http_test_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."http_test_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."http_test_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."injuries" TO "anon";
GRANT ALL ON TABLE "public"."injuries" TO "authenticated";
GRANT ALL ON TABLE "public"."injuries" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_629fe562" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_629fe562" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_629fe562" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_cbef71cf" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_cbef71cf" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_cbef71cf" TO "service_role";



GRANT ALL ON TABLE "public"."map_wc26_locations" TO "anon";
GRANT ALL ON TABLE "public"."map_wc26_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."map_wc26_locations" TO "service_role";



GRANT ALL ON TABLE "public"."match_lineup_players" TO "anon";
GRANT ALL ON TABLE "public"."match_lineup_players" TO "authenticated";
GRANT ALL ON TABLE "public"."match_lineup_players" TO "service_role";



GRANT ALL ON TABLE "public"."match_lineups" TO "anon";
GRANT ALL ON TABLE "public"."match_lineups" TO "authenticated";
GRANT ALL ON TABLE "public"."match_lineups" TO "service_role";



GRANT ALL ON TABLE "public"."match_probabilities" TO "anon";
GRANT ALL ON TABLE "public"."match_probabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."match_probabilities" TO "service_role";



GRANT ALL ON TABLE "public"."news_articles" TO "anon";
GRANT ALL ON TABLE "public"."news_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."news_articles" TO "service_role";



GRANT ALL ON TABLE "public"."news_provider_configs" TO "anon";
GRANT ALL ON TABLE "public"."news_provider_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."news_provider_configs" TO "service_role";



GRANT ALL ON TABLE "public"."news_providers_status" TO "anon";
GRANT ALL ON TABLE "public"."news_providers_status" TO "authenticated";
GRANT ALL ON TABLE "public"."news_providers_status" TO "service_role";



GRANT ALL ON TABLE "public"."player_season_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_season_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_season_stats" TO "service_role";



GRANT ALL ON TABLE "public"."season_leaders" TO "anon";
GRANT ALL ON TABLE "public"."season_leaders" TO "authenticated";
GRANT ALL ON TABLE "public"."season_leaders" TO "service_role";



GRANT ALL ON TABLE "public"."sportradar_competitions" TO "anon";
GRANT ALL ON TABLE "public"."sportradar_competitions" TO "authenticated";
GRANT ALL ON TABLE "public"."sportradar_competitions" TO "service_role";



GRANT ALL ON TABLE "public"."sports_leagues" TO "anon";
GRANT ALL ON TABLE "public"."sports_leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_leagues" TO "service_role";



GRANT ALL ON TABLE "public"."sports_matches" TO "anon";
GRANT ALL ON TABLE "public"."sports_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_matches" TO "service_role";



GRANT ALL ON TABLE "public"."sports_players" TO "anon";
GRANT ALL ON TABLE "public"."sports_players" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_players" TO "service_role";



GRANT ALL ON TABLE "public"."sports_providers_status" TO "anon";
GRANT ALL ON TABLE "public"."sports_providers_status" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_providers_status" TO "service_role";



GRANT ALL ON TABLE "public"."sports_seasons" TO "anon";
GRANT ALL ON TABLE "public"."sports_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_seasons" TO "service_role";



GRANT ALL ON TABLE "public"."sports_standings" TO "anon";
GRANT ALL ON TABLE "public"."sports_standings" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_standings" TO "service_role";



GRANT ALL ON TABLE "public"."sports_teams" TO "anon";
GRANT ALL ON TABLE "public"."sports_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_teams" TO "service_role";



GRANT ALL ON TABLE "public"."team_season_stats" TO "anon";
GRANT ALL ON TABLE "public"."team_season_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."team_season_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_injuries_latest" TO "anon";
GRANT ALL ON TABLE "public"."v_injuries_latest" TO "authenticated";
GRANT ALL ON TABLE "public"."v_injuries_latest" TO "service_role";



GRANT ALL ON TABLE "public"."v_match_probabilities_latest" TO "anon";
GRANT ALL ON TABLE "public"."v_match_probabilities_latest" TO "authenticated";
GRANT ALL ON TABLE "public"."v_match_probabilities_latest" TO "service_role";



GRANT ALL ON TABLE "public"."weather_air_quality" TO "anon";
GRANT ALL ON TABLE "public"."weather_air_quality" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_air_quality" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_air_quality_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_air_quality_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_air_quality_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_alerts" TO "anon";
GRANT ALL ON TABLE "public"."weather_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."weather_current" TO "anon";
GRANT ALL ON TABLE "public"."weather_current" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_current" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_current_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_current_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_current_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_daily_forecast" TO "anon";
GRANT ALL ON TABLE "public"."weather_daily_forecast" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_daily_forecast" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_daily_forecast_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_daily_forecast_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_daily_forecast_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_hourly_forecast" TO "anon";
GRANT ALL ON TABLE "public"."weather_hourly_forecast" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_hourly_forecast" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_hourly_forecast_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_hourly_forecast_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_hourly_forecast_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_locations" TO "anon";
GRANT ALL ON TABLE "public"."weather_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_locations" TO "service_role";



GRANT ALL ON TABLE "public"."weather_providers_status" TO "anon";
GRANT ALL ON TABLE "public"."weather_providers_status" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_providers_status" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

RESET ALL;

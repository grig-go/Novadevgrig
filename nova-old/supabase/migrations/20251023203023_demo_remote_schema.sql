drop policy "read_alpaca_stocks" on "public"."alpaca_stocks";

drop policy "wc26 public read" on "public"."map_wc26_locations";

drop policy "Public read access to news articles" on "public"."news_articles";

drop policy "news_provider_configs_read" on "public"."news_provider_configs";

revoke delete on table "public"."alpaca_stocks" from "anon";

revoke insert on table "public"."alpaca_stocks" from "anon";

revoke references on table "public"."alpaca_stocks" from "anon";

revoke trigger on table "public"."alpaca_stocks" from "anon";

revoke truncate on table "public"."alpaca_stocks" from "anon";

revoke update on table "public"."alpaca_stocks" from "anon";

revoke references on table "public"."alpaca_stocks" from "authenticated";

revoke trigger on table "public"."alpaca_stocks" from "authenticated";

revoke truncate on table "public"."alpaca_stocks" from "authenticated";

revoke delete on table "public"."data_providers" from "anon";

revoke insert on table "public"."data_providers" from "anon";

revoke references on table "public"."data_providers" from "anon";

revoke select on table "public"."data_providers" from "anon";

revoke trigger on table "public"."data_providers" from "anon";

revoke truncate on table "public"."data_providers" from "anon";

revoke update on table "public"."data_providers" from "anon";

revoke delete on table "public"."data_providers" from "authenticated";

revoke insert on table "public"."data_providers" from "authenticated";

revoke references on table "public"."data_providers" from "authenticated";

revoke select on table "public"."data_providers" from "authenticated";

revoke trigger on table "public"."data_providers" from "authenticated";

revoke truncate on table "public"."data_providers" from "authenticated";

revoke update on table "public"."data_providers" from "authenticated";

CREATE INDEX kv_store_cbef71cf_key_idx345 ON public.kv_store_cbef71cf USING btree (key text_pattern_ops);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._normalize_custom_name()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    new.custom_name := nullif(btrim(new.custom_name), '');
    if new.custom_name is not null and length(new.custom_name) > 80 then
      new.custom_name := left(new.custom_name, 80);
    end if;
  end if;
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public._normalize_weather_custom_name()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op in ('INSERT','UPDATE') then
    new.custom_name := nullif(btrim(new.custom_name), '');
    if new.custom_name is not null and length(new.custom_name) > 80 then
      new.custom_name := left(new.custom_name, 80);
    end if;
  end if;
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.add_lineup_player(p_lineup_id uuid, p_player_id uuid, p_name text, p_position text, p_jersey_number integer, p_is_starter boolean, p_minute_in integer, p_minute_out integer, p_notes text, p_provider_raw jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.add_match_probabilities(p_provider_id text, p_profile_id uuid, p_sport text, p_match_id uuid, p_market text, p_source text, p_bookmaker text, p_home_prob numeric, p_draw_prob numeric, p_away_prob numeric, p_outcome jsonb, p_is_live boolean, p_provider_raw jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_email()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
  select email from auth.users where id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.delete_weather_location_cascade(p_location_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_provider_by_type(p_type text, p_dashboard text DEFAULT NULL::text)
 RETURNS data_providers
 LANGUAGE sql
 STABLE
AS $function$
  select *
  from public.data_providers
  where type = p_type
    and is_active = true
    and (p_dashboard is null or lower(dashboard) = lower(p_dashboard))
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_provider_id_text(p_type text DEFAULT NULL::text, p_legacy_id text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(dp.legacy_id, dp.id::text)
  FROM public.data_providers dp
  WHERE dp.is_active = true
    AND (
      (p_type IS NOT NULL AND lower(dp.type) = lower(p_type)) OR
      (p_legacy_id IS NOT NULL AND dp.legacy_id = p_legacy_id)
    )
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_alpaca_credentials()
 RETURNS TABLE(api_key text, api_secret text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select api_key, api_secret
  from public.data_providers
  where id = 'finance_provider:alpaca'
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_provider_details(p_id text)
 RETURNS TABLE(id text, name text, type text, category text, is_active boolean, api_key text, api_secret text, base_url text, config jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_provider_key_len(p_id text)
 RETURNS TABLE(id text, api_key_configured boolean, api_key_len integer)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select
    id,
    (api_key is not null and length(api_key) > 0),
    coalesce(length(api_key), 0)
  from public.data_providers
  where id = p_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_sportmonks_leagues_for_ui(p_active boolean DEFAULT true)
 RETURNS TABLE(id bigint, name text, country_name text, type text, logo text, selected boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_sportradar_leagues_for_ui(p_active boolean DEFAULT true)
 RETURNS TABLE(id text, name text, country_name text, type text, logo text, selected boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_stock_custom_name(p_id uuid)
 RETURNS TABLE(id uuid, custom_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id, custom_name
  from public.alpaca_stocks
  where id = p_id
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_text_providers_for_dashboard(dash text)
 RETURNS TABLE(id text, provider_name text, model text, enabled boolean, api_key_configured boolean)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_text_providers_for_dashboard_v2(dash text)
 RETURNS TABLE(id text, provider_name text, model text, enabled boolean, api_key_configured boolean, api_key_len integer, key_source text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.list_providers_with_status()
 RETURNS TABLE(id text, name text, type text, category text, is_active boolean, api_key_configured boolean, api_key_len integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    id, name, type, category, is_active,
    (api_key is not null and length(api_key) > 0) as api_key_configured,
    coalesce(length(api_key), 0) as api_key_len
  from public.data_providers;
$function$
;

CREATE OR REPLACE FUNCTION public.list_providers_with_status_all()
 RETURNS TABLE(id text, name text, type text, category text, is_active boolean, api_key_configured boolean, api_key_len integer, api_secret_configured boolean, api_secret_len integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.list_providers_with_status_category(p_category text)
 RETURNS TABLE(id text, name text, type text, category text, is_active boolean, api_key_configured boolean, api_key_len integer, api_secret_configured boolean, api_secret_len integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.list_providers_with_status_prefix(p_prefix text)
 RETURNS TABLE(id text, name text, type text, category text, is_active boolean, api_key_configured boolean, api_key_len integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    id, name, type, category, is_active,
    (api_key is not null and length(api_key) > 0) as api_key_configured,
    coalesce(length(api_key), 0) as api_key_len
  from public.data_providers
  where id like p_prefix || '%';
$function$
;

CREATE OR REPLACE FUNCTION public.migrate_ai_providers_from_kv()
 RETURNS TABLE(migrated_count integer, skipped_count integer, errors text[])
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.provider_update_legacy_id(p jsonb)
 RETURNS TABLE(id_text text, type text, category text, name text, is_active boolean, api_key text, api_secret text, base_url text, api_version text, config jsonb, dashboard text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_sports_materialized_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_sports_profile(p_provider_id text, p_sport text, p_api_family text, p_region text DEFAULT NULL::text, p_version text DEFAULT NULL::text)
 RETURNS data_provider_sports_profiles
 LANGUAGE sql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.set_sportradar_selected_leagues(p_league_ids text[])
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.set_stock_custom_name(p_id uuid, p_custom_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.alpaca_stocks
     set custom_name = p_custom_name
   where id = p_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_stock_custom_name(p_id uuid DEFAULT NULL::uuid, p_symbol text DEFAULT NULL::text, p_custom_name text DEFAULT NULL::text)
 RETURNS TABLE(updated_id uuid, updated_symbol text, updated_custom_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.set_weather_location_custom_name(p_id text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_admin1 text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_custom_name text DEFAULT NULL::text)
 RETURNS TABLE(updated_id text, updated_custom_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sportsmonks_leagues(p_dashboard text DEFAULT NULL::text)
 RETURNS TABLE(id text, name text, active boolean)
 LANGUAGE sql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.ui_delete_weather_location(p_location_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_ai_providers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_news_articles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_provider_settings_by_id(p_allow_api_key boolean, p_api_key text, p_api_secret text, p_api_version text, p_base_url text, p_config_patch jsonb, p_dashboard text, p_id text, p_is_active boolean)
 RETURNS TABLE(id uuid, type text, category text, name text, is_active boolean, api_key text, api_secret text, base_url text, api_version text, config jsonb, dashboard text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_provider_settings_by_id(p_id text, p_is_active boolean, p_allow_api_key boolean DEFAULT true, p_api_key text DEFAULT NULL::text, p_api_secret text DEFAULT NULL::text, p_base_url text DEFAULT NULL::text, p_api_version text DEFAULT NULL::text, p_config_patch jsonb DEFAULT NULL::jsonb, p_dashboard text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_crypto(payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
end$function$
;

CREATE OR REPLACE FUNCTION public.upsert_match(p_provider_id text, p_profile_id uuid, p_sport text, p_provider_match_id text, p_season_id uuid, p_competition_provider_id text, p_home_team_id text, p_away_team_id text, p_status text, p_start_time timestamp with time zone, p_venue_name text, p_venue_city text, p_match_day integer, p_home_score integer, p_away_score integer, p_winner text, p_provider_raw jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_match_lineup(p_provider_id text, p_profile_id uuid, p_sport text, p_match_id uuid, p_team_id text, p_side text, p_formation text, p_coach_name text, p_announced_at timestamp with time zone, p_provider_raw jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_player(p_provider_id text, p_sport text, p_provider_player_id text, p_name text, p_country text, p_position text, p_date_of_birth date, p_height_cm integer, p_weight_kg integer, p_provider_raw jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_season(p_provider_id text, p_profile_id uuid, p_sport text, p_provider_season_id text, p_competition_provider_id text, p_name text, p_start_date date, p_end_date date, p_is_current boolean, p_provider_raw jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_standing(p_provider_id text, p_profile_id uuid, p_sport text, p_season_id uuid, p_competition_provider_id text, p_team_id text, p_position integer, p_matches_played integer, p_wins integer, p_draws integer, p_losses integer, p_goals_for integer, p_goals_against integer, p_goal_diff integer, p_points integer, p_form text, p_group_name text, p_stage_name text, p_provider_raw jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_stocks(payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
end$function$
;

CREATE OR REPLACE FUNCTION public.upsert_team(p_external_team_id text, p_provider_type text, p_league_id integer, p_name text, p_sport text, p_short_name text DEFAULT NULL::text, p_abbreviation text DEFAULT NULL::text, p_logo_url text DEFAULT NULL::text, p_colors jsonb DEFAULT NULL::jsonb, p_statistics jsonb DEFAULT '{}'::jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_team(p_external_team_id text, p_provider_type text, p_name text, p_abbreviation text, p_logo_url text, p_sport text, p_colors jsonb, p_statistics jsonb, p_provider_raw jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
$function$
;

create policy "read_alpaca_stocks"
on "public"."alpaca_stocks"
as permissive
for select
to anon, authenticated
using (true);


create policy "wc26 public read"
on "public"."map_wc26_locations"
as permissive
for select
to anon, authenticated
using (true);


create policy "Public read access to news articles"
on "public"."news_articles"
as permissive
for select
to anon, authenticated
using (true);


create policy "news_provider_configs_read"
on "public"."news_provider_configs"
as permissive
for select
to anon, authenticated
using (true);




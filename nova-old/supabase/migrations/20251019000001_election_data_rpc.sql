-- =====================================================
-- UPDATE RPC FUNCTION TO INCLUDE OVERRIDE FIELDS
-- =====================================================

CREATE OR REPLACE FUNCTION public.fetch_election_data_for_ui(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
    -- Election source info
    last_fetch_at TIMESTAMPTZ,

    -- Election info
    election_id VARCHAR,
    election_name TEXT,
    year INTEGER,

    -- Race info
    race_id UUID,
    race_race_id VARCHAR,
    race_name VARCHAR,
    race_display_name VARCHAR,
    office VARCHAR,
    race_type VARCHAR,
    num_elect INTEGER,
    uncontested BOOLEAN,

    -- Geographic info
    division_type VARCHAR,
    state_code VARCHAR,
    fips_code VARCHAR,

    -- Race results info
    race_results_id UUID,
    called BOOLEAN,
    called_status VARCHAR,
    percent_reporting DECIMAL,
    last_updated TIMESTAMPTZ,
    precincts_reporting INTEGER,
    precincts_total INTEGER,
    called_timestamp TIMESTAMPTZ,
    total_votes INTEGER,

    -- Override fields for race results
    called_override BOOLEAN,
    called_status_override VARCHAR,
    percent_reporting_override DECIMAL,
    precincts_reporting_override INTEGER,
    precincts_total_override INTEGER,
    called_override_timestamp TIMESTAMPTZ,
    total_votes_override INTEGER,

    -- Candidate info
    candidate_id VARCHAR,
    full_name VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    candidate_display_name VARCHAR,
    party_code VARCHAR,
    party_name VARCHAR,
    party_color_primary VARCHAR,
    party_color_secondary VARCHAR,
    party_color_light VARCHAR,
    party_color_dark VARCHAR,

    -- Overrides
    party_color_primary_override VARCHAR,

    -- Additional party fields
    party_short_name VARCHAR,
    party_display_name VARCHAR,
    party_founded_year VARCHAR,
    party_description TEXT,
    party_ideology VARCHAR,
    party_headquarters TEXT,
    party_history TEXT,
    party_website VARCHAR,
    party_twitter VARCHAR,
    party_facebook VARCHAR,
    party_instagram VARCHAR,
    party_leadership JSONB,
    party_abbreviations TEXT[],
    party_aliases TEXT[],
    candidate_results_id UUID,
    votes INTEGER,
    vote_percentage DECIMAL,
    incumbent BOOLEAN,
    winner BOOLEAN,
    photo_url VARCHAR,
    race_candidates_id UUID,
    ballot_order INTEGER,
    withdrew BOOLEAN,
    electoral_votes INTEGER,
    state_electoral_votes INTEGER,

    -- Additional candidate profile fields
    bio TEXT,
    date_of_birth DATE,
    bio_short TEXT,
    education TEXT[],
    professional_background TEXT[],
    political_experience TEXT[],
    website VARCHAR,

    -- Override fields for candidate results
    votes_override INTEGER,
    vote_percentage_override DECIMAL,
    winner_override BOOLEAN,
    electoral_votes_override INTEGER,

    -- Override fields for candidate results
    incumbent_override BOOLEAN,

    -- Override fields for race candidates
    withdrew_override BOOLEAN,

    -- Override metadata
    race_override_at TIMESTAMPTZ,
    race_override_by UUID,
    race_override_reason TEXT,
    candidate_override_at TIMESTAMPTZ,
    candidate_override_by UUID,
    candidate_override_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.last_fetch_at,
        e.election_id,
        e.name::TEXT as election_name,
        e.year,
        r.id as race_id,
        r.race_id as race_race_id,
        r.name as race_name,
        r.display_name as race_display_name,
        r.office,
        r.type as race_type,
        r.num_elect,
        r.uncontested,
        d.type as division_type,
        d.code as state_code,
        d.fips_code,

        -- Original race result values
        rr.id as race_results_id,
        rr.called,
        rr.called_status,
        rr.percent_reporting,
        rr.last_updated,
        rr.precincts_reporting,
        rr.precincts_total,
        rr.called_timestamp,
        rr.total_votes,

        -- Override values for race results
        rr.called_override,
        rr.called_status_override,
        rr.percent_reporting_override,
        rr.precincts_reporting_override,
        rr.precincts_total_override,
        rr.called_override_timestamp,
        rr.total_votes_override,

        -- Candidate info
        c.candidate_id,
        c.full_name,
        c.first_name,
        c.last_name,
        c.display_name as candidate_display_name,
        p.abbreviation as party_code,
        p.name as party_name,
        p.color_hex as party_color_primary,
        p.color_secondary_hex as party_color_secondary,
        COALESCE((p.color_palette->>'light')::VARCHAR, NULL) as party_color_light,
        COALESCE((p.color_palette->>'dark')::VARCHAR, NULL) as party_color_dark,

        -- Overrides
        COALESCE((p.color_palette->>'primary')::VARCHAR, NULL) as party_color_primary_override,

        -- Additional party fields
        p.short_name as party_short_name,
        p.display_name as party_display_name,
        p.founded_year as party_founded_year,
        p.description as party_description,
        p.ideology as party_ideology,
        p.headquarters_address as party_headquarters,
        p.historical_overview as party_history,
        p.website as party_website,
        p.twitter_handle as party_twitter,
        p.facebook_page as party_facebook,
        p.instagram_handle as party_instagram,
        p.leadership_structure as party_leadership,
        p.policy_priorities as party_abbreviations,
        p.coalition_partners as party_aliases,

        -- Original candidate result values
        cr.id as candidate_results_id,
        cr.votes,
        cr.vote_percentage,
        c.incumbent,
        cr.winner,
        c.photo_url,
        rc.id as race_candidates_id,
        rc.ballot_order,
        rc.withdrew,
        cr.electoral_votes::INTEGER,
        (r.metadata->>'electoral_votes')::INTEGER AS state_electoral_votes,

        -- Additional candidate profile fields
        c.bio,
        c.date_of_birth,
        c.bio_short,
        c.education,
        c.professional_background,
        c.political_experience,
        c.website,

        -- Override values for candidate results
        cr.votes_override,
        cr.vote_percentage_override,
        cr.winner_override,
        cr.electoral_votes_override::INTEGER,

        -- Override values for candidate results
        c.incumbent_override,

        -- Override values for race candidates
        rc.withdrew_override,

        -- Override metadata
        rr.override_at as race_override_at,
        rr.override_by as race_override_by,
        rr.override_reason as race_override_reason,
        cr.override_at as candidate_override_at,
        cr.override_by as candidate_override_by,
        cr.override_reason as candidate_override_reason

    FROM public.e_race_results rr
    INNER JOIN public.e_candidate_results cr ON cr.race_result_id = rr.id
    INNER JOIN public.e_candidates c ON c.id = cr.candidate_id
    INNER JOIN public.e_parties p ON p.id = c.party_id
    INNER JOIN public.e_races r ON r.id = rr.race_id
    INNER JOIN public.e_elections e ON r.election_id = e.id
    INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
    INNER JOIN public.e_election_data_sources s ON s.election_id = e.id
    INNER JOIN public.e_race_candidates rc ON rc.race_id = r.id AND rc.candidate_id = c.id
    WHERE r.type IN ('presidential', 'senate', 'house')
      AND (p_year IS NULL AND e.year >= 2012 OR p_year IS NOT NULL AND e.year = p_year)
      AND d.type IN ('national', 'state', 'district')
      AND s.provider = 'ap'
    ORDER BY
      e.year DESC,
      r.type,
      CASE
        WHEN d.type = 'national' THEN '00' -- National always first
        ELSE d.code
      END,
      CASE
        WHEN d.type = 'district' THEN RIGHT(d.fips_code, 2)::INTEGER -- Order districts by number
        ELSE 0
      END,
      cr.votes DESC;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.fetch_election_data_for_ui(INTEGER) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.fetch_election_data_for_ui(INTEGER) IS
'Fetches election data including override fields for UI display. Returns both original and override values for supported fields.';
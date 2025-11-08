-- =====================================================
-- RPC FUNCTION FOR BALANCE OF POWER DATA
-- =====================================================

CREATE OR REPLACE FUNCTION public.fetch_bop_data(
    p_election_year INTEGER DEFAULT NULL,
    p_race_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    election_year INTEGER,
    race_type VARCHAR,
    party_name VARCHAR,
    won INTEGER,
    "leading" INTEGER,
    holdovers INTEGER,
    winning_trend INTEGER,
    current_seats INTEGER,
    insufficient_vote INTEGER,
    total_seats INTEGER -- calculated field
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.election_year,
        r.race_type,
        p.party_name,
        p.won,
        p.leading,
        p.holdovers,
        p.winning_trend,
        p.current_seats,
        p.insufficient_vote,
        -- Calculate total seats (for majority calculation)
        CASE
            WHEN r.race_type = 'senate' THEN 100
            WHEN r.race_type = 'house' THEN 435
            ELSE 0
        END as total_seats
    FROM public.bop_party_results p
    INNER JOIN public.bop_election_results r ON r.id = p.election_result_id
    WHERE
        (p_election_year IS NULL OR r.election_year = p_election_year)
        AND (p_race_type IS NULL OR r.race_type = p_race_type)
    ORDER BY r.election_year DESC, r.race_type, p.party_name;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.fetch_bop_data(INTEGER, VARCHAR) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.fetch_bop_data(INTEGER, VARCHAR) IS
'Fetches Balance of Power data for specified election year and race type. Returns party seat counts and trends.';
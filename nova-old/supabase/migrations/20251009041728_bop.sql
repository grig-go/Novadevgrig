-- Main table for election results snapshots
CREATE TABLE bop_election_results (
    id SERIAL PRIMARY KEY,
    office VARCHAR(50) NOT NULL, -- 'U.S. House', 'U.S. Senate'
    office_type_code VARCHAR(10), -- 'H' for House, 'S' for Senate
    race_type VARCHAR(20) NOT NULL, -- 'house', 'senate'
    election_year INTEGER NOT NULL,
    is_test BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Party-level results (using quoted identifier for "leading")
CREATE TABLE bop_party_results (
    id SERIAL PRIMARY KEY,
    election_result_id INTEGER NOT NULL REFERENCES bop_election_results(id) ON DELETE CASCADE,
    party_name VARCHAR(50) NOT NULL, -- 'Dem', 'GOP', 'Others'
    won INTEGER NOT NULL DEFAULT 0,
    "leading" INTEGER NOT NULL DEFAULT 0,  -- Quoted because it's a reserved word
    holdovers INTEGER NOT NULL DEFAULT 0, -- Relevant for Senate
    winning_trend INTEGER NOT NULL DEFAULT 0,
    current_seats INTEGER NOT NULL DEFAULT 0,
    insufficient_vote INTEGER NOT NULL DEFAULT 0
);

-- Net change tracking
CREATE TABLE bop_net_changes (
    id SERIAL PRIMARY KEY,
    party_result_id INTEGER NOT NULL REFERENCES bop_party_results(id) ON DELETE CASCADE,
    winners_change INTEGER NOT NULL DEFAULT 0, -- Can be negative
    leaders_change INTEGER NOT NULL DEFAULT 0
);

-- Insufficient vote breakdown
CREATE TABLE bop_insufficient_vote_details (
    id SERIAL PRIMARY KEY,
    election_result_id INTEGER NOT NULL REFERENCES bop_election_results(id) ON DELETE CASCADE,
    dem_open INTEGER NOT NULL DEFAULT 0,
    gop_open INTEGER NOT NULL DEFAULT 0,
    oth_open INTEGER NOT NULL DEFAULT 0,
    dem_incumbent INTEGER NOT NULL DEFAULT 0,
    gop_incumbent INTEGER NOT NULL DEFAULT 0,
    oth_incumbent INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0
);

-- Indexes for better query performance
CREATE INDEX idx_election_results_year ON bop_election_results(election_year);
CREATE INDEX idx_election_results_race_type ON bop_election_results(race_type);
CREATE INDEX idx_election_results_timestamp ON bop_election_results(timestamp);
CREATE INDEX idx_party_results_election_id ON bop_party_results(election_result_id);
CREATE INDEX idx_party_results_party ON bop_party_results(party_name);

-- Composite index for common queries
CREATE INDEX idx_election_year_race ON bop_election_results(election_year, race_type);

-- Add constraints
ALTER TABLE bop_party_results 
ADD CONSTRAINT unique_party_per_election UNIQUE (election_result_id, party_name);

-- Optional: Add check constraints
ALTER TABLE bop_election_results 
ADD CONSTRAINT check_race_type CHECK (race_type IN ('house', 'senate'));

ALTER TABLE public.bop_election_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bop_party_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bop_net_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bop_insufficient_vote_details ENABLE ROW LEVEL SECURITY;

-- Public read access for bop data
CREATE POLICY "Public read access" ON public.bop_election_results
    FOR SELECT TO public USING (true);
CREATE POLICY "Public read access" ON public.bop_party_results
    FOR SELECT TO public USING (true);
CREATE POLICY "Public read access" ON public.bop_net_changes
    FOR SELECT TO public USING (true);
CREATE POLICY "Public read access" ON public.bop_insufficient_vote_details
    FOR SELECT TO public USING (true);

-- View for easy querying of complete results
CREATE VIEW bop_election_summary AS
SELECT 
    er.id,
    er.office,
    er.race_type,
    er.election_year,
    er.timestamp,
    pr.party_name,
    pr.won,
    pr."leading",  -- Quoted here too
    pr.holdovers,
    pr.winning_trend,
    pr.current_seats,
    nc.winners_change,
    nc.leaders_change
FROM bop_election_results er
JOIN bop_party_results pr ON er.id = pr.election_result_id
LEFT JOIN bop_net_changes nc ON pr.id = nc.party_result_id
ORDER BY er.timestamp DESC, pr.party_name;

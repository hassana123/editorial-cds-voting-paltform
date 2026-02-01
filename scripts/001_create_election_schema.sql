-- NYSC Kano Editorial CDS Electronic Election System
-- Full Database Schema with Row Level Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CDS Members Table (voters eligibility list)
CREATE TABLE IF NOT EXISTS public.cds_members (
  state_code TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  batch TEXT NOT NULL,
  eligible BOOLEAN DEFAULT true,
  is_electoral_committee BOOLEAN DEFAULT false, -- Required for functions to work
  ineligible_reason TEXT,                        -- Required for functions to work
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Electoral Committee Table
CREATE TABLE IF NOT EXISTS public.electoral_committee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- chairman, secretary, member
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Positions Table
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  election_order INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Contestant Applications Table
CREATE TABLE IF NOT EXISTS public.contestant_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  batch TEXT NOT NULL,
  position_id UUID NOT NULL REFERENCES public.positions(id),
  attendance_rating INTEGER NOT NULL CHECK (attendance_rating >= 1 AND attendance_rating <= 10),
  reason TEXT NOT NULL,
  mantra TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(state_code, position_id)
);

-- 5. Votes Table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_state_code_hash TEXT NOT NULL,
  position_id UUID NOT NULL REFERENCES public.positions(id),
  candidate_id UUID NOT NULL REFERENCES public.contestant_applications(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(voter_state_code_hash, position_id)
);

-- 6. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  applications_open BOOLEAN DEFAULT false,
  voting_open BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Data Initialization
INSERT INTO public.system_settings (id, applications_open, voting_open)
VALUES (1, false, false) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.positions (name, election_order, active) VALUES
  ('President', 1, true),
  ('Vice President', 2, true),
  ('Secretary General', 3, true),
  ('Assistant Secretary General', 4, true),
  ('Financial Secretary', 5, true),
  ('Treasurer', 6, true),
  ('Public Relations Officer', 7, true),
  ('Welfare Officer', 8, true),
  ('Media Director', 9, true),
  ('Assistant Media Director', 10, true),
  ('Project Manager', 11, true),
  ('Assistant Project Manager', 12, true)
ON CONFLICT (name) DO NOTHING;

-- 9. Row Level Security Setup
ALTER TABLE public.cds_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electoral_committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contestant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. Clean and Re-apply Policies (FIXED VERSION)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public read access to cds_members" ON public.cds_members;
    DROP POLICY IF EXISTS "Allow committee full access to cds_members" ON public.cds_members;
    DROP POLICY IF EXISTS "Admin manage committee" ON public.electoral_committee;
    DROP POLICY IF EXISTS "Committee view committee" ON public.electoral_committee;
    DROP POLICY IF EXISTS "Allow public read access to active positions" ON public.positions;
    DROP POLICY IF EXISTS "Allow committee full access to positions" ON public.positions;
    DROP POLICY IF EXISTS "Allow public read access to approved applications" ON public.contestant_applications;
    DROP POLICY IF EXISTS "Allow public insert when applications open" ON public.contestant_applications;
    DROP POLICY IF EXISTS "Allow committee full access to applications" ON public.contestant_applications;
    DROP POLICY IF EXISTS "Allow committee read access to votes" ON public.votes;
    DROP POLICY IF EXISTS "Allow public read access to system_settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Allow committee update system_settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Allow committee full access to audit_logs" ON public.audit_logs;
END $$;

-- CDS MEMBERS: Committee can add members (Register them)
CREATE POLICY "Allow public read access to cds_members" ON public.cds_members 
FOR SELECT USING (true);

CREATE POLICY "Allow committee full access to cds_members" ON public.cds_members 
FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'committee');

-- ELECTORAL COMMITTEE: Only Admin can add/remove committee members
CREATE POLICY "Admin manage committee" ON public.electoral_committee 
FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Committee view committee" ON public.electoral_committee 
FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'committee');

-- POSITIONS
CREATE POLICY "Allow public read access to active positions" ON public.positions 
FOR SELECT USING (active = true);

CREATE POLICY "Allow committee full access to positions" ON public.positions 
FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'committee');

-- APPLICATIONS
CREATE POLICY "Allow public read access to approved applications" ON public.contestant_applications 
FOR SELECT USING (status = 'approved');

CREATE POLICY "Allow public insert when applications open" ON public.contestant_applications 
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.system_settings WHERE applications_open = true));

CREATE POLICY "Allow committee full access to applications" ON public.contestant_applications 
FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'committee');

-- VOTES
CREATE POLICY "Allow committee read access to votes" ON public.votes 
FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'committee');

-- SYSTEM SETTINGS
CREATE POLICY "Allow public read access to system_settings" ON public.system_settings 
FOR SELECT USING (true);

CREATE POLICY "Allow committee update system_settings" ON public.system_settings 
FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'committee');

-- AUDIT LOGS
CREATE POLICY "Allow committee full access to audit_logs" ON public.audit_logs 
FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'committee');
-- 11. Core Functions
CREATE OR REPLACE FUNCTION hash_state_code(code TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(code || 'nysc_kano_election_salt', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_voted(code TEXT, pos_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.votes WHERE voter_state_code_hash = hash_state_code(code) AND position_id = pos_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cast_vote(voter_code TEXT, pos_id UUID, cand_id UUID)
RETURNS JSONB AS $$
DECLARE
  member RECORD;
  vote_hash TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.system_settings WHERE voting_open = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voting closed');
  END IF;

  SELECT * INTO member FROM public.cds_members WHERE state_code = UPPER(voter_code);
  IF member IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid state code'); END IF;
  IF member.is_electoral_committee THEN RETURN jsonb_build_object('success', false, 'error', 'Electoral committee members cannot vote'); END IF;
  IF NOT member.eligible THEN RETURN jsonb_build_object('success', false, 'error', COALESCE(member.ineligible_reason, 'Not eligible')); END IF;

  vote_hash := hash_state_code(voter_code);

  IF EXISTS (SELECT 1 FROM public.votes WHERE voter_state_code_hash = vote_hash AND position_id = pos_id) THEN
    UPDATE public.cds_members SET eligible = false, ineligible_reason = 'Attempted double voting' WHERE state_code = UPPER(voter_code);
    RETURN jsonb_build_object('success', false, 'error', 'Already voted');
  END IF;

  INSERT INTO public.votes(voter_state_code_hash, position_id, candidate_id) VALUES (vote_hash, pos_id, cand_id);
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_vote_counts()
RETURNS TABLE (position_id UUID, position_name TEXT, candidate_id UUID, candidate_name TEXT, vote_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, ca.id, ca.full_name, COUNT(v.id)
  FROM public.positions p
  LEFT JOIN public.contestant_applications ca ON ca.position_id = p.id AND ca.status = 'approved'
  LEFT JOIN public.votes v ON v.candidate_id = ca.id
  WHERE p.active = true
  GROUP BY p.id, p.name, ca.id, ca.full_name
  ORDER BY p.election_order, vote_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_electoral_committee(p_state_code TEXT, p_full_name TEXT, p_role TEXT)
RETURNS JSONB AS $$
BEGIN
  INSERT INTO public.electoral_committee (state_code, full_name, role)
  VALUES (UPPER(p_state_code), p_full_name, p_role);

  UPDATE public.cds_members
  SET is_electoral_committee = true, eligible = false, ineligible_reason = 'Electoral committee member'
  WHERE state_code = UPPER(p_state_code);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- NYSC Kano Editorial CDS Electronic Election System
-- Database Schema with Row Level Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CDS Members Table (voters eligibility list)
CREATE TABLE IF NOT EXISTS public.cds_members (
  state_code TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  batch TEXT NOT NULL,
  eligible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Positions Table (electoral positions)
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  election_order INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Contestant Applications Table
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

-- 4. Votes Table (anonymous voting with hashed state codes)
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_state_code_hash TEXT NOT NULL,
  position_id UUID NOT NULL REFERENCES public.positions(id),
  candidate_id UUID NOT NULL REFERENCES public.contestant_applications(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(voter_state_code_hash, position_id)
);

-- 5. System Settings Table (election phase control)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  applications_open BOOLEAN DEFAULT false,
  voting_open BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO public.system_settings (id, applications_open, voting_open)
VALUES (1, false, false)
ON CONFLICT (id) DO NOTHING;

-- Insert default positions
INSERT INTO public.positions (name, election_order, active) VALUES
  ('President', 1, true),
  ('Vice President', 2, true),
  ('Secretary General', 3, true),
  ('Assistant Secretary General', 4, true),
  ('Financial Secretary', 5, true),
  ('Treasurer', 6, true),
  ('Public Relations Officer', 7, true),
  ('Welfare Officer', 8, true)
  ('Media Director', 9, true)
  ('Assistant Media Director', 10, true)
  ('Project Manager', 11, true)
  ('Assistant Project Manager', 12, true)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security on all tables
ALTER TABLE public.cds_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contestant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to cds_members" ON public.cds_members;
DROP POLICY IF EXISTS "Allow admin full access to cds_members" ON public.cds_members;
DROP POLICY IF EXISTS "Allow public read access to active positions" ON public.positions;
DROP POLICY IF EXISTS "Allow admin full access to positions" ON public.positions;
DROP POLICY IF EXISTS "Allow public read access to approved applications" ON public.contestant_applications;
DROP POLICY IF EXISTS "Allow public insert when applications open" ON public.contestant_applications;
DROP POLICY IF EXISTS "Allow admin full access to applications" ON public.contestant_applications;
DROP POLICY IF EXISTS "Allow insert votes when voting open" ON public.votes;
DROP POLICY IF EXISTS "Allow admin read access to votes" ON public.votes;
DROP POLICY IF EXISTS "Allow public read access to system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admin update system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow admin full access to audit_logs" ON public.audit_logs;

-- RLS Policies for cds_members
CREATE POLICY "Allow public read access to cds_members" ON public.cds_members
  FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to cds_members" ON public.cds_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'committee'
    )
  );

-- RLS Policies for positions
CREATE POLICY "Allow public read access to active positions" ON public.positions
  FOR SELECT USING (active = true);

CREATE POLICY "Allow admin full access to positions" ON public.positions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'committee'
    )
  );

-- RLS Policies for contestant_applications
CREATE POLICY "Allow public read access to approved applications" ON public.contestant_applications
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Allow public insert when applications open" ON public.contestant_applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_settings WHERE applications_open = true
    )
  );

CREATE POLICY "Allow admin full access to applications" ON public.contestant_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'committee'
    )
  );

-- RLS Policies for votes
CREATE POLICY "Allow insert votes when voting open" ON public.votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_settings WHERE voting_open = true
    )
  );

CREATE POLICY "Allow admin read access to votes" ON public.votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'committee'
    )
  );

-- RLS Policies for system_settings
CREATE POLICY "Allow public read access to system_settings" ON public.system_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow admin update system_settings" ON public.system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'committee'
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Allow admin full access to audit_logs" ON public.audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'committee'
    )
  );

-- Create function to hash state codes for voting
CREATE OR REPLACE FUNCTION hash_state_code(code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(code || 'nysc_kano_election_salt', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if state code has voted for a position
CREATE OR REPLACE FUNCTION has_voted(code TEXT, pos_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.votes
    WHERE voter_state_code_hash = hash_state_code(code)
    AND position_id = pos_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cast vote
CREATE OR REPLACE FUNCTION cast_vote(voter_code TEXT, pos_id UUID, cand_id UUID)
RETURNS JSONB AS $$
DECLARE
  settings_record RECORD;
  member_record RECORD;
  vote_hash TEXT;
BEGIN
  -- Check if voting is open
  SELECT * INTO settings_record FROM public.system_settings WHERE id = 1;
  IF NOT settings_record.voting_open THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voting is currently closed');
  END IF;

  -- Check if state code exists and is eligible
  SELECT * INTO member_record FROM public.cds_members WHERE state_code = voter_code;
  IF member_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid state code');
  END IF;
  IF NOT member_record.eligible THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not eligible to vote');
  END IF;

  -- Generate hash
  vote_hash := hash_state_code(voter_code);

  -- Check if already voted for this position
  IF EXISTS (SELECT 1 FROM public.votes WHERE voter_state_code_hash = vote_hash AND position_id = pos_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already voted for this position');
  END IF;

  -- Cast vote
  INSERT INTO public.votes (voter_state_code_hash, position_id, candidate_id)
  VALUES (vote_hash, pos_id, cand_id);

  RETURN jsonb_build_object('success', true, 'message', 'Vote cast successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get vote counts (admin only)
CREATE OR REPLACE FUNCTION get_vote_counts()
RETURNS TABLE (
  position_id UUID,
  position_name TEXT,
  candidate_id UUID,
  candidate_name TEXT,
  vote_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as position_id,
    p.name as position_name,
    ca.id as candidate_id,
    ca.full_name as candidate_name,
    COUNT(v.id) as vote_count
  FROM public.positions p
  LEFT JOIN public.contestant_applications ca ON ca.position_id = p.id AND ca.status = 'approved'
  LEFT JOIN public.votes v ON v.candidate_id = ca.id
  WHERE p.active = true
  GROUP BY p.id, p.name, ca.id, ca.full_name
  ORDER BY p.election_order, vote_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

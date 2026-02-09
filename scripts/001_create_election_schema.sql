-- NYSC Kano Editorial CDS Electronic Election System
-- Improved Database Schema with Enhanced Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. CDS MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.cds_members (
  state_code TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  batch TEXT NOT NULL,
  eligible BOOLEAN DEFAULT true,
  is_electoral_committee BOOLEAN DEFAULT false,
  ineligible_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. ELECTORAL COMMITTEE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.electoral_committee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT UNIQUE NOT NULL REFERENCES public.cds_members(state_code) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('chairman', 'secretary', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. POSITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  election_order INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CONTESTANT APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.contestant_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  state_code TEXT NOT NULL REFERENCES public.cds_members(state_code),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  batch TEXT NOT NULL,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  attendance_rating INTEGER NOT NULL CHECK (attendance_rating >= 1 AND attendance_rating <= 10),
  reason TEXT NOT NULL,
  mantra TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(state_code, position_id)
);

-- ============================================
-- 5. VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_state_code_hash TEXT NOT NULL,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.contestant_applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(voter_state_code_hash, position_id)
);

-- ============================================
-- 6. VOTE ATTEMPTS TABLE (Track failed attempts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.vote_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_state_code_hash TEXT NOT NULL,
  position_id UUID REFERENCES public.positions(id),
  attempt_type TEXT NOT NULL, -- 'double_vote', 'ineligible', 'not_member', 'voting_closed'
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  applications_open BOOLEAN DEFAULT false,
  voting_open BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. DATA INITIALIZATION
-- ============================================
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

-- ============================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_votes_position ON public.votes(position_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON public.votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_hash ON public.votes(voter_state_code_hash);
CREATE INDEX IF NOT EXISTS idx_applications_position ON public.contestant_applications(position_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.contestant_applications(status);
CREATE INDEX IF NOT EXISTS idx_members_eligible ON public.cds_members(eligible);

-- ============================================
-- 11. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.cds_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electoral_committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contestant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. DROP OLD POLICIES
-- ============================================
DO $$ 
BEGIN
    -- CDS Members
    DROP POLICY IF EXISTS "Allow public read access to cds_members" ON public.cds_members;
    DROP POLICY IF EXISTS "Allow committee full access to cds_members" ON public.cds_members;
    DROP POLICY IF EXISTS "Admin full access to members" ON public.cds_members;
    
    -- Electoral Committee
    DROP POLICY IF EXISTS "Admin manage committee" ON public.electoral_committee;
    DROP POLICY IF EXISTS "Committee view committee" ON public.electoral_committee;
    DROP POLICY IF EXISTS "Electoral Access" ON public.electoral_committee;
    DROP POLICY IF EXISTS "Admin and Committee can view committee list" ON public.electoral_committee;
    
    -- Positions
    DROP POLICY IF EXISTS "Allow public read access to active positions" ON public.positions;
    DROP POLICY IF EXISTS "Allow committee full access to positions" ON public.positions;
    
    -- Applications
    DROP POLICY IF EXISTS "Allow public read access to approved applications" ON public.contestant_applications;
    DROP POLICY IF EXISTS "Allow public insert when applications open" ON public.contestant_applications;
    DROP POLICY IF EXISTS "Allow committee full access to applications" ON public.contestant_applications;
    
    -- Votes
    DROP POLICY IF EXISTS "Allow committee read access to votes" ON public.votes;
    
    -- Vote Attempts
    DROP POLICY IF EXISTS "Committee read vote attempts" ON public.vote_attempts;
    
    -- System Settings
    DROP POLICY IF EXISTS "Allow public read access to system_settings" ON public.system_settings;
    DROP POLICY IF EXISTS "Allow committee update system_settings" ON public.system_settings;
    
    -- Audit Logs
    DROP POLICY IF EXISTS "Allow committee full access to audit_logs" ON public.audit_logs;
END $$;

-- ============================================
-- 13. NEW RLS POLICIES
-- ============================================

-- CDS MEMBERS: Public read, Committee/Admin write
CREATE POLICY "Public read members" ON public.cds_members 
FOR SELECT USING (true);

CREATE POLICY "Admin and Committee manage members" ON public.cds_members 
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'committee')
);

-- ELECTORAL COMMITTEE: Admin full control, Committee read
CREATE POLICY "Admin manage committee" ON public.electoral_committee 
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Committee read committee" ON public.electoral_committee 
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'committee')
);

-- POSITIONS: Public read active, Committee full access
CREATE POLICY "Public read active positions" ON public.positions 
FOR SELECT USING (active = true);

CREATE POLICY "Committee manage positions" ON public.positions 
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'committee')
);

-- APPLICATIONS: Public read approved & insert when open, Committee full access
CREATE POLICY "Public read approved applications" ON public.contestant_applications 
FOR SELECT USING (status = 'approved');

CREATE POLICY "Public insert when applications open" ON public.contestant_applications 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.system_settings WHERE applications_open = true)
);

CREATE POLICY "Committee manage applications" ON public.contestant_applications 
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'committee')
);

-- VOTES: Committee read only
CREATE POLICY "Committee read votes" ON public.votes 
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'committee')
);

-- VOTE ATTEMPTS: Committee read only
CREATE POLICY "Committee read vote attempts" ON public.vote_attempts 
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'committee')
);

-- SYSTEM SETTINGS: Public read, Committee update
CREATE POLICY "Public read settings" ON public.system_settings 
FOR SELECT USING (true);

CREATE POLICY "Committee update settings" ON public.system_settings 
FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'committee')
);

-- AUDIT LOGS: Committee full access
CREATE POLICY "Committee manage audit logs" ON public.audit_logs 
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'committee')
);

-- ============================================
-- 14. CORE FUNCTIONS
-- ============================================

-- Hash function for state code anonymization
CREATE OR REPLACE FUNCTION hash_state_code(code TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(UPPER(code) || 'nysc_kano_election_salt_2025', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if voter has already voted for a position
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

-- Enhanced vote casting with detailed error tracking
CREATE OR REPLACE FUNCTION cast_vote(voter_code TEXT, pos_id UUID, cand_id UUID)
RETURNS JSONB AS $$
DECLARE
  member RECORD;
  vote_hash TEXT;
  settings RECORD;
BEGIN
  -- Check if voting is open
  SELECT * INTO settings FROM public.system_settings WHERE id = 1;
  
  IF NOT settings.voting_open THEN
    -- Log attempt
    INSERT INTO public.vote_attempts (voter_state_code_hash, position_id, attempt_type, reason)
    VALUES (hash_state_code(voter_code), pos_id, 'voting_closed', 'Attempted to vote while voting is closed');
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Voting is currently closed',
      'reason_code', 'VOTING_CLOSED'
    );
  END IF;

  -- Check if voter is a registered member
  SELECT * INTO member FROM public.cds_members WHERE state_code = UPPER(voter_code);
  
  IF member IS NULL THEN
    -- Log attempt
    INSERT INTO public.vote_attempts (voter_state_code_hash, position_id, attempt_type, reason)
    VALUES (hash_state_code(voter_code), pos_id, 'not_member', 'State code not found in members list');
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Your state code is not registered in the CDS members list',
      'reason_code', 'NOT_REGISTERED'
    );
  END IF;

  -- Check if member is electoral committee
  IF member.is_electoral_committee THEN
    -- Log attempt
    INSERT INTO public.vote_attempts (voter_state_code_hash, position_id, attempt_type, reason)
    VALUES (hash_state_code(voter_code), pos_id, 'ineligible', 'Electoral committee member attempted to vote');
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Electoral committee members are not allowed to vote',
      'reason_code', 'COMMITTEE_MEMBER'
    );
  END IF;

  -- Check eligibility
  IF NOT member.eligible THEN
    -- Log attempt
    INSERT INTO public.vote_attempts (voter_state_code_hash, position_id, attempt_type, reason)
    VALUES (hash_state_code(voter_code), pos_id, 'ineligible', COALESCE(member.ineligible_reason, 'Account marked as ineligible'));
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', COALESCE(member.ineligible_reason, 'Your account is not eligible to vote'),
      'reason_code', 'INELIGIBLE'
    );
  END IF;

  vote_hash := hash_state_code(voter_code);

  -- Check for double voting
  IF EXISTS (SELECT 1 FROM public.votes WHERE voter_state_code_hash = vote_hash AND position_id = pos_id) THEN
    -- Log attempt and mark as ineligible
    INSERT INTO public.vote_attempts (voter_state_code_hash, position_id, attempt_type, reason)
    VALUES (vote_hash, pos_id, 'double_vote', 'Attempted to vote twice for the same position');
    
    UPDATE public.cds_members 
    SET eligible = false, 
        ineligible_reason = 'Attempted to vote twice for position',
        updated_at = NOW()
    WHERE state_code = UPPER(voter_code);
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'You have already voted for this position',
      'reason_code', 'ALREADY_VOTED'
    );
  END IF;

  -- Cast the vote
  INSERT INTO public.votes(voter_state_code_hash, position_id, candidate_id) 
  VALUES (vote_hash, pos_id, cand_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Vote cast successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get vote counts
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
    p.id, 
    p.name, 
    ca.id, 
    ca.full_name, 
    COUNT(v.id)::BIGINT
  FROM public.positions p
  LEFT JOIN public.contestant_applications ca ON ca.position_id = p.id AND ca.status = 'approved'
  LEFT JOIN public.votes v ON v.candidate_id = ca.id
  WHERE p.active = true
  GROUP BY p.id, p.name, ca.id, ca.full_name
  ORDER BY p.election_order, vote_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add electoral committee member
CREATE OR REPLACE FUNCTION add_electoral_committee(
  p_state_code TEXT, 
  p_full_name TEXT, 
  p_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  member_exists BOOLEAN;
BEGIN
  -- Check if member exists in cds_members
  SELECT EXISTS(SELECT 1 FROM public.cds_members WHERE state_code = UPPER(p_state_code))
  INTO member_exists;
  
  IF NOT member_exists THEN
    -- Add to cds_members first
    INSERT INTO public.cds_members (state_code, full_name, batch, is_electoral_committee, eligible, ineligible_reason)
    VALUES (UPPER(p_state_code), p_full_name, 'Committee', true, false, 'Electoral committee member');
  ELSE
    -- Update existing member
    UPDATE public.cds_members
    SET is_electoral_committee = true, 
        eligible = false, 
        ineligible_reason = 'Electoral committee member',
        updated_at = NOW()
    WHERE state_code = UPPER(p_state_code);
  END IF;
  
  -- Add to electoral committee
  INSERT INTO public.electoral_committee (state_code, full_name, role)
  VALUES (UPPER(p_state_code), p_full_name, p_role)
  ON CONFLICT (state_code) DO UPDATE
  SET full_name = p_full_name, role = p_role, updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Committee member added successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove electoral committee member
CREATE OR REPLACE FUNCTION remove_electoral_committee(p_state_code TEXT)
RETURNS JSONB AS $$
BEGIN
  -- Remove from electoral committee
  DELETE FROM public.electoral_committee WHERE state_code = UPPER(p_state_code);
  
  -- Update cds_members
  UPDATE public.cds_members
  SET is_electoral_committee = false,
      eligible = true,
      ineligible_reason = NULL,
      updated_at = NOW()
  WHERE state_code = UPPER(p_state_code);
  
  RETURN jsonb_build_object('success', true, 'message', 'Committee member removed successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk add members from CSV
CREATE OR REPLACE FUNCTION bulk_add_members(members_data JSONB)
RETURNS JSONB AS $$
DECLARE
  member JSONB;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::JSONB;
BEGIN
  FOR member IN SELECT * FROM jsonb_array_elements(members_data)
  LOOP
    BEGIN
      INSERT INTO public.cds_members (state_code, full_name, batch)
      VALUES (
        UPPER(member->>'state_code'),
        member->>'full_name',
        member->>'batch'
      )
      ON CONFLICT (state_code) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          batch = EXCLUDED.batch,
          updated_at = NOW();
      
      success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'state_code', member->>'state_code',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'added', success_count,
    'errors', error_count,
    'error_details', errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cds_members_updated_at ON public.cds_members;
CREATE TRIGGER update_cds_members_updated_at
  BEFORE UPDATE ON public.cds_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_electoral_committee_updated_at ON public.electoral_committee;
CREATE TRIGGER update_electoral_committee_updated_at
  BEFORE UPDATE ON public.electoral_committee
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.contestant_applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.contestant_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
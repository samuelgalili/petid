
-- Table to track failed login attempts by IP for server-side rate limiting
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz DEFAULT now(),
  is_blocked boolean DEFAULT false,
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fast IP lookups
CREATE INDEX idx_auth_rate_limits_ip ON public.auth_rate_limits(ip_address);
CREATE INDEX idx_auth_rate_limits_blocked ON public.auth_rate_limits(is_blocked) WHERE is_blocked = true;

-- Blocked IPs table (permanent/manual blocks)
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text,
  blocked_by text,
  blocked_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

CREATE INDEX idx_blocked_ips_active ON public.blocked_ips(ip_address) WHERE is_active = true;

-- Insert the 3 attacking IPs immediately
INSERT INTO public.blocked_ips (ip_address, reason, blocked_by) VALUES
  ('135.232.200.1', 'Brute force attack detected - 2026-03-08', 'system'),
  ('52.165.250.241', 'Brute force attack detected - 2026-03-08', 'system'),
  ('20.109.39.48', 'Brute force attack detected - 2026-03-08', 'system')
ON CONFLICT (ip_address) DO NOTHING;

-- RLS: Only admins can manage these tables
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rate limits" ON public.auth_rate_limits
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Function to check and record login attempts (called from edge function)
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  p_ip_address text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_duration_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocked boolean;
  v_blocked_until timestamptz;
  v_attempt_count integer;
  v_result jsonb;
BEGIN
  -- Check permanent block list first
  SELECT EXISTS(
    SELECT 1 FROM blocked_ips 
    WHERE ip_address = p_ip_address 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_blocked;

  IF v_blocked THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ip_blocked', 'retry_after', 0);
  END IF;

  -- Check/update rate limit window
  SELECT attempt_count, is_blocked, blocked_until
  INTO v_attempt_count, v_blocked, v_blocked_until
  FROM auth_rate_limits
  WHERE ip_address = p_ip_address
  AND first_attempt_at > now() - (p_window_minutes || ' minutes')::interval
  ORDER BY first_attempt_at DESC
  LIMIT 1;

  -- Currently blocked?
  IF v_blocked AND v_blocked_until > now() THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'rate_limited',
      'retry_after', EXTRACT(EPOCH FROM (v_blocked_until - now()))::integer
    );
  END IF;

  -- Increment or create
  IF v_attempt_count IS NOT NULL THEN
    UPDATE auth_rate_limits
    SET attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        is_blocked = CASE WHEN attempt_count + 1 >= p_max_attempts THEN true ELSE false END,
        blocked_until = CASE WHEN attempt_count + 1 >= p_max_attempts 
          THEN now() + (p_block_duration_minutes || ' minutes')::interval 
          ELSE null END
    WHERE ip_address = p_ip_address
    AND first_attempt_at > now() - (p_window_minutes || ' minutes')::interval
    RETURNING attempt_count, is_blocked INTO v_attempt_count, v_blocked;
  ELSE
    INSERT INTO auth_rate_limits (ip_address, attempt_count)
    VALUES (p_ip_address, 1);
    v_attempt_count := 1;
    v_blocked := false;
  END IF;

  IF v_blocked THEN
    -- Auto-escalate: if blocked 3+ times, add to permanent block list
    IF (SELECT count(*) FROM auth_rate_limits WHERE ip_address = p_ip_address AND is_blocked = true) >= 3 THEN
      INSERT INTO blocked_ips (ip_address, reason, blocked_by)
      VALUES (p_ip_address, 'Auto-blocked: repeated brute force', 'system')
      ON CONFLICT (ip_address) DO UPDATE SET is_active = true, blocked_at = now();
    END IF;

    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'rate_limited',
      'retry_after', p_block_duration_minutes * 60
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true, 
    'attempts_remaining', p_max_attempts - v_attempt_count
  );
END;
$$;

-- Cleanup old rate limit records (older than 24h)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM auth_rate_limits WHERE first_attempt_at < now() - interval '24 hours';
$$;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Allow public read access to profiles for display names and avatars
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles
FOR SELECT
USING (true);
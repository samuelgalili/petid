-- Enable RLS on stories table if not already enabled
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active stories" ON stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;

-- Allow anyone to view stories that haven't expired
CREATE POLICY "Anyone can view active stories"
ON stories
FOR SELECT
USING (expires_at > now());

-- Allow authenticated users to create stories
CREATE POLICY "Users can create their own stories"
ON stories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own stories
CREATE POLICY "Users can delete their own stories"
ON stories
FOR DELETE
USING (auth.uid() = user_id);
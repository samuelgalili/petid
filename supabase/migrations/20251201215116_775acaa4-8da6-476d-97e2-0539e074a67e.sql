-- Drop existing constraint if exists (just to be safe)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

-- Add foreign key constraint from posts.user_id to profiles.id
ALTER TABLE posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
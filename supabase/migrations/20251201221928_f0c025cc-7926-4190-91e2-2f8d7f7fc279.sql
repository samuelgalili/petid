-- Add foreign key from posts.user_id to profiles.id if it doesn't exist
DO $$ 
BEGIN
  -- Check if foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_user_id_fkey_profiles'
    AND table_name = 'posts'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE posts 
    ADD CONSTRAINT posts_user_id_fkey_profiles 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
-- Add RLS policies for social feed tables with correct column names

-- 1. posts - Users can manage their own posts, view all public posts
CREATE POLICY "Users can view all posts"
ON public.posts
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 2. post_likes - Users can view likes, create/delete their own
CREATE POLICY "Users can view all post likes"
ON public.post_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own post likes"
ON public.post_likes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own post likes"
ON public.post_likes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 3. post_comments - Users can view comments, manage their own
CREATE POLICY "Users can view all post comments"
ON public.post_comments
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own post comments"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own post comments"
ON public.post_comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own post comments"
ON public.post_comments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 4. stories - Users can view active stories, manage their own
CREATE POLICY "Users can view all active stories"
ON public.stories
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own stories"
ON public.stories
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own stories"
ON public.stories
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 5. story_views - Users can view story views, create their own (uses viewer_id)
CREATE POLICY "Users can view story views they are part of"
ON public.story_views
FOR SELECT
TO authenticated
USING (viewer_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.stories 
  WHERE stories.id = story_views.story_id 
  AND stories.user_id = auth.uid()
));

CREATE POLICY "Users can create their own story views"
ON public.story_views
FOR INSERT
TO authenticated
WITH CHECK (viewer_id = auth.uid());

-- 6. story_replies - Users can view replies, manage their own (uses sender_id and receiver_id)
CREATE POLICY "Users can view story replies they are part of"
ON public.story_replies
FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create their own story replies"
ON public.story_replies
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own story replies"
ON public.story_replies
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- 7. user_follows - Users can view follows they are part of, manage their own (uses follower_id and following_id)
CREATE POLICY "Users can view follows they are part of"
ON public.user_follows
FOR SELECT
TO authenticated
USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can create their own follows"
ON public.user_follows
FOR INSERT
TO authenticated
WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete their own follows"
ON public.user_follows
FOR DELETE
TO authenticated
USING (follower_id = auth.uid());
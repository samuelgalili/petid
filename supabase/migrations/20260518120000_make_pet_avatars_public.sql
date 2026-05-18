-- Pet avatars are displayed directly from stored URLs across the app.
UPDATE storage.buckets
SET public = true
WHERE id = 'pet-avatars';

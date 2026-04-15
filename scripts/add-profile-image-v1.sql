-- Add profile_image column to participants table
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS profile_image TEXT;

COMMIT;

-- Create auth schema for NextAuth.js (Prisma)
CREATE SCHEMA IF NOT EXISTS auth;

-- Create a custom type for video status
CREATE TYPE video_status AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'ERROR');

-- Create the main 'videos' table
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Original file info
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1024) NOT NULL, -- Path in MinIO 'raw-uploads'

    -- Processed file info
    hls_playlist_url VARCHAR(1024),
    thumbnail_url VARCHAR(1024),

    -- Status
    status video_status DEFAULT 'PENDING',
    processing_error TEXT, -- Store error message if status is 'ERROR'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create a function to update 'updated_at' timestamp automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON videos
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Insert a dummy video just for testing
INSERT INTO videos (title, original_filename, storage_path, status)
VALUES ('Test Video', 'test.mp4', 'test.mp4', 'PUBLISHED');

-- Subtitles table to store external subtitle tracks per video
CREATE TABLE IF NOT EXISTS subtitles (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  language VARCHAR(64),            -- e.g., "en", "English"
  label VARCHAR(128),              -- display label, e.g., "English"
  storage_path VARCHAR(1024) NOT NULL, -- MinIO object path under processed-media
  url VARCHAR(1024),               -- public URL to the subtitle file
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Create songs table for storing song metadata
CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
  track_id VARCHAR(255) UNIQUE NOT NULL,
  track_name VARCHAR(500) NOT NULL,
  artist_name VARCHAR(500) NOT NULL,
  genre VARCHAR(100),
  mood VARCHAR(50),
  tempo VARCHAR(50),
  energy DECIMAL(3,2),
  danceability DECIMAL(3,2),
  valence DECIMAL(3,2),
  acousticness DECIMAL(3,2),
  instrumentalness DECIMAL(3,2),
  popularity INTEGER,
  duration_ms INTEGER,
  explicit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
CREATE INDEX IF NOT EXISTS idx_songs_mood ON songs(mood);
CREATE INDEX IF NOT EXISTS idx_songs_tempo ON songs(tempo);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist_name);
CREATE INDEX IF NOT EXISTS idx_songs_track_name ON songs(track_name);

-- Create a composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_songs_genre_mood_tempo ON songs(genre, mood, tempo);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_songs_updated_at 
    BEFORE UPDATE ON songs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO songs (track_id, track_name, artist_name, genre, mood, tempo, energy, danceability, valence) VALUES
('sample_1', 'Bohemian Rhapsody', 'Queen', 'rock', 'dramatic', 'medium', 0.8, 0.6, 0.7),
('sample_2', 'Hotel California', 'Eagles', 'rock', 'melancholic', 'medium', 0.7, 0.5, 0.4),
('sample_3', 'Billie Jean', 'Michael Jackson', 'pop', 'energetic', 'fast', 0.9, 0.8, 0.8),
('sample_4', 'Imagine', 'John Lennon', 'folk', 'peaceful', 'slow', 0.3, 0.4, 0.6),
('sample_5', 'Smells Like Teen Spirit', 'Nirvana', 'grunge', 'angry', 'fast', 0.9, 0.7, 0.3)
ON CONFLICT (track_id) DO NOTHING;

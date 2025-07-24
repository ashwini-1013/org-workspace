import "dotenv/config"
import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function setupDatabase() {
  try {
    console.log("🗄️ Setting up Neon database...")

    // Create songs table
    await sql`
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
      )
    `

    console.log("✅ Created songs table")

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre)`
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_mood ON songs(mood)`
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_tempo ON songs(tempo)`
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist_name)`
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_track_name ON songs(track_name)`
    await sql`CREATE INDEX IF NOT EXISTS idx_songs_genre_mood_tempo ON songs(genre, mood, tempo)`

    console.log("✅ Created database indexes")

    // Create trigger function for updating updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS update_songs_updated_at ON songs
    `

    await sql`
      CREATE TRIGGER update_songs_updated_at 
          BEFORE UPDATE ON songs 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `

    console.log("✅ Created database triggers")

    // Insert sample data
    await sql`
      INSERT INTO songs (track_id, track_name, artist_name, genre, mood, tempo, energy, danceability, valence) VALUES
      ('sample_1', 'Bohemian Rhapsody', 'Queen', 'rock', 'dramatic', 'medium', 0.8, 0.6, 0.7),
      ('sample_2', 'Hotel California', 'Eagles', 'rock', 'melancholic', 'medium', 0.7, 0.5, 0.4),
      ('sample_3', 'Billie Jean', 'Michael Jackson', 'pop', 'energetic', 'fast', 0.9, 0.8, 0.8),
      ('sample_4', 'Imagine', 'John Lennon', 'folk', 'peaceful', 'slow', 0.3, 0.4, 0.6),
      ('sample_5', 'Smells Like Teen Spirit', 'Nirvana', 'grunge', 'angry', 'fast', 0.9, 0.7, 0.3)
      ON CONFLICT (track_id) DO NOTHING
    `

    console.log("✅ Inserted sample data")

    // Get database stats
    const stats = await sql`
      SELECT 
        COUNT(*) as total_songs,
        COUNT(DISTINCT genre) as total_genres,
        COUNT(DISTINCT artist_name) as total_artists
      FROM songs
    `

    console.log("📊 Database Statistics:")
    console.log(`   - Total songs: ${stats[0].total_songs}`)
    console.log(`   - Total genres: ${stats[0].total_genres}`)
    console.log(`   - Total artists: ${stats[0].total_artists}`)

    console.log("🎉 Database setup completed successfully!")
  } catch (error) {
    console.error("❌ Database setup failed:", error)
    process.exit(1)
  }
}

setupDatabase()

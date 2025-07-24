import "dotenv/config"
import fs from "fs"
import path from "path"
import csv from "csv-parser"
import { storeSongMetadata } from "../libs/database/src/lib//database"
import { storeSongEmbedding, getEmbedding } from "../libs/vector-service/src/lib/vector-store"

interface CSVSong {
  track_id?: string
  track_name: string
  artist_name: string
  genre: string
  mood?: string
  tempo?: string
  energy?: string
  danceability?: string
  valence?: string
  acousticness?: string
  instrumentalness?: string
  popularity?: string
  duration_ms?: string
  explicit?: string
}

async function loadCSV(filepath: string): Promise<CSVSong[]> {
  return new Promise((resolve, reject) => {
    const results: CSVSong[] = []
    let rowCount = 0

    if (!fs.existsSync(filepath)) {
      reject(new Error(`CSV file not found: ${filepath}`))
      return
    }

    console.log(`📂 Reading CSV file: ${filepath}`)

    fs.createReadStream(filepath)
      .pipe(csv())
      .on("data", (data) => {
        rowCount++

        // Debug: Log first few rows to see the structure
        if (rowCount <= 3) {
          console.log(`🔍 Row ${rowCount} data:`, data)
          console.log(`🔍 Available columns:`, Object.keys(data))
        }

        // Get track name from available columns
        const trackName = data.song_name || data.track_name || data.title || data.name

        // Since there's no artist column, we'll use "Unknown Artist" or extract from song name
        let artistName = data.artist_name || data.artist || data.performer

        // If no artist, try to extract from song name or use default
        if (!artistName) {
          // Check if song name has "by" or "-" indicating artist
          if (trackName && trackName.includes(" by ")) {
            const parts = trackName.split(" by ")
            artistName = parts[1]?.trim()
          } else if (trackName && trackName.includes(" - ")) {
            const parts = trackName.split(" - ")
            if (parts.length > 1) {
              artistName = parts[0]?.trim()
            }
          }

          // If still no artist, use genre-based default
          if (!artistName) {
            const genre = data.genre || "Unknown"
            artistName = `${genre} Artist`
          }
        }

        if (trackName && artistName) {
          results.push({
            ...data,
            track_name: trackName,
            artist_name: artistName,
          })
        } else {
          if (rowCount <= 5) {
            console.log(`⚠️ Row ${rowCount} missing required fields:`, {
              track_name: trackName,
              artist_name: artistName,
            })
          }
        }
      })
      .on("end", () => {
        console.log(`📊 Total rows processed: ${rowCount}`)
        console.log(`📊 Valid songs found: ${results.length}`)
        resolve(results)
      })
      .on("error", (error) => {
        console.error("❌ CSV parsing error:", error)
        reject(error)
      })
  })
}

function parseNumericField(value: string | undefined): number | undefined {
  if (!value || value === "") return undefined
  const parsed = Number.parseFloat(value)
  return isNaN(parsed) ? undefined : parsed
}

function generateTrackId(trackName: string, artistName: string): string {
  return `${trackName}_${artistName}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 50)
}

// Function to determine mood from audio features
function inferMoodFromFeatures(energy: number, valence: number, danceability: number): string {
  if (valence > 0.6 && energy > 0.6) return "happy"
  if (valence < 0.4 && energy < 0.4) return "sad"
  if (energy > 0.7 && danceability > 0.7) return "energetic"
  if (energy < 0.4 && valence > 0.3 && valence < 0.7) return "calm"
  if (valence < 0.3) return "melancholic"
  if (energy > 0.6) return "upbeat"
  return "neutral"
}

// Function to determine tempo category
function inferTempoCategory(tempo: number): string {
  if (tempo < 90) return "slow"
  if (tempo > 140) return "fast"
  return "medium"
}

async function processAndStoreSong(csvSong: CSVSong, index: number): Promise<void> {
  try {
    // Generate track_id if not present
    const trackId = csvSong.track_id || generateTrackId(csvSong.track_name, csvSong.artist_name)

    // Parse numeric values
    const energy = parseNumericField(csvSong.energy) || 0
    const valence = parseNumericField(csvSong.valence) || 0
    const danceability = parseNumericField(csvSong.danceability) || 0
    const tempoNum = parseNumericField(csvSong.tempo) || 120

    // Infer mood and tempo category from audio features
    const inferredMood = inferMoodFromFeatures(energy, valence, danceability)
    const inferredTempo = inferTempoCategory(tempoNum)

    // Prepare song metadata for database
    const songMetadata = {
      track_id: trackId,
      track_name: csvSong.track_name.trim(),
      artist_name: csvSong.artist_name.trim(),
      genre: csvSong.genre?.trim() || "unknown",
      mood: csvSong.mood?.trim() || inferredMood,
      tempo: csvSong.tempo?.trim() || inferredTempo,
      energy: energy,
      danceability: danceability,
      valence: valence,
      acousticness: parseNumericField(csvSong.acousticness),
      instrumentalness: parseNumericField(csvSong.instrumentalness),
      popularity: parseNumericField(csvSong.popularity),
      duration_ms: parseNumericField(csvSong.duration_ms),
      explicit: csvSong.explicit === "true" || csvSong.explicit === "1",
    }

    // Store in database first
    await storeSongMetadata(songMetadata)

    // Create embedding text (clean it to avoid API issues)
    const embeddingText =
      `${songMetadata.track_name} by ${songMetadata.artist_name} ${songMetadata.genre} ${songMetadata.mood} ${inferredTempo}`
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    // Generate and store embedding with retry logic
    let embedding
    let retries = 5 // Increased retries
    while (retries > 0) {
      try {
        embedding = await getEmbedding(embeddingText)
        break
      } catch (error: any) {
        retries--
        if ((error.message.includes("Rate limited") || error.message.includes("Model is loading")) && retries > 0) {
          const waitTime = error.message.includes("Model is loading") ? 15000 : 5000
          console.log(
            `⏳ ${error.message.includes("Model is loading") ? "Model loading" : "Rate limited"}, waiting ${waitTime / 1000} seconds... (${retries} retries left)`,
          )
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        } else {
          console.error(`❌ Failed to get embedding after retries: ${error.message}`)
          break // Skip this song and continue
        }
      }
    }

    if (embedding) {
      await storeSongEmbedding(trackId, embedding, songMetadata)
      console.log(
        `✅ [${index + 1}] Processed: "${songMetadata.track_name}" by ${songMetadata.artist_name} (${songMetadata.genre})`,
      )
    } else {
      console.log(
        `⚠️ [${index + 1}] Stored in DB only: "${songMetadata.track_name}" by ${songMetadata.artist_name} (embedding failed)`,
      )
    }
  } catch (error) {
    console.error(`❌ Error processing song ${index + 1}:`, error)
    // Continue processing other songs even if one fails
  }
}

async function main() {
  try {
    console.log("🎵 Starting CSV ingestion process...")

    // Load CSV data
    const csvPath = path.join(process.cwd(), "data", "genres_v2.csv")
    console.log(`📂 Looking for CSV file at: ${csvPath}`)

    // Check if file exists and get file info
    if (fs.existsSync(csvPath)) {
      const stats = fs.statSync(csvPath)
      console.log(`📊 File size: ${stats.size} bytes`)
      console.log(`📊 File modified: ${stats.mtime}`)
    } else {
      console.error(`❌ CSV file not found at: ${csvPath}`)
      return
    }

    const songs = await loadCSV(csvPath)

    if (songs.length === 0) {
      console.log("⚠️ No valid songs found in CSV file")
      return
    }

    console.log(`📊 Processing ${songs.length} songs...`)
    console.log(`💡 Note: Since your CSV doesn't have artist names, using genre-based artist names`)

    // Process songs in smaller batches with longer delays to avoid rate limits
    const batchSize = 3 // Much smaller batch size
    for (let i = 0; i < songs.length; i += batchSize) {
      const batch = songs.slice(i, i + batchSize)

      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(songs.length / batchSize)}`)

      // Process batch sequentially to avoid overwhelming the API
      for (let j = 0; j < batch.length; j++) {
        await processAndStoreSong(batch[j], i + j)

        // Add delay between each song to respect rate limits
        if (j < batch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay between songs
        }
      }

      // Add longer delay between batches
      if (i + batchSize < songs.length) {
        console.log("⏳ Waiting 10 seconds before next batch...")
        await new Promise((resolve) => setTimeout(resolve, 10000)) // 10 second delay between batches
      }
    }

    console.log("🎉 CSV ingestion completed successfully!")
    console.log("📈 Summary:")
    console.log(`   - Total songs processed: ${songs.length}`)
    console.log("   - Data stored in database and vector store")
    console.log("   - Mood and tempo inferred from audio features")
  } catch (error) {
    console.error("💥 Ingestion failed:", error)
    process.exit(1)
  }
}

// Run the ingestion
main()

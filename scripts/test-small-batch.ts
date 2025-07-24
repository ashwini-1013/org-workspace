import "dotenv/config"
import fs from "fs"
import path from "path"
import csv from "csv-parser"
import { storeSongMetadata } from "../libs/database/src/lib/database"
import { storeSongEmbedding, getEmbedding } from "../libs/vector-service/src/lib/vector-store"

// Test with just 5 songs first
async function testSmallBatch() {
  try {
    console.log("🧪 Testing with small batch of songs...")

    const csvPath = path.join(process.cwd(), "data", "genres_v2.csv")
    const songs: any[] = []

    // Read only first 5 songs
    await new Promise((resolve, reject) => {
      let count = 0
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on("data", (data) => {
          if (count < 5) {
            const trackName = data.song_name || data.track_name || data.title
            if (trackName) {
              songs.push({
                track_id: `test_${count}`,
                track_name: trackName,
                artist_name: `${data.genre} Artist`,
                genre: data.genre || "unknown",
                mood: "test",
                tempo: "medium",
                energy: Number.parseFloat(data.energy) || 0.5,
                danceability: Number.parseFloat(data.danceability) || 0.5,
                valence: Number.parseFloat(data.valence) || 0.5,
              })
              count++
            }
          }
        })
        .on("end", resolve)
        .on("error", reject)
    })

    console.log(`📊 Testing with ${songs.length} songs`)

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i]
      console.log(`\n🔄 Processing song ${i + 1}: "${song.track_name}"`)

      try {
        // Test database storage
        await storeSongMetadata(song)
        console.log(`✅ Database: Stored "${song.track_name}"`)

        // Test embedding generation
        const embeddingText = `${song.track_name} ${song.genre} ${song.mood}`
        const embedding = await getEmbedding(embeddingText)
        console.log(`✅ Embedding: Generated ${embedding.length} dimensions`)

        // Test vector storage
        await storeSongEmbedding(song.track_id, embedding, song)
        console.log(`✅ Vector: Stored embedding for "${song.track_name}"`)

        // Wait between songs
        if (i < songs.length - 1) {
          console.log("⏳ Waiting 3 seconds...")
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      } catch (error) {
        console.error(`❌ Error with song ${i + 1}:`, error)
      }
    }

    console.log("\n🎉 Small batch test completed!")
  } catch (error) {
    console.error("💥 Test failed:", error)
  }
}

testSmallBatch()

import { type NextRequest, NextResponse } from "next/server"
import { extractMetadataWithGroq, generateRecommendationWithGroq } from "@org-workspace/ai-service"
import { searchSimilarSongs } from "@org-workspace/vector-service"
import { searchSongsByMetadata } from "@org-workspace/database"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Please describe what kind of song you want" }, { status: 400 })
    }

    console.log("🎵 Processing request:", prompt)

    const metadata = await extractMetadataWithGroq(prompt)
    console.log("📊 Extracted metadata:", metadata)

    let similarSongs: any[] = []
    try {
      similarSongs = await searchSimilarSongs(prompt, metadata.genre)
      console.log("🔍 Found similar songs:", similarSongs.length)
    } catch (error) {
      console.log("⚠️ Vector search failed, continuing with database search")
    }

    let genreSongs: any[] = []
    try {
      genreSongs = await searchSongsByMetadata(metadata.genre, metadata.mood, metadata.tempo, 15)
      console.log("🎼 Database songs:", genreSongs.length)
    } catch (error) {
      console.log("⚠️ Database search failed, using fallback")
    }

    const allSongs = [...similarSongs, ...genreSongs]
    const uniqueSongs = allSongs
      .filter((song, index, self) => index === self.findIndex((s) => s.track_id === song.track_id))
      .slice(0, 10)

    if (uniqueSongs.length === 0) {
      return NextResponse.json({
        recommendation:
          "I couldn't find specific matches, but I'd recommend exploring some popular songs in your preferred genre!",
        metadata,
        songsFound: 0,
      })
    }

    const recommendation = await generateRecommendationWithGroq(prompt, uniqueSongs, metadata)

    return NextResponse.json({
      recommendation,
      metadata,
      songsFound: uniqueSongs.length,
    })
  } catch (error) {
    console.error("❌ Recommendation API Error:", error)
    return NextResponse.json(
      {
        error: "Music recommendation service is currently unavailable",
        suggestion: "Try again later or be more specific in your request",
      },
      { status: 500 },
    )
  }
}

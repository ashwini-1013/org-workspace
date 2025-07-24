import { NextResponse } from "next/server"
import { getSongStats, getAllGenres } from "@org-workspace/database"

export async function GET() {
  try {
    const [stats, genres] = await Promise.all([getSongStats(), getAllGenres()])

    return NextResponse.json({
      ...stats,
      availableGenres: genres.slice(0, 10),
      totalGenresAvailable: genres.length,
    })
  } catch (error) {
    console.error("Stats API Error:", error)
    return NextResponse.json({ error: "Unable to fetch statistics" }, { status: 500 })
  }
}

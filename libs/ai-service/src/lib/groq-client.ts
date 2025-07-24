import Groq from "groq-sdk"

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY environment variable is required")
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface SongMetadata {
  genre?: string
  mood?: string
  tempo?: string
  instruments?: string
  era?: string
  energy?: string
}

export async function extractMetadataWithGroq(prompt: string): Promise<SongMetadata> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a music expert. Extract song metadata from user requests and return ONLY a JSON object with these fields:
          - genre: main music genre (e.g., "pop", "rock", "jazz", "hip-hop", "electronic", "country", "r&b", "classical", "folk", "reggae")
          - mood: emotional tone (e.g., "happy", "sad", "energetic", "calm", "romantic", "melancholic", "angry", "peaceful")
          - tempo: speed (e.g., "slow", "medium", "fast", "upbeat")
          - instruments: key instruments mentioned (e.g., "piano", "guitar", "drums", "violin")
          - era: time period if mentioned (e.g., "80s", "90s", "2000s", "modern", "classic")
          - energy: energy level (e.g., "low", "medium", "high")
          
          Return only valid JSON, no explanations.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.3,
      max_tokens: 200,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from Groq")
    }

    const metadata = JSON.parse(response.trim())
    return metadata
  } catch (error) {
    console.error("Error extracting metadata with Groq:", error)
    return {
      genre: extractGenreFromText(prompt),
      mood: extractMoodFromText(prompt),
      tempo: extractTempoFromText(prompt),
    }
  }
}

export async function generateRecommendationWithGroq(
  prompt: string,
  songs: any[],
  metadata: SongMetadata,
): Promise<string> {
  try {
    const songsText = songs
      .map((song) => `• "${song.track_name}" by ${song.artist_name} (${song.genre || "Unknown genre"})`)
      .join("\n")

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional music curator and DJ. Create personalized song recommendations based on user preferences and a curated list of matching songs.

          Guidelines:
          - Present 3-5 top recommendations with brief explanations
          - Include artist name, song title, and why it matches their request
          - Use engaging, friendly language
          - Group similar songs or mention alternatives
          - Add emoji for visual appeal
          - Keep recommendations concise but informative`,
        },
        {
          role: "user",
          content: `User Request: "${prompt}"

          Detected Preferences:
          - Genre: ${metadata.genre || "Not specified"}
          - Mood: ${metadata.mood || "Not specified"}
          - Tempo: ${metadata.tempo || "Not specified"}
          - Instruments: ${metadata.instruments || "Not specified"}

          Available Songs:
          ${songsText}

          Please create a personalized recommendation response.`,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 500,
    })

    return completion.choices[0]?.message?.content || "Unable to generate recommendations at this time."
  } catch (error) {
    console.error("Error generating recommendation with Groq:", error)

    const topSongs = songs.slice(0, 3)
    return `Based on your request, here are some great matches:\n\n${topSongs
      .map((song, i) => `${i + 1}. "${song.track_name}" by ${song.artist_name}`)
      .join(
        "\n",
      )}\n\nThese songs should match your ${metadata.mood || "desired"} mood and ${metadata.genre || "preferred"} style!`
  }
}

function extractGenreFromText(text: string): string | undefined {
  const genres = ["pop", "rock", "jazz", "hip-hop", "electronic", "country", "r&b", "classical", "folk", "reggae"]
  const lowerText = text.toLowerCase()
  return genres.find((genre) => lowerText.includes(genre))
}

function extractMoodFromText(text: string): string | undefined {
  const moods = ["happy", "sad", "energetic", "calm", "romantic", "melancholic", "upbeat", "chill", "angry", "peaceful"]
  const lowerText = text.toLowerCase()
  return moods.find((mood) => lowerText.includes(mood))
}

function extractTempoFromText(text: string): string | undefined {
  const lowerText = text.toLowerCase()
  if (lowerText.includes("fast") || lowerText.includes("upbeat") || lowerText.includes("energetic")) return "fast"
  if (lowerText.includes("slow") || lowerText.includes("calm") || lowerText.includes("chill")) return "slow"
  return "medium"
}

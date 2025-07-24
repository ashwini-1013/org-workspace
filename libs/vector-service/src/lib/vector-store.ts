import { Pinecone } from "@pinecone-database/pinecone"

if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
  throw new Error("Pinecone environment variables are required")
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

const index = pinecone.Index(process.env.PINECONE_INDEX_NAME)

export async function storeSongEmbedding(id: string, vector: number[], metadata: Record<string, any>) {
  try {
    await index.upsert([
      {
        id,
        values: vector,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    ])
    console.log(`✅ Stored embedding for: ${metadata.track_name}`)
  } catch (error) {
    console.error("Error storing embedding:", error)
    throw error
  }
}

export async function searchSimilarSongs(query: string, genre?: string, topK = 5): Promise<any[]> {
  try {
    const queryEmbedding = await getEmbedding(query)
    const filter = genre ? { genre: { $eq: genre } } : undefined

    const queryResult = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter,
    })

    return (queryResult.matches || [])
      .filter((match) => match.score && match.score > 0.7)
      .map((match) => ({
        ...match.metadata,
        similarity_score: match.score,
      }))
  } catch (error) {
    console.error("Error searching similar songs:", error)
    return []
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const cleanText = text
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    if (!cleanText) throw new Error("Empty text")

    const embedding = generateSimpleEmbedding(cleanText)
    console.log(`✅ Generated embedding for: "${cleanText.substring(0, 50)}..."`)
    return embedding
  } catch (error) {
    console.error("Error getting embedding:", error)
    throw error
  }
}

function generateSimpleEmbedding(text: string): number[] {
  const dimension = 384
  const embedding = new Array(dimension).fill(0)

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    const index = (charCode * (i + 1)) % dimension
    embedding[index] += Math.sin(charCode * 0.1) * 0.1
  }

  const lowerText = text.toLowerCase()
  if (lowerText.includes("rock")) {
    for (let i = 0; i < 50; i++) embedding[i] += 0.2
  }
  if (lowerText.includes("pop")) {
    for (let i = 50; i < 100; i++) embedding[i] += 0.2
  }
  if (lowerText.includes("sad")) {
    for (let i = 100; i < 150; i++) embedding[i] += 0.3
  }
  if (lowerText.includes("happy")) {
    for (let i = 150; i < 200; i++) embedding[i] += 0.3
  }

  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0))
}

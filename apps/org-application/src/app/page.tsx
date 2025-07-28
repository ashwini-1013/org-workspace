"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Music, Search, Sparkles } from "lucide-react"
import { StatsDashboard } from "./components/stats-dashboard"

export default function SongAssistantPage() {
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [metadata, setMetadata] = useState<any>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setResponse("")
    setMetadata(null)

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      if (data.error) {
        setResponse(data.error)
      } else {
        setResponse(data.recommendation)
        setMetadata(data.metadata)
      }
    } catch (error) {
      setResponse("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const examplePrompts = [
    "I want top 5 dark trap songs to listen",
    "I want to listen to songs like troll under bridge",
    "I want to listen to song like i'm in paris",
    "I want songs like dreams",
    "I want to listen to the killer pop music",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#1DB954]/10 to-[#191414] text-white">
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-8 h-8 text-green-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
              AI Song Recommender
            </h1>
            <Sparkles className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-gray-800 text-lg">Describe your mood, and let AI find the perfect song for you</p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <StatsDashboard />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1DB954]/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-green-500/20"
          >
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., I want a sad romantic song with piano and emotional vocals"
                  className="w-full pl-12 pr-4 py-4 bg-[#121212] text-white rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 placeholder:text-gray-400 text-lg"
                  onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading || !prompt.trim()}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-green-500/25"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : (
                  "Find Songs"
                )}
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-3">💡 Try these examples:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {examplePrompts.slice(0, 4).map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    className="text-left p-3 bg-[#121212] rounded-lg border border-gray-700 hover:border-green-500/50 transition-colors text-sm text-gray-300 hover:text-white"
                  >
                   {example}
                  </button>
                ))}
              </div>
            </div>

            {metadata && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 p-4 bg-[#121212] rounded-xl border border-gray-700"
              >
                <h3 className="text-green-400 font-semibold mb-2">🎯 Detected Preferences:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {metadata.genre && (
                    <div className="bg-green-500/20 px-3 py-1 rounded-full">
                      <span className="text-green-300">Genre: {metadata.genre}</span>
                    </div>
                  )}
                  {metadata.mood && (
                    <div className="bg-blue-500/20 px-3 py-1 rounded-full">
                      <span className="text-blue-300">Mood: {metadata.mood}</span>
                    </div>
                  )}
                  {metadata.tempo && (
                    <div className="bg-purple-500/20 px-3 py-1 rounded-full">
                      <span className="text-purple-300">Tempo: {metadata.tempo}</span>
                    </div>
                  )}
                  {metadata.instruments && (
                    <div className="bg-orange-500/20 px-3 py-1 rounded-full">
                      <span className="text-orange-300">Instruments: {metadata.instruments}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {response && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#121212] rounded-xl p-6 border border-gray-700 shadow-inner"
              >
                <h2 className="font-semibold text-xl mb-4 text-green-400 flex items-center gap-2">
                  🎧 Your Personalized Recommendations:
                </h2>
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-100 leading-relaxed">{response}</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

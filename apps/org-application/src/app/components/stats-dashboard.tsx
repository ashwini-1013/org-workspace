"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Music, Users, Disc, TrendingUp } from "lucide-react"

interface Stats {
  totalSongs: number
  totalGenres: number
  totalArtists: number
  availableGenres: string[]
  totalGenresAvailable: number
}

export function StatsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error fetching stats:", error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#1DB954]/10 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded mb-2"></div>
            <div className="h-8 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      icon: Music,
      label: "Total Songs",
      value: stats.totalSongs.toLocaleString(),
      color: "text-green-800",
    },
    {
      icon: Disc,
      label: "Genres",
      value: stats.totalGenres.toString(),
      color: "text-blue-800",
    },
    {
      icon: Users,
      label: "Artists",
      value: stats.totalArtists.toLocaleString(),
      color: "text-purple-800",
    },
    {
      icon: TrendingUp,
      label: "Database Health",
      value: "Excellent",
      color: "text-orange-800",
    },
  ]

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#1DB954]/10 rounded-xl p-6 border border-green-500/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-800 text-sm">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {stats.availableGenres.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-[#121212] rounded-xl p-4 border border-gray-700"
        >
          <h3 className="text-green-400 font-semibold mb-3">🎵 Popular Genres in Database:</h3>
          <div className="flex flex-wrap gap-2">
            {stats.availableGenres.map((genre) => (
              <span key={genre} className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                {genre}
              </span>
            ))}
            {stats.totalGenresAvailable > stats.availableGenres.length && (
              <span className="text-gray-400 px-3 py-1 text-sm">
                +{stats.totalGenresAvailable - stats.availableGenres.length} more
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

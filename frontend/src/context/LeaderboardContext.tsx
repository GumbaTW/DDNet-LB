import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { LeaderboardEntry } from '../types/leaderboard'
import type { LeaderboardResponse } from '../types/api'
import { dummyLeaderboard } from '../data/dummyLeaderboard'

const LEADERBOARD_URL = `${import.meta.env.BASE_URL}leaderboard.json`

interface LeaderboardContextValue {
  entries: LeaderboardEntry[]
  generatedAt: string | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const LeaderboardContext = createContext<LeaderboardContextValue | null>(null)

export function LeaderboardProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(dummyLeaderboard)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(LEADERBOARD_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: LeaderboardResponse = await res.json()
      if (data.schemaVersion !== 1 && data.schemaVersion !== 2) {
        throw new Error(`Unknown schema version: ${data.schemaVersion}`)
      }
      setEntries(data.entries)
      setGeneratedAt(data.generatedAt ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leaderboard')
      setEntries(dummyLeaderboard)
      setGeneratedAt(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo<LeaderboardContextValue>(
    () => ({ entries, generatedAt, loading, error, refetch: load }),
    [entries, generatedAt, loading, error, load]
  )

  useEffect(() => {
    load()
  }, [load])

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  )
}

export function useLeaderboard(): LeaderboardContextValue {
  const ctx = useContext(LeaderboardContext)
  if (!ctx) throw new Error('useLeaderboard must be used within LeaderboardProvider')
  return ctx
}

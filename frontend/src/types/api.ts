import type { LeaderboardEntry } from './leaderboard'

/** Response from /leaderboard.json (or future API). Schema versioned for compatibility. */
export interface LeaderboardResponse {
  schemaVersion: number
  generatedAt: string
  entries: LeaderboardEntry[]
}

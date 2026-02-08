export type PointsSortKey = 'completionPoints' | 'teamRankPoints' | 'rankPoints'

export interface LeaderboardEntry {
  rank: number
  name: string
  points: number
  region: string
  /** Completion points (stars×mult+offset per map, once per map). Schema v2. */
  completionPoints?: number
  /** Team rank points (1st=25 … 10th=1 per map). Schema v2. */
  teamRankPoints?: number
  /** Solo rank points (1st=25 … 10th=1 per map). Schema v2. */
  rankPoints?: number
}

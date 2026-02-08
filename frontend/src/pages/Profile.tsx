import { useParams, Link } from 'react-router-dom'
import type { LeaderboardEntry } from '../types/leaderboard'
import { useLeaderboard } from '../context/LeaderboardContext'
import styles from './Profile.module.css'

function getRegionalRank(entries: LeaderboardEntry[], playerName: string): number | null {
  const entry = entries.find((e) => e.name === playerName)
  if (!entry) return null
  const inRegion = entries
    .filter((e) => e.region === entry.region)
    .sort((a, b) => b.points - a.points)
  const index = inRegion.findIndex((e) => e.name === playerName)
  return index === -1 ? null : index + 1
}

export function Profile() {
  const { name } = useParams<{ name: string }>()
  const { entries } = useLeaderboard()
  const decodedName = name ? decodeURIComponent(name) : ''
  const entry = entries.find((e) => e.name === decodedName)
  const regionalRank = entry ? getRegionalRank(entries, entry.name) : null

  if (!decodedName) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>No player specified.</p>
        <Link to="/" className={styles.back}>← Back to leaderboard</Link>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>Player &quot;{decodedName}&quot; not found.</p>
        <Link to="/" className={styles.back}>← Back to leaderboard</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>← Back to leaderboard</Link>
      <div className={styles.card}>
        <h1 className={styles.playerName}>{entry.name}</h1>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Global rank</dt>
            <dd>#{entry.rank}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Rank in {entry.region}</dt>
            <dd>#{regionalRank ?? '—'}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Total points</dt>
            <dd>{entry.points.toLocaleString()}</dd>
          </div>
          {entry.completionPoints != null && (
            <>
              <div className={styles.stat}>
                <dt>Completion</dt>
                <dd>{entry.completionPoints.toLocaleString()}</dd>
              </div>
              <div className={styles.stat}>
                <dt>Team rank</dt>
                <dd>{(entry.teamRankPoints ?? 0).toLocaleString()}</dd>
              </div>
              <div className={styles.stat}>
                <dt>Rank</dt>
                <dd>{(entry.rankPoints ?? 0).toLocaleString()}</dd>
              </div>
            </>
          )}
          <div className={styles.stat}>
            <dt>Region</dt>
            <dd><span className={styles.regionBadge}>{entry.region}</span></dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

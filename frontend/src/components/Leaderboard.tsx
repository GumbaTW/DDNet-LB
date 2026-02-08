import { Link } from 'react-router-dom'
import type { LeaderboardEntry, PointsSortKey } from '../types/leaderboard'
import styles from './Leaderboard.module.css'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  sortKey: PointsSortKey
  onSortKeyChange: (key: PointsSortKey) => void
}

const SORT_COLUMNS: { key: PointsSortKey; label: string }[] = [
  { key: 'completionPoints', label: 'Completion' },
  { key: 'teamRankPoints', label: 'Team rank' },
  { key: 'rankPoints', label: 'Rank' },
]

function RankBadge({ rank }: { rank: number }) {
  const tier = rank <= 3 ? ['gold', 'silver', 'bronze'][rank - 1] : undefined
  return (
    <span className={`${styles.rank} ${tier ? styles[`rank--${tier}`] : ''}`}>
      #{rank}
    </span>
  )
}

export function Leaderboard({ entries, sortKey, onSortKeyChange }: LeaderboardProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thRank}>Rank</th>
            <th className={styles.thName}>Name</th>
            {SORT_COLUMNS.map(({ key, label }) => (
              <th key={key} className={styles.thPoints}>
                <button
                  type="button"
                  className={styles.sortButton}
                  onClick={() => onSortKeyChange(key)}
                  aria-pressed={sortKey === key}
                >
                  {label}
                  {sortKey === key && <span className={styles.sortIcon} aria-hidden> ↓</span>}
                </button>
              </th>
            ))}
            <th className={styles.thRegion}>Region</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.rank} className={styles.row}>
              <td className={styles.tdRank}>
                <RankBadge rank={entry.rank} />
              </td>
              <td className={styles.tdName}>
                <Link to={`/player/${encodeURIComponent(entry.name)}`} className={styles.nameLink}>
                  {entry.name}
                </Link>
              </td>
              <td className={styles.tdPoints}>{(entry.completionPoints ?? 0).toLocaleString()}</td>
              <td className={styles.tdPoints}>{(entry.teamRankPoints ?? 0).toLocaleString()}</td>
              <td className={styles.tdPoints}>{(entry.rankPoints ?? 0).toLocaleString()}</td>
              <td className={styles.tdRegion}>
                <span className={styles.regionBadge}>{entry.region}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

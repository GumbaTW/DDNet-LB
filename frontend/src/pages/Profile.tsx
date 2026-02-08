import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { LeaderboardEntry } from '../types/leaderboard'
import { useLeaderboard } from '../context/LeaderboardContext'
import { useProfiles } from '../context/ProfilesContext'
import { ProfileCategorySection } from '../components/ProfileCategorySection'
import styles from './Profile.module.css'

const CATEGORY_ORDER = ['Novice', 'Moderate', 'Brutal', 'Insane', 'Dummy', 'Oldschool', 'Solo', 'Race', 'Event']

function getRegionalRank(entries: LeaderboardEntry[], playerName: string): number | null {
  const entry = entries.find((e) => e.name === playerName)
  if (!entry) return null
  const sortValue = (e: LeaderboardEntry) => e.completionPoints ?? e.points ?? 0
  const inRegion = entries
    .filter((e) => e.region === entry.region)
    .sort((a, b) => sortValue(b) - sortValue(a))
  const index = inRegion.findIndex((e) => e.name === playerName)
  return index === -1 ? null : index + 1
}

export function Profile() {
  const { name } = useParams<{ name: string }>()
  const { entries } = useLeaderboard()
  const { profiles, mapsByCategory, loading: profilesLoading, loadPlayer, error: profileError } = useProfiles()
  const decodedName = name ? decodeURIComponent(name) : ''
  const entry = entries.find((e) => e.name === decodedName)
  const regionalRank = entry ? getRegionalRank(entries, entry.name) : null
  const playerProfile = decodedName ? profiles[decodedName] : null

  useEffect(() => {
    if (decodedName && entry) loadPlayer(decodedName)
  }, [decodedName, entry, loadPlayer])

  const categoryNames = playerProfile
    ? [...Object.keys(playerProfile)].sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a)
        const ib = CATEGORY_ORDER.indexOf(b)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.localeCompare(b)
      })
    : []

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
        {profileError && (
          <p className={styles.error}>Map data: {profileError}</p>
        )}
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Global rank</dt>
            <dd>#{entry.rank}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Rank in {entry.region.toUpperCase()}</dt>
            <dd>#{regionalRank ?? '—'}</dd>
          </div>
          {entry.completionPoints != null && (
            <>
              <div className={styles.stat}>
                <dt>Points (Completion)</dt>
                <dd>{entry.completionPoints.toLocaleString()}</dd>
              </div>
              <div className={styles.stat}>
                <dt>Team Rank Points</dt>
                <dd>{(entry.teamRankPoints ?? 0).toLocaleString()}</dd>
              </div>
              <div className={styles.stat}>
                <dt>Rank Points</dt>
                <dd>{(entry.rankPoints ?? 0).toLocaleString()}</dd>
              </div>
            </>
          )}
          <div className={styles.stat}>
            <dt>Region</dt>
            <dd><span className={styles.regionBadge}>{entry.region}</span></dd>
          </div>
        </dl>
        {profilesLoading && (
          <p className={styles.profilesLoading}>Loading map data…</p>
        )}
        {!profilesLoading && playerProfile && categoryNames.length > 0 && (
          <div className={styles.categories}>
            <h2 className={styles.categoriesTitle}>Maps by category</h2>
            {categoryNames.map((cat) => (
              <ProfileCategorySection
                key={cat}
                category={cat}
                data={playerProfile[cat]}
                allMapsInCategory={mapsByCategory?.[cat] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

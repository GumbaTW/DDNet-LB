import { useMemo, useState } from 'react'
import type { LeaderboardEntry, PointsSortKey } from '../types/leaderboard'
import { Leaderboard } from '../components/Leaderboard'
import { RegionFilter } from '../components/RegionFilter'
import styles from './LeaderboardPage.module.css'

function getUniqueRegions(entries: LeaderboardEntry[]): string[] {
  const set = new Set(entries.map((e) => e.region))
  return Array.from(set).sort()
}

function filterAndRerank(
  entries: LeaderboardEntry[],
  region: string | null,
  sortKey: PointsSortKey
): LeaderboardEntry[] {
  const filtered = region
    ? entries.filter((e) => e.region === region)
    : [...entries]

  const getSortValue = (e: LeaderboardEntry) => e[sortKey] ?? 0
  const sorted = [...filtered].sort((a, b) => getSortValue(b) - getSortValue(a))

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))
}

interface LeaderboardPageProps {
  entries: LeaderboardEntry[]
  loading?: boolean
  error?: string | null
}

export function LeaderboardPage({ entries, loading, error }: LeaderboardPageProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<PointsSortKey>('completionPoints')

  const regions = useMemo(() => getUniqueRegions(entries), [entries])
  const displayedEntries = useMemo(
    () => filterAndRerank(entries, selectedRegion, sortKey),
    [entries, selectedRegion, sortKey]
  )

  return (
    <div className={styles.page}>
      {error && <p className={styles.error}>{error}</p>}
      <RegionFilter
        regions={regions}
        selected={selectedRegion}
        onSelect={setSelectedRegion}
      />
      {loading ? (
        <p className={styles.loading}>Loading leaderboard…</p>
      ) : (
        <Leaderboard
          entries={displayedEntries}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
        />
      )}
    </div>
  )
}

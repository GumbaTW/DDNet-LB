import { useState, useMemo } from 'react'
import type { ProfileCategory as ProfileCategoryType, ProfileMapSortKey, MapInCategory } from '../types/profile'
import styles from './ProfileCategorySection.module.css'

interface ProfileCategorySectionProps {
  category: string
  data: ProfileCategoryType
  allMapsInCategory?: MapInCategory[] | null
}

const SORT_KEYS: { key: ProfileMapSortKey; label: string }[] = [
  { key: 'map', label: 'Map' },
  { key: 'points', label: 'Points' },
  { key: 'rankTime', label: 'Rank' },
  { key: 'teamRankTime', label: 'Team rank' },
  { key: 'finishes', label: 'Finishes' },
  { key: 'firstFinish', label: 'First finish' },
]

function formatTime(t: number | null): string {
  if (t == null) return '—'
  if (t >= 60) {
    const m = Math.floor(t / 60)
    const s = (t % 60).toFixed(2)
    return `${m}:${s.padStart(5, '0')}`
  }
  return t.toFixed(2) + 's'
}

function formatFirstFinish(ts: string | null): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ts
  }
}

export function ProfileCategorySection({ category, data, allMapsInCategory }: ProfileCategorySectionProps) {
  const [open, setOpen] = useState(false)
  const [unfinishedOpen, setUnfinishedOpen] = useState(false)
  const [sortKey, setSortKey] = useState<ProfileMapSortKey>('map')
  const [sortAsc, setSortAsc] = useState(true)

  const finishedSet = useMemo(() => new Set(data.maps.map((m) => m.map)), [data.maps])
  const unfinishedMaps = useMemo(() => {
    if (!allMapsInCategory?.length) return []
    return allMapsInCategory.filter((m) => !finishedSet.has(m.map))
  }, [allMapsInCategory, finishedSet])

  const sortedMaps = useMemo(() => {
    const arr = [...data.maps]
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp = 0
      if (av == null && bv == null) cmp = 0
      else if (av == null) cmp = 1
      else if (bv == null) cmp = -1
      else if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv)
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      return sortAsc ? cmp : -cmp
    })
    return arr
  }, [data.maps, sortKey, sortAsc])

  const handleSort = (key: ProfileMapSortKey) => {
    if (sortKey === key) setSortAsc((a) => !a)
    else {
      setSortKey(key)
      setSortAsc(key === 'map' || key === 'firstFinish')
    }
  }

  const progress = data.totalMaps > 0 ? (100 * data.finished) / data.totalMaps : 0

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={styles.categoryName}>{category}</span>
        <span className={styles.progressLabel}>
          {data.finished}/{data.totalMaps} finished
        </span>
        <span className={styles.chevron} aria-hidden>{open ? '▼' : '▶'}</span>
      </button>
      <div className={styles.progressBarWrap}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>
      {open && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {SORT_KEYS.map(({ key, label }) => (
                    <th key={key} className={styles.th}>
                      <button
                        type="button"
                        className={styles.sortBtn}
                        onClick={() => handleSort(key)}
                        aria-sort={sortKey === key ? (sortAsc ? 'ascending' : 'descending') : undefined}
                      >
                        {label}
                        {sortKey === key && <span className={styles.sortIcon}>{sortAsc ? ' ↑' : ' ↓'}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedMaps.map((row) => (
                  <tr key={row.map} className={styles.row}>
                    <td className={styles.td}>{row.map}</td>
                    <td className={styles.tdNum}>{row.points.toLocaleString()}</td>
                    <td className={styles.tdNum}>{formatTime(row.rankTime)}</td>
                    <td className={styles.tdNum}>{formatTime(row.teamRankTime)}</td>
                    <td className={styles.tdNum}>{row.finishes}</td>
                    <td className={styles.td}>{formatFirstFinish(row.firstFinish)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {unfinishedMaps.length > 0 && (
            <div className={styles.unfinishedBlock}>
              <button
                type="button"
                className={styles.unfinishedHeader}
                onClick={() => setUnfinishedOpen((o) => !o)}
                aria-expanded={unfinishedOpen}
              >
                <span className={styles.unfinishedTitle}>Unfinished</span>
                <span className={styles.unfinishedCount}>{unfinishedMaps.length} maps</span>
                <span className={styles.chevron} aria-hidden>{unfinishedOpen ? '▼' : '▶'}</span>
              </button>
              {unfinishedOpen && (
                <div className={styles.tableWrap}>
                  <table className={`${styles.table} ${styles.tableUnfinished}`}>
                    <thead>
                      <tr>
                        {SORT_KEYS.map(({ key, label }) => (
                          <th key={key} className={styles.th}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...unfinishedMaps]
                        .sort((a, b) => a.map.localeCompare(b.map))
                        .map((row) => (
                          <tr key={row.map} className={styles.rowUnfinished}>
                            <td className={styles.td}>{row.map}</td>
                            <td className={styles.tdNum}>{row.points.toLocaleString()}</td>
                            <td className={styles.tdNum}>—</td>
                            <td className={styles.tdNum}>—</td>
                            <td className={styles.tdNum}>—</td>
                            <td className={styles.td}>—</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

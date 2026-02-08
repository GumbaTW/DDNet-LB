import { useRef, useState } from 'react'
import styles from './RegionFilter.module.css'

const PRIORITY_REGIONS = ['GER', 'POL', 'RUS', 'CHN']

interface RegionFilterProps {
  regions: string[]
  selected: string | null
  onSelect: (region: string | null) => void
}

export function RegionFilter({ regions, selected, onSelect }: RegionFilterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const priority = regions.filter((r) => PRIORITY_REGIONS.includes(r))
  const other = regions.filter((r) => !PRIORITY_REGIONS.includes(r)).sort()

  return (
    <div className={styles.wrapper} role="group" aria-label="Filter by region">
      <button
        type="button"
        className={`${styles.pill} ${selected === null ? styles.pillActive : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {priority.map((region) => (
        <button
          key={region}
          type="button"
          className={`${styles.pill} ${selected === region ? styles.pillActive : ''}`}
          onClick={() => onSelect(region)}
        >
          {region}
        </button>
      ))}
      {other.length > 0 && (
        <div className={styles.dropdownWrap} ref={dropdownRef}>
          <button
            type="button"
            className={`${styles.pill} ${styles.pillDropdown} ${selected && other.includes(selected) ? styles.pillActive : ''}`}
            onClick={() => setDropdownOpen((o) => !o)}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            More {dropdownOpen ? '▲' : '▼'}
          </button>
          {dropdownOpen && (
            <>
              <div className={styles.dropdownBackdrop} aria-hidden onClick={() => setDropdownOpen(false)} />
              <ul className={styles.dropdownList} role="listbox">
                {other.map((region) => (
                  <li key={region} role="option" aria-selected={selected === region}>
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => { onSelect(region); setDropdownOpen(false) }}
                    >
                      {region}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

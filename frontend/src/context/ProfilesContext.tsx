import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { PlayerProfile, ProfileMapRow, MapsByCategory } from '../types/profile'
import { playerNameToProfilePath } from '../lib/profileUrl'

const DDNET_PLAYER_API = 'https://ddnet.org/players/'

interface ProfilesContextValue {
  profiles: Record<string, PlayerProfile>
  mapsByCategory: MapsByCategory | null
  loading: boolean
  error: string | null
  loadPlayer: (name: string) => Promise<void>
  loadMapsByCategory: () => Promise<void>
}

const ProfilesContext = createContext<ProfilesContextValue | null>(null)

const BASE = import.meta.env.BASE_URL

/** DDNet API map entry (subset we use) */
interface DDNetMapEntry {
  points?: number
  finishes?: number
  time?: number
  first_finish?: number
  team_rank?: number | null
  rank?: number | null
}

/** DDNet API types[category] (subset we use) */
interface DDNetTypeEntry {
  maps?: Record<string, DDNetMapEntry>
}

/** DDNet API response (subset we use) */
interface DDNetPlayerResponse {
  player?: string
  types?: Record<string, DDNetTypeEntry>
}

function parseProfileJson(text: string): PlayerProfile {
  const data = JSON.parse(text) as { schemaVersion?: number; profile?: unknown }
  const profile = data?.profile
  if (!profile || typeof profile !== 'object') return {}
  return profile as PlayerProfile
}

/** Transform DDNet API response into our PlayerProfile shape */
function transformDDNetProfile(data: DDNetPlayerResponse): PlayerProfile {
  const types = data?.types
  if (!types || typeof types !== 'object') return {}

  const profile: PlayerProfile = {}
  for (const [category, typeEntry] of Object.entries(types)) {
    const mapsObj = typeEntry?.maps
    if (!mapsObj || typeof mapsObj !== 'object') continue

    const rows: ProfileMapRow[] = []
    for (const [mapName, entry] of Object.entries(mapsObj)) {
      const finishes = Number(entry?.finishes ?? 0)
      if (finishes === 0) continue
      const firstFinish = entry?.first_finish != null
        ? new Date(entry.first_finish * 1000).toISOString()
        : null
      rows.push({
        map: mapName,
        points: Number(entry?.points ?? 0),
        rankTime: entry?.time != null ? Number(entry.time) : null,
        teamRankTime: null,
        finishes,
        firstFinish,
      })
    }
    const totalMaps = Object.keys(mapsObj).length
    profile[category] = {
      totalMaps,
      finished: rows.length,
      maps: rows,
    }
  }
  return profile
}

export function ProfilesProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({})
  const [mapsByCategory, setMapsByCategory] = useState<MapsByCategory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef<Set<string>>(new Set())
  const mapsByCategoryLoadedRef = useRef(false)

  const loadMapsByCategory = useCallback(async () => {
    if (mapsByCategoryLoadedRef.current) return
    mapsByCategoryLoadedRef.current = true
    try {
      const res = await fetch(`${BASE}maps-by-category.json`)
      if (!res.ok) return
      const text = await res.text()
      const data = JSON.parse(text) as MapsByCategory
      setMapsByCategory(data)
    } catch {
      mapsByCategoryLoadedRef.current = false
    }
  }, [])

  const loadPlayer = useCallback(async (name: string) => {
    if (!name.trim()) return
    if (loadedRef.current.has(name)) return
    setLoading(true)
    setError(null)
    try {
      await loadMapsByCategory()
      const path = playerNameToProfilePath(name)
      const res = await fetch(`${BASE}profiles/${path}.json`)
      let profile: PlayerProfile
      if (res.ok) {
        const text = await res.text()
        profile = parseProfileJson(text)
      } else {
        const ddnetRes = await fetch(
          `${DDNET_PLAYER_API}?json2=${encodeURIComponent(name)}`,
          { mode: 'cors' }
        )
        if (!ddnetRes.ok) throw new Error(`Profile not found (${res.status})`)
        const ddnetData = (await ddnetRes.json()) as DDNetPlayerResponse
        profile = transformDDNetProfile(ddnetData)
        if (Object.keys(profile).length === 0) throw new Error('No map data from DDNet')
      }
      loadedRef.current.add(name)
      setProfiles((prev) => ({ ...prev, [name]: profile }))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load profile'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [loadMapsByCategory])

  const value = useMemo(
    () => ({ profiles, mapsByCategory, loading, error, loadPlayer, loadMapsByCategory }),
    [profiles, mapsByCategory, loading, error, loadPlayer, loadMapsByCategory]
  )

  return (
    <ProfilesContext.Provider value={value}>
      {children}
    </ProfilesContext.Provider>
  )
}

export function useProfiles(): ProfilesContextValue {
  const ctx = useContext(ProfilesContext)
  if (!ctx) throw new Error('useProfiles must be used within ProfilesProvider')
  return ctx
}

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { PlayerProfile, MapsByCategory } from '../types/profile'
import { playerNameToProfilePath } from '../lib/profileUrl'

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

function parseProfileJson(text: string): PlayerProfile {
  const data = JSON.parse(text) as { schemaVersion?: number; profile?: unknown }
  const profile = data?.profile
  if (!profile || typeof profile !== 'object') return {}
  return profile as PlayerProfile
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const profile = parseProfileJson(text)
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

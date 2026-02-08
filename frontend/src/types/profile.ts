/** One map row in a category table */
export interface ProfileMapRow {
  map: string
  points: number
  rankTime: number | null
  teamRankTime: number | null
  finishes: number
  firstFinish: string | null
}

/** One category (e.g. Novice, Brutal) for a player */
export interface ProfileCategory {
  totalMaps: number
  finished: number
  maps: ProfileMapRow[]
}

/** Full profile: category name -> category data */
export type PlayerProfile = Record<string, ProfileCategory>

/** One map entry in the global list (for unfinished computation) */
export interface MapInCategory {
  map: string
  points: number
}

/** All maps per category, keyed by category name. Loaded once from maps-by-category.json */
export type MapsByCategory = Record<string, MapInCategory[]>

export type ProfileMapSortKey = 'map' | 'points' | 'rankTime' | 'teamRankTime' | 'finishes' | 'firstFinish'

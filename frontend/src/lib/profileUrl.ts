/**
 * Must match backend generate_profiles.py _player_to_filename.
 * Produces the same URL-safe base64 path segment for a player name.
 */
export function playerNameToProfilePath(name: string): string {
  const bytes = new TextEncoder().encode(name)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

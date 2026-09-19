export interface SavedLocation {
  id: string
  name: string
  address: string
  timestamp: number
}

const STORAGE_KEY = "safepath_saved_locations"

// Popular San Francisco landmarks for quick access
export const SF_LANDMARKS: SavedLocation[] = [
  {
    id: 'landmark-1',
    name: 'Union Square',
    address: 'Union Square, San Francisco, CA 94108',
    timestamp: 0
  },
  {
    id: 'landmark-2',
    name: 'Fisherman\'s Wharf',
    address: 'Fisherman\'s Wharf, San Francisco, CA 94133',
    timestamp: 0
  },
  {
    id: 'landmark-3',
    name: 'Golden Gate Park',
    address: 'Golden Gate Park, San Francisco, CA 94122',
    timestamp: 0
  },
  {
    id: 'landmark-4',
    name: 'Ferry Building',
    address: 'Ferry Building Marketplace, San Francisco, CA 94111',
    timestamp: 0
  },
  {
    id: 'landmark-5',
    name: 'Coit Tower',
    address: 'Coit Tower, 1 Telegraph Hill Blvd, San Francisco, CA 94133',
    timestamp: 0
  }
]

/**
 * Get all saved locations from localStorage
 */
export function getSavedLocations(): SavedLocation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error("Error reading saved locations:", error)
    return []
  }
}

/**
 * Save a new location
 */
export function saveLocation(address: string, name?: string): SavedLocation {
  const locations = getSavedLocations()

  // Check if location already exists
  const existing = locations.find((loc) => loc.address.toLowerCase() === address.toLowerCase())
  if (existing) {
    return existing
  }

  const newLocation: SavedLocation = {
    id: Date.now().toString(),
    name: name || address,
    address: address,
    timestamp: Date.now(),
  }

  locations.unshift(newLocation) // Add to beginning

  // Keep only last 2 locations for cleaner UI
  const limitedLocations = locations.slice(0, 2)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedLocations))
  } catch (error) {
    console.error("Error saving location:", error)
  }

  return newLocation
}

/**
 * Delete a saved location
 */
export function deleteLocation(id: string): void {
  const locations = getSavedLocations()
  const filtered = locations.filter((loc) => loc.id !== id)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error("Error deleting location:", error)
  }
}

/**
 * Search saved locations by query
 */
export function searchLocations(query: string): SavedLocation[] {
  if (!query.trim()) return []

  const locations = getSavedLocations()
  const lowerQuery = query.toLowerCase()

  return locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(lowerQuery) || loc.address.toLowerCase().includes(lowerQuery)
  )
}
